-- Syllakids, deuxième migration :
-- 1. vérification des comptes enseignants (adresse académique ou domaine d'école reconnu, sinon validation par l'éditeur) ;
-- 2. avertissement par e-mail un mois avant la suppression pour inactivité ; fin de conservation des classes ;
-- 3. voix et lettres tracées partagées avec l'enseignant, selon les accords (dont l'accord papier saisi en classe).

-- ---------------------------------------------------------------------------
-- 1. Vérification des comptes enseignants
-- ---------------------------------------------------------------------------
alter table public.adultes
  add column verifie boolean not null default false,
  add column verifie_le timestamptz,
  add column avertissement_le timestamptz;

-- Domaines de messagerie d'écoles reconnus par l'éditeur (en plus des adresses académiques @ac-….fr).
create table public.domaines_ecoles (
  domaine text primary key check (domaine ~ '^[a-z0-9.-]+\.[a-z]{2,}$'),
  ajoute_le timestamptz not null default now()
);
alter table public.domaines_ecoles enable row level security;
revoke all on public.domaines_ecoles from anon, authenticated;
insert into public.domaines_ecoles (domaine) values ('education.gouv.fr');

create or replace function public._domaine_reconnu(p_email text)
returns boolean language sql stable security definer set search_path = '' as $$
  select lower(split_part(coalesce(p_email, ''), '@', 2)) ~ '^ac-[a-z-]+\.fr$'
      or exists (select 1 from public.domaines_ecoles d where d.domaine = lower(split_part(coalesce(p_email, ''), '@', 2)));
$$;

-- Adresse de l'utilisateur connecté, seulement si elle a été confirmée.
create or replace function public._email_confirme()
returns text language sql stable security definer set search_path = '' as $$
  select u.email from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null;
$$;

create or replace function public.creer_compte(p_role text, p_nom text)
returns public.adultes language plpgsql volatile security definer set search_path = '' as $$
declare
  a public.adultes;
  reconnu boolean := p_role = 'parent' or public._domaine_reconnu(public._email_confirme());
begin
  if auth.uid() is null then
    raise exception 'Connexion nécessaire' using errcode = '28000';
  end if;
  insert into public.adultes (id, role, nom, verifie, verifie_le)
  values (auth.uid(), p_role, btrim(coalesce(p_nom, '')), reconnu, case when reconnu then now() end)
  on conflict (id) do update set nom = excluded.nom, vu_le = now()
  returning * into a;
  return a;
end;
$$;

-- Renvoie le compte et note la visite ; un enseignant en attente est vérifié dès que son domaine est reconnu.
create or replace function public.mon_compte()
returns setof public.adultes language sql volatile security definer set search_path = '' as $$
  update public.adultes a set
    vu_le = now(),
    avertissement_le = null,
    verifie = a.verifie or public._domaine_reconnu(public._email_confirme()),
    verifie_le = case when not a.verifie and public._domaine_reconnu(public._email_confirme()) then now() else a.verifie_le end
  where a.id = auth.uid()
  returning *;
$$;

create or replace function public._exiger_enseignant()
returns public.adultes language plpgsql stable security definer set search_path = '' as $$
declare a public.adultes := public._moi();
begin
  if a.role <> 'enseignant' then
    raise exception 'Réservé aux enseignants' using errcode = '42501';
  end if;
  if not a.verifie then
    raise exception 'Compte enseignant en attente de vérification' using errcode = '42501';
  end if;
  return a;
end;
$$;

-- Outils de l'éditeur (éditeur SQL de Supabase uniquement, jamais depuis l'application).
create or replace function public.enseignants_en_attente()
returns table (email text, nom text, cree_le timestamptz)
language sql stable security definer set search_path = '' as $$
  select u.email, a.nom, a.cree_le from public.adultes a join auth.users u on u.id = a.id
  where a.role = 'enseignant' and not a.verifie order by a.cree_le;
$$;

create or replace function public.valider_enseignant(p_email text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  update public.adultes a set verifie = true, verifie_le = now()
  from auth.users u where u.id = a.id and lower(u.email) = lower(btrim(p_email)) and a.role = 'enseignant';
  return found;
end;
$$;

create or replace function public.ajouter_domaine_ecole(p_domaine text)
returns void language sql volatile security definer set search_path = '' as $$
  insert into public.domaines_ecoles (domaine) values (lower(btrim(p_domaine))) on conflict do nothing;
$$;

-- Comptes enseignants existants : vérifiés si leur adresse est déjà reconnue.
update public.adultes a set verifie = true, verifie_le = now()
from auth.users u where u.id = a.id and (a.role = 'parent' or public._domaine_reconnu(u.email));

-- ---------------------------------------------------------------------------
-- 2. Avertissement avant suppression, fin de conservation
-- ---------------------------------------------------------------------------
alter table public.enfants add column avertissement_le timestamptz;

-- Dernière activité d'un profil (progression écrite, sinon création).
create or replace function public._activite(p_enfant uuid)
returns timestamptz language sql stable security definer set search_path = '' as $$
  select coalesce((select p.maj_le from public.progressions p where p.enfant_id = e.id), e.cree_le)
  from public.enfants e where e.id = p_enfant;
$$;

-- Qui prévenir aujourd'hui : comptes sans visite depuis 11 mois, profils familiaux sans activité depuis 11 mois.
-- Appelé par la fonction Edge « prevenir-inactifs » avec la clé de service.
create or replace function public.a_prevenir()
returns table (adulte uuid, email text, raison text, enfant uuid, prenom text)
language sql stable security definer set search_path = '' as $$
  select a.id, u.email, 'compte', null::uuid, null::text
  from public.adultes a join auth.users u on u.id = a.id
  where a.vu_le < now() - interval '11 months' and a.avertissement_le is null
  union all
  select f.parent_id, u.email, 'profil', e.id, e.prenom
  from public.enfants e
  join public.familles f on f.enfant_id = e.id
  join auth.users u on u.id = f.parent_id
  where e.classe_id is null and e.avertissement_le is null
    and public._activite(e.id) < now() - interval '11 months';
$$;

create or replace function public.marquer_prevenus(p_adultes uuid[], p_enfants uuid[])
returns void language sql volatile security definer set search_path = '' as $$
  update public.adultes set avertissement_le = now() where id = any (coalesce(p_adultes, '{}'));
  update public.enfants set avertissement_le = now() where id = any (coalesce(p_enfants, '{}'));
$$;

-- Fin d'une année scolaire « 2026-2027 » : 31 août 2027 ; la classe est conservée jusqu'à la fin de l'année suivante.
create or replace function public.fin_conservation_classe(p_annee text)
returns date language sql immutable set search_path = '' as $$
  select make_date(split_part(p_annee, '-', 2)::int + 1, 8, 31);
$$;

-- Début de l'année scolaire en cours (1er septembre).
create or replace function public._debut_annee_scolaire()
returns timestamptz language sql stable set search_path = '' as $$
  select make_date(extract(year from now())::int - case when extract(month from now()) >= 9 then 0 else 1 end, 9, 1)::timestamptz;
$$;

-- ---------------------------------------------------------------------------
-- 3. Voix et lettres tracées
-- ---------------------------------------------------------------------------
alter table public.consentements
  alter column parent_id drop not null,
  add column source text not null default 'application' check (source in ('application', 'papier')),
  add column saisi_par uuid references public.adultes (id) on delete set null,
  add constraint consentement_auteur check (parent_id is not null or source = 'papier');

create table public.productions (
  id uuid primary key,
  enfant_id uuid not null references public.enfants (id) on delete cascade,
  type text not null check (type in ('voix', 'trace')),
  item text not null check (char_length(item) between 1 and 60),
  cree_le timestamptz not null,
  mime text check (mime ~ '^audio/[a-z0-9.+-]+'),
  audio bytea check (octet_length(audio) <= 262144),
  traits jsonb check (octet_length(traits::text) <= 65536),
  check ((type = 'voix' and audio is not null and mime is not null) or (type = 'trace' and traits is not null))
);
create index productions_enfant on public.productions (enfant_id, cree_le desc);
alter table public.productions enable row level security;
create policy "productions visibles" on public.productions for select using (public.peut_voir(enfant_id));
revoke all on public.productions from anon, authenticated;
grant select on public.productions to authenticated;

-- Accord en vigueur pour un enfant : le plus récent, qu'il vienne d'un parent (application) ou du papier saisi en classe.
create or replace function public._accord(p_enfant uuid)
returns public.consentements language sql stable security definer set search_path = '' as $$
  select * from public.consentements where enfant_id = p_enfant order by le desc, id desc limit 1;
$$;

-- Sans accord de partage en vigueur, plus rien n'est gardé sur le serveur.
create or replace function public._appliquer_accords(p_enfant uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not coalesce((public._accord(p_enfant)).voix_partage, false) then
    delete from public.productions where enfant_id = p_enfant;
  end if;
end;
$$;

-- Accords des profils présents sur l'appareil, pour savoir quoi conserver et quoi envoyer.
create or replace function public.accords_appareil(p_enfants uuid[])
returns table (enfant uuid, voix_appareil boolean, voix_partage boolean)
language sql stable security definer set search_path = '' as $$
  select e, coalesce((public._accord(e)).voix_appareil, false), coalesce((public._accord(e)).voix_partage, false)
  from unnest(coalesce(p_enfants, '{}')) as e
  where public.peut_voir(e);
$$;

-- En classe : l'enseignant saisit l'accord papier signé par la famille.
create or replace function public.accord_papier(p_enfant uuid, p_voix_appareil boolean, p_voix_partage boolean, p_tests boolean)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public._exiger_enseignant();
  if not public.est_enseignant(p_enfant) then
    raise exception 'Élève introuvable' using errcode = '42501';
  end if;
  insert into public.consentements (enfant_id, parent_id, source, saisi_par, version, utilisation, voix_appareil, voix_partage, tests_classe)
  values (p_enfant, null, 'papier', auth.uid(), 'papier', true, coalesce(p_voix_appareil, false),
          coalesce(p_voix_appareil, false) and coalesce(p_voix_partage, false), coalesce(p_tests, false));
  perform public._appliquer_accords(p_enfant);
  perform public._journal(p_enfant, 'saisie de l''accord papier');
end;
$$;

-- Dépôt d'un enregistrement (audio en base64) ou d'un tracé ; ignoré sans accord de partage. Renvoie vrai si gardé.
create or replace function public.deposer_production(p_id uuid, p_enfant uuid, p_type text, p_item text, p_cree_le timestamptz,
                                                     p_mime text, p_audio text, p_traits jsonb)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public._exiger_vue(p_enfant);
  if not coalesce((public._accord(p_enfant)).voix_partage, false) then
    return false;
  end if;
  if p_cree_le < public._debut_annee_scolaire() then
    return false;
  end if;
  insert into public.productions (id, enfant_id, type, item, cree_le, mime, audio, traits)
  values (p_id, p_enfant, p_type, p_item, least(p_cree_le, now()), p_mime,
          case when p_audio is null then null else decode(p_audio, 'base64') end, p_traits)
  on conflict (id) do nothing;
  return true;
end;
$$;

create or replace function public.productions_enfant(p_enfant uuid)
returns table (id uuid, type text, item text, cree_le timestamptz, traits jsonb)
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public._exiger_vue(p_enfant);
  perform public._journal(p_enfant, 'voix et lettres tracées');
  return query select p.id, p.type, p.item, p.cree_le, p.traits from public.productions p
    where p.enfant_id = p_enfant order by p.cree_le desc limit 200;
end;
$$;

create or replace function public.audio_production(p_id uuid)
returns table (mime text, audio text)
language plpgsql stable security definer set search_path = '' as $$
declare e uuid;
begin
  select enfant_id into e from public.productions where id = p_id;
  if e is null then
    raise exception 'Enregistrement introuvable' using errcode = 'P0002';
  end if;
  perform public._exiger_vue(e);
  return query select p.mime, encode(p.audio, 'base64') from public.productions p where p.id = p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Fonctions existantes mises à jour
-- ---------------------------------------------------------------------------
create or replace function public.donner_consentement(p_enfant uuid, p_consentement jsonb)
returns text language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public._exiger_parent();
  if not public.est_parent(p_enfant) then
    raise exception 'Profil introuvable' using errcode = '42501';
  end if;
  if coalesce((p_consentement ->> 'utilisation')::boolean, false) then
    perform public._consentement(p_enfant, p_consentement);
    perform public._appliquer_accords(p_enfant);
    return 'enregistre';
  end if;
  delete from public.consentements where enfant_id = p_enfant and parent_id = auth.uid();
  delete from public.familles where enfant_id = p_enfant and parent_id = auth.uid();
  if public._nettoyer(p_enfant) then
    return 'supprime';
  end if;
  perform public._appliquer_accords(p_enfant);
  return 'detache';
end;
$$;

create or replace function public.mes_enfants()
returns table (id uuid, prenom text, avatar text, profil text, dys boolean, classe text, consentement jsonb,
               donnees jsonb, version integer, maj_le timestamptz)
language sql stable security definer set search_path = '' as $$
  select e.id, e.prenom, e.avatar, e.profil, e.dys, c.nom,
    (select to_jsonb(k) - 'id' - 'enfant_id' - 'parent_id' - 'saisi_par' from public.consentements k
      where k.enfant_id = e.id and k.parent_id = auth.uid() order by k.le desc limit 1),
    p.donnees, coalesce(p.version, 0), p.maj_le
  from public.familles f
  join public.enfants e on e.id = f.enfant_id
  left join public.classes c on c.id = e.classe_id
  left join public.progressions p on p.enfant_id = e.id
  where f.parent_id = auth.uid()
  order by e.prenom;
$$;

drop function public.tableau_classe(uuid);
create function public.tableau_classe(p_classe uuid)
returns table (id uuid, prenom text, avatar text, profil text, dys boolean, code_famille text, code_images text,
               famille boolean, voix_appareil boolean, voix_partage boolean, accord_source text,
               donnees jsonb, version integer, maj_le timestamptz)
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public._exiger_classe(p_classe);
  insert into public.journal_acces (adulte_id, enfant_id, action)
    select auth.uid(), e.id, 'tableau de classe' from public.enfants e where e.classe_id = p_classe;
  return query
    select e.id, e.prenom, e.avatar, e.profil, e.dys, e.code_famille, e.code_images,
      exists (select 1 from public.familles f where f.enfant_id = e.id),
      coalesce((public._accord(e.id)).voix_appareil, false),
      coalesce((public._accord(e.id)).voix_partage, false),
      (public._accord(e.id)).source,
      p.donnees, coalesce(p.version, 0), p.maj_le
    from public.enfants e left join public.progressions p on p.enfant_id = e.id
    where e.classe_id = p_classe
    order by e.prenom;
end;
$$;

drop function public.mes_classes();
create function public.mes_classes()
returns table (id uuid, nom text, annee text, code text, nb_eleves integer, conservee_jusquau date)
language sql stable security definer set search_path = '' as $$
  select c.id, c.nom, c.annee, c.code, (select count(*)::integer from public.enfants e where e.classe_id = c.id),
    public.fin_conservation_classe(c.annee)
  from public.classes c where c.enseignant_id = auth.uid()
  order by c.annee desc, c.nom;
$$;

-- Une écriture de progression est une activité : l'avertissement éventuel est levé.
create or replace function public.ecrire_progression(p_enfant uuid, p_donnees jsonb, p_version integer)
returns table (ok boolean, version integer, donnees jsonb)
language plpgsql volatile security definer set search_path = '' as $$
declare p public.progressions;
begin
  perform public._exiger_vue(p_enfant);
  if jsonb_typeof(p_donnees) is distinct from 'object' then
    raise exception 'Progression invalide' using errcode = '22023';
  end if;
  update public.enfants set avertissement_le = null where id = p_enfant and avertissement_le is not null;
  select * into p from public.progressions where enfant_id = p_enfant for update;
  if not found then
    if p_version <> 0 then
      return query select false, 0, null::jsonb;
      return;
    end if;
    insert into public.progressions (enfant_id, donnees) values (p_enfant, p_donnees) returning * into p;
    return query select true, p.version, null::jsonb;
    return;
  end if;
  if p.version <> p_version then
    return query select false, p.version, p.donnees;
    return;
  end if;
  update public.progressions set donnees = p_donnees, version = p.version + 1, maj_le = now()
  where enfant_id = p_enfant returning * into p;
  return query select true, p.version, null::jsonb;
end;
$$;

create or replace function public.exporter_enfant(p_enfant uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare r jsonb;
begin
  perform public._exiger_vue(p_enfant);
  perform public._journal(p_enfant, 'export des données');
  select jsonb_build_object(
    'export', now(),
    'profil', (select to_jsonb(e) - 'code_famille' - 'avertissement_le' from public.enfants e where e.id = p_enfant),
    'classe', (select c.nom from public.enfants e join public.classes c on c.id = e.classe_id where e.id = p_enfant),
    'accords', coalesce((select jsonb_agg(to_jsonb(k) - 'parent_id' - 'saisi_par' order by k.le) from public.consentements k
                         where k.enfant_id = p_enfant and (k.parent_id = auth.uid() or k.source = 'papier' or public.est_enseignant(p_enfant))), '[]'),
    'progression', (select to_jsonb(p) - 'enfant_id' from public.progressions p where p.enfant_id = p_enfant),
    'voix_et_traces', coalesce((select jsonb_agg(jsonb_build_object('type', x.type, 'item', x.item, 'le', x.cree_le, 'traits', x.traits,
                                  'audio', case when x.audio is null then null else encode(x.audio, 'base64') end, 'mime', x.mime) order by x.cree_le)
                                from public.productions x where x.enfant_id = p_enfant), '[]'),
    'journal', coalesce((select jsonb_agg(jsonb_build_object('le', j.le, 'action', j.action) order by j.le)
                         from public.journal_acces j where j.enfant_id = p_enfant), '[]')
  ) into r;
  return r;
end;
$$;

-- Purge nocturne : rien n'est supprimé pour inactivité sans avertissement envoyé au moins 30 jours avant.
create or replace function public.purger_donnees()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  journaux integer; comptes integer; classes integer; voix integer; profils integer := 0;
  e uuid;
begin
  delete from public.journal_acces where le < now() - interval '6 months';
  get diagnostics journaux = row_count;
  -- comptes prévenus il y a plus de 30 jours et revenus depuis : non ; sinon supprimés
  delete from auth.users u using public.adultes a
  where a.id = u.id and a.avertissement_le <= now() - interval '30 days' and a.vu_le < a.avertissement_le;
  get diagnostics comptes = row_count;
  -- classes : conservées jusqu'à la fin de l'année scolaire suivante (élèves sans famille supprimés avec elles)
  delete from public.enfants en using public.classes c
  where en.classe_id = c.id and current_date > public.fin_conservation_classe(c.annee)
    and not exists (select 1 from public.familles f where f.enfant_id = en.id);
  delete from public.classes c where current_date > public.fin_conservation_classe(c.annee);
  get diagnostics classes = row_count;
  -- voix et tracés partagés : jusqu'à la fin de l'année scolaire
  delete from public.productions where cree_le < public._debut_annee_scolaire();
  get diagnostics voix = row_count;
  -- profils rattachés à personne ; profils familiaux prévenus et toujours inactifs
  for e in select en.id from public.enfants en
           where en.classe_id is null
             and (not exists (select 1 from public.familles f where f.enfant_id = en.id)
                  or (en.avertissement_le <= now() - interval '30 days' and public._activite(en.id) < en.avertissement_le)) loop
    delete from public.enfants where id = e;
    profils := profils + 1;
  end loop;
  return jsonb_build_object('journaux', journaux, 'comptes', comptes, 'classes', classes, 'voix_et_traces', voix, 'profils', profils);
end;
$$;

-- ---------------------------------------------------------------------------
-- Droits d'exécution (Supabase accorde tout par défaut : on retire, puis on accorde la liste)
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.creer_compte(text, text), public.mon_compte(), public.supprimer_mon_compte(),
  public.creer_classe(text, text), public.mes_classes(), public.nouveau_code_classe(uuid), public.supprimer_classe(uuid),
  public.creer_eleve(uuid, text, text, text, uuid), public.nouveau_code_famille(uuid), public.nouveau_code_images(uuid, text),
  public.retirer_eleve(uuid), public.tableau_classe(uuid), public.accord_papier(uuid, boolean, boolean, boolean),
  public.creer_enfant(uuid, text, text, text, boolean, jsonb), public.rattacher_par_code(text, jsonb),
  public.rejoindre_classe(uuid, text), public.mes_enfants(), public.donner_consentement(uuid, jsonb),
  public.modifier_enfant(uuid, text, text, text, boolean), public.lire_progression(uuid),
  public.ecrire_progression(uuid, jsonb, integer), public.exporter_enfant(uuid), public.journal_enfant(uuid),
  public.accords_appareil(uuid[]), public.deposer_production(uuid, uuid, text, text, timestamptz, text, text, jsonb),
  public.productions_enfant(uuid), public.audio_production(uuid), public.fin_conservation_classe(text),
  public.est_parent(uuid), public.est_enseignant(uuid), public.peut_voir(uuid)
to authenticated;
-- La fonction Edge d'avertissement utilise la clé de service.
grant execute on function public.a_prevenir(), public.marquer_prevenus(uuid[], uuid[]) to service_role;
