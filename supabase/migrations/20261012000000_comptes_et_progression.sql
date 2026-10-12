-- Syllakids : comptes adultes, profils d'enfants, consentement parental, progression synchronisée.
--
-- Principes (cahier des charges § 11 et 13, documents RGPD) :
-- * l'enfant n'a pas de compte : il n'existe qu'à travers un profil (prénom ou surnom, avatar, profil 5/6 ans) ;
-- * un parent ne voit que ses enfants, un enseignant que les élèves de ses classes ;
-- * toutes les écritures passent par les fonctions ci-dessous (droits vérifiés, journal des accès) ;
--   les tables ne sont lisibles qu'à travers des règles par ligne ;
-- * la voix et les tracés ne sont pas stockés ici (ils restent sur l'appareil).

-- ---------------------------------------------------------------------------
-- Codes lisibles (sans 0/O, 1/I/L) tirés d'un générateur cryptographique
-- ---------------------------------------------------------------------------
create or replace function public.nouveau_code(n integer)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  octets bytea := uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid());
  resultat text := '';
begin
  for i in 0 .. n - 1 loop
    resultat := resultat || substr(alphabet, (get_byte(octets, i) % length(alphabet)) + 1, 1);
  end loop;
  return resultat;
end;
$$;

-- Trois images secrètes différentes parmi les neuf (indices 0 à 8), par exemple « 2-7-4 ».
create or replace function public.nouvelles_images()
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(x::text, '-') from (select x from generate_series(0, 8) x order by random() limit 3) s;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.adultes (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('parent', 'enseignant')),
  nom text not null default '' check (char_length(nom) <= 60),
  cree_le timestamptz not null default now(),
  vu_le timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  enseignant_id uuid not null references public.adultes (id) on delete cascade,
  nom text not null check (char_length(btrim(nom)) between 1 and 60),
  annee text not null check (annee ~ '^\d{4}-\d{4}$'),
  code text not null unique default public.nouveau_code(6),
  cree_le timestamptz not null default now()
);

create table public.enfants (
  id uuid primary key default gen_random_uuid(),
  prenom text not null check (char_length(btrim(prenom)) between 1 and 30),
  -- image de l'enfant (soleil, chat…), avec une variante de couleur facultative (chat-2) pour distinguer 36 élèves
  avatar text not null check (avatar ~ '^[a-z]{2,20}(-[23])?$'),
  profil text not null default '6ans' check (profil in ('5ans', '6ans')),
  dys boolean not null default false,
  classe_id uuid references public.classes (id) on delete set null,
  -- code remis à la famille par l'enseignant pour retrouver le même profil à la maison
  code_famille text unique,
  -- « images secrètes » de l'enfant sur la tablette de la classe (3 images parmi 9)
  code_images text check (code_images ~ '^[0-8]-[0-8]-[0-8]$'),
  cree_le timestamptz not null default now()
);
create index enfants_classe on public.enfants (classe_id);

create table public.familles (
  parent_id uuid not null references public.adultes (id) on delete cascade,
  enfant_id uuid not null references public.enfants (id) on delete cascade,
  lie_le timestamptz not null default now(),
  primary key (parent_id, enfant_id)
);
create index familles_enfant on public.familles (enfant_id);

-- Chaque accord est une ligne ; la plus récente fait foi (historique conservé tant que le lien existe).
create table public.consentements (
  id bigint generated always as identity primary key,
  enfant_id uuid not null references public.enfants (id) on delete cascade,
  parent_id uuid not null references public.adultes (id) on delete cascade,
  version text not null check (char_length(version) between 1 and 20),
  utilisation boolean not null,
  voix_appareil boolean not null,
  voix_partage boolean not null,
  tests_classe boolean not null,
  le timestamptz not null default now(),
  check (not voix_partage or voix_appareil)
);
create index consentements_enfant on public.consentements (enfant_id, le desc);

create table public.progressions (
  enfant_id uuid primary key references public.enfants (id) on delete cascade,
  donnees jsonb not null check (octet_length(donnees::text) < 524288),
  version integer not null default 1,
  maj_le timestamptz not null default now()
);

create table public.journal_acces (
  id bigint generated always as identity primary key,
  adulte_id uuid references public.adultes (id) on delete set null,
  enfant_id uuid not null references public.enfants (id) on delete cascade,
  action text not null,
  le timestamptz not null default now()
);
create index journal_enfant on public.journal_acces (enfant_id, le desc);

-- ---------------------------------------------------------------------------
-- Qui peut voir quoi
-- ---------------------------------------------------------------------------
create or replace function public.est_parent(e uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.familles f where f.enfant_id = e and f.parent_id = auth.uid());
$$;

create or replace function public.est_enseignant(e uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.enfants en join public.classes c on c.id = en.classe_id
    where en.id = e and c.enseignant_id = auth.uid()
  );
$$;

create or replace function public.peut_voir(e uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.est_parent(e) or public.est_enseignant(e);
$$;

alter table public.adultes enable row level security;
alter table public.classes enable row level security;
alter table public.enfants enable row level security;
alter table public.familles enable row level security;
alter table public.consentements enable row level security;
alter table public.progressions enable row level security;
alter table public.journal_acces enable row level security;

create policy "son compte" on public.adultes for select using (id = auth.uid());
create policy "ses classes" on public.classes for select using (enseignant_id = auth.uid());
create policy "ses enfants ou élèves" on public.enfants for select using (public.peut_voir(id));
create policy "ses liens" on public.familles for select using (parent_id = auth.uid());
create policy "accords visibles" on public.consentements for select
  using (parent_id = auth.uid() or public.est_enseignant(enfant_id));
create policy "progression visible" on public.progressions for select using (public.peut_voir(enfant_id));
create policy "journal visible par les parents" on public.journal_acces for select using (public.est_parent(enfant_id));

-- Lecture seule pour les comptes connectés ; aucune écriture directe.
revoke all on public.adultes, public.classes, public.enfants, public.familles,
  public.consentements, public.progressions, public.journal_acces from anon, authenticated;
grant select on public.adultes, public.classes, public.enfants, public.familles,
  public.consentements, public.progressions, public.journal_acces to authenticated;

-- ---------------------------------------------------------------------------
-- Outils internes
-- ---------------------------------------------------------------------------
create or replace function public._moi()
returns public.adultes language plpgsql stable security definer set search_path = '' as $$
declare a public.adultes;
begin
  if auth.uid() is null then
    raise exception 'Connexion nécessaire' using errcode = '28000';
  end if;
  select * into a from public.adultes where id = auth.uid();
  if not found then
    raise exception 'Compte à compléter' using errcode = 'P0002';
  end if;
  return a;
end;
$$;

create or replace function public._exiger_enseignant()
returns public.adultes language plpgsql stable security definer set search_path = '' as $$
declare a public.adultes := public._moi();
begin
  if a.role <> 'enseignant' then
    raise exception 'Réservé aux enseignants' using errcode = '42501';
  end if;
  return a;
end;
$$;

create or replace function public._exiger_classe(p_classe uuid)
returns public.classes language plpgsql stable security definer set search_path = '' as $$
declare c public.classes;
begin
  perform public._exiger_enseignant();
  select * into c from public.classes where id = p_classe and enseignant_id = auth.uid();
  if not found then
    raise exception 'Classe introuvable' using errcode = '42501';
  end if;
  return c;
end;
$$;

create or replace function public._exiger_vue(p_enfant uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  perform public._moi();
  if not public.peut_voir(p_enfant) then
    raise exception 'Profil introuvable' using errcode = '42501';
  end if;
end;
$$;

create or replace function public._journal(p_enfant uuid, p_action text)
returns void language sql volatile security definer set search_path = '' as $$
  insert into public.journal_acces (adulte_id, enfant_id, action) values (auth.uid(), p_enfant, p_action);
$$;

-- Enregistre un accord parental ; l'utilisation doit être acceptée.
create or replace function public._consentement(p_enfant uuid, c jsonb)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if jsonb_typeof(c -> 'utilisation') is distinct from 'boolean'
     or jsonb_typeof(c -> 'voix_appareil') is distinct from 'boolean'
     or jsonb_typeof(c -> 'voix_partage') is distinct from 'boolean'
     or jsonb_typeof(c -> 'tests_classe') is distinct from 'boolean'
     or jsonb_typeof(c -> 'version') is distinct from 'string' then
    raise exception 'Accord incomplet' using errcode = '22023';
  end if;
  if not (c ->> 'utilisation')::boolean then
    raise exception 'L''utilisation doit être acceptée' using errcode = '22023';
  end if;
  insert into public.consentements (enfant_id, parent_id, version, utilisation, voix_appareil, voix_partage, tests_classe)
  values (p_enfant, auth.uid(), c ->> 'version', true, (c ->> 'voix_appareil')::boolean,
          (c ->> 'voix_partage')::boolean, (c ->> 'tests_classe')::boolean);
end;
$$;

-- Supprime un profil qui n'est plus rattaché à personne.
create or replace function public._nettoyer(p_enfant uuid)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  delete from public.enfants e
  where e.id = p_enfant and e.classe_id is null
    and not exists (select 1 from public.familles f where f.enfant_id = e.id);
  return found;
end;
$$;

-- ---------------------------------------------------------------------------
-- Comptes
-- ---------------------------------------------------------------------------
create or replace function public.creer_compte(p_role text, p_nom text)
returns public.adultes language plpgsql volatile security definer set search_path = '' as $$
declare a public.adultes;
begin
  if auth.uid() is null then
    raise exception 'Connexion nécessaire' using errcode = '28000';
  end if;
  insert into public.adultes (id, role, nom) values (auth.uid(), p_role, btrim(coalesce(p_nom, '')))
  on conflict (id) do update set nom = excluded.nom, vu_le = now()
  returning * into a;
  return a;
end;
$$;

-- Renvoie le compte (ou rien s'il reste à compléter) et note la dernière visite (durée de conservation).
create or replace function public.mon_compte()
returns setof public.adultes language sql volatile security definer set search_path = '' as $$
  update public.adultes set vu_le = now() where id = auth.uid() returning *;
$$;

-- Supprime le compte de l'adulte et les profils qui ne sont plus rattachés à personne.
create or replace function public.supprimer_mon_compte()
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  a public.adultes := public._moi();
  e uuid;
  orphelins uuid[];
begin
  select coalesce(array_agg(distinct x.id), '{}') into orphelins from (
    select f.enfant_id as id from public.familles f where f.parent_id = a.id
    union
    select en.id from public.enfants en join public.classes c on c.id = en.classe_id where c.enseignant_id = a.id
  ) x;
  delete from public.adultes where id = a.id;
  foreach e in array orphelins loop
    perform public._nettoyer(e);
  end loop;
  delete from auth.users where id = a.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Enseignant : classes et élèves
-- ---------------------------------------------------------------------------
create or replace function public.creer_classe(p_nom text, p_annee text)
returns public.classes language plpgsql volatile security definer set search_path = '' as $$
declare c public.classes;
begin
  perform public._exiger_enseignant();
  insert into public.classes (enseignant_id, nom, annee) values (auth.uid(), btrim(p_nom), p_annee) returning * into c;
  return c;
end;
$$;

create or replace function public.mes_classes()
returns table (id uuid, nom text, annee text, code text, nb_eleves integer)
language sql stable security definer set search_path = '' as $$
  select c.id, c.nom, c.annee, c.code, (select count(*)::integer from public.enfants e where e.classe_id = c.id)
  from public.classes c where c.enseignant_id = auth.uid()
  order by c.annee desc, c.nom;
$$;

create or replace function public.nouveau_code_classe(p_classe uuid)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare r text;
begin
  perform public._exiger_classe(p_classe);
  update public.classes set code = public.nouveau_code(6) where id = p_classe returning code into r;
  return r;
end;
$$;

-- Supprime la classe : les élèves sans famille rattachée sont supprimés, les autres restent aux familles.
create or replace function public.supprimer_classe(p_classe uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public._exiger_classe(p_classe);
  delete from public.enfants e where e.classe_id = p_classe
    and not exists (select 1 from public.familles f where f.enfant_id = e.id);
  delete from public.classes where id = p_classe;
end;
$$;

create or replace function public.creer_eleve(p_classe uuid, p_prenom text, p_avatar text, p_profil text, p_id uuid default null)
returns public.enfants language plpgsql volatile security definer set search_path = '' as $$
declare e public.enfants;
begin
  perform public._exiger_classe(p_classe);
  insert into public.enfants (id, prenom, avatar, profil, classe_id, code_famille, code_images)
  values (coalesce(p_id, gen_random_uuid()), btrim(p_prenom), p_avatar, p_profil, p_classe, public.nouveau_code(8),
          public.nouvelles_images())
  returning * into e;
  return e;
end;
$$;

create or replace function public.nouveau_code_famille(p_enfant uuid)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare r text;
begin
  perform public._exiger_enseignant();
  if not public.est_enseignant(p_enfant) then
    raise exception 'Élève introuvable' using errcode = '42501';
  end if;
  update public.enfants set code_famille = public.nouveau_code(8) where id = p_enfant returning code_famille into r;
  return r;
end;
$$;

create or replace function public.nouveau_code_images(p_enfant uuid, p_code text)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public._exiger_enseignant();
  if not public.est_enseignant(p_enfant) then
    raise exception 'Élève introuvable' using errcode = '42501';
  end if;
  update public.enfants set code_images = p_code where id = p_enfant;
end;
$$;

-- Retire un élève de la classe : supprimé s'il n'a pas de famille rattachée, sinon rendu à la famille.
create or replace function public.retirer_eleve(p_enfant uuid)
returns text language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public._exiger_enseignant();
  if not public.est_enseignant(p_enfant) then
    raise exception 'Élève introuvable' using errcode = '42501';
  end if;
  update public.enfants set classe_id = null, code_famille = null, code_images = null where id = p_enfant;
  return case when public._nettoyer(p_enfant) then 'supprime' else 'rendu' end;
end;
$$;

-- Tableau de bord : un élève par ligne, avec sa progression. Chaque consultation est journalisée.
create or replace function public.tableau_classe(p_classe uuid)
returns table (id uuid, prenom text, avatar text, profil text, dys boolean, code_famille text, code_images text,
               famille boolean, voix_partage boolean, donnees jsonb, version integer, maj_le timestamptz)
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public._exiger_classe(p_classe);
  insert into public.journal_acces (adulte_id, enfant_id, action)
    select auth.uid(), e.id, 'tableau de classe' from public.enfants e where e.classe_id = p_classe;
  return query
    select e.id, e.prenom, e.avatar, e.profil, e.dys, e.code_famille, e.code_images,
      exists (select 1 from public.familles f where f.enfant_id = e.id),
      coalesce((select c.voix_partage from public.consentements c where c.enfant_id = e.id order by c.le desc limit 1), false),
      p.donnees, coalesce(p.version, 0), p.maj_le
    from public.enfants e left join public.progressions p on p.enfant_id = e.id
    where e.classe_id = p_classe
    order by e.prenom;
end;
$$;

-- ---------------------------------------------------------------------------
-- Parent : profils, rattachement, accords
-- ---------------------------------------------------------------------------
create or replace function public._exiger_parent()
returns public.adultes language plpgsql stable security definer set search_path = '' as $$
declare a public.adultes := public._moi();
begin
  if a.role <> 'parent' then
    raise exception 'Réservé aux parents' using errcode = '42501';
  end if;
  return a;
end;
$$;

create or replace function public.creer_enfant(p_id uuid, p_prenom text, p_avatar text, p_profil text, p_dys boolean, p_consentement jsonb)
returns public.enfants language plpgsql volatile security definer set search_path = '' as $$
declare e public.enfants;
begin
  perform public._exiger_parent();
  insert into public.enfants (id, prenom, avatar, profil, dys)
  values (coalesce(p_id, gen_random_uuid()), btrim(p_prenom), p_avatar, p_profil, coalesce(p_dys, false))
  returning * into e;
  insert into public.familles (parent_id, enfant_id) values (auth.uid(), e.id);
  perform public._consentement(e.id, p_consentement);
  return e;
end;
$$;

-- Le parent saisit le code remis par l'enseignant : il retrouve le profil de classe de son enfant.
create or replace function public.rattacher_par_code(p_code text, p_consentement jsonb)
returns public.enfants language plpgsql volatile security definer set search_path = '' as $$
declare e public.enfants;
begin
  perform public._exiger_parent();
  select * into e from public.enfants
  where code_famille = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if not found then
    raise exception 'Code inconnu' using errcode = 'P0002';
  end if;
  insert into public.familles (parent_id, enfant_id) values (auth.uid(), e.id) on conflict do nothing;
  perform public._consentement(e.id, p_consentement);
  perform public._journal(e.id, 'rattachement de la famille');
  return e;
end;
$$;

-- Le parent rattache le profil créé à la maison à la classe de son enfant.
create or replace function public.rejoindre_classe(p_enfant uuid, p_code_classe text)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare c public.classes;
begin
  perform public._exiger_parent();
  if not public.est_parent(p_enfant) then
    raise exception 'Profil introuvable' using errcode = '42501';
  end if;
  select * into c from public.classes where code = upper(regexp_replace(coalesce(p_code_classe, ''), '[^A-Za-z0-9]', '', 'g'));
  if not found then
    raise exception 'Code de classe inconnu' using errcode = 'P0002';
  end if;
  update public.enfants set classe_id = c.id,
    code_images = coalesce(code_images, public.nouvelles_images())
  where id = p_enfant;
  perform public._journal(p_enfant, 'rattachement à une classe');
  return c.nom;
end;
$$;

create or replace function public.mes_enfants()
returns table (id uuid, prenom text, avatar text, profil text, dys boolean, classe text, consentement jsonb,
               donnees jsonb, version integer, maj_le timestamptz)
language sql stable security definer set search_path = '' as $$
  select e.id, e.prenom, e.avatar, e.profil, e.dys, c.nom,
    (select to_jsonb(k) - 'id' - 'enfant_id' - 'parent_id' from public.consentements k
      where k.enfant_id = e.id and k.parent_id = auth.uid() order by k.le desc limit 1),
    p.donnees, coalesce(p.version, 0), p.maj_le
  from public.familles f
  join public.enfants e on e.id = f.enfant_id
  left join public.classes c on c.id = e.classe_id
  left join public.progressions p on p.enfant_id = e.id
  where f.parent_id = auth.uid()
  order by e.prenom;
$$;

-- Nouvel accord. Le retrait de l'utilisation détache le parent du profil et supprime ce profil
-- s'il n'est plus rattaché à personne (en classe, l'école reste responsable du profil scolaire).
create or replace function public.donner_consentement(p_enfant uuid, p_consentement jsonb)
returns text language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public._exiger_parent();
  if not public.est_parent(p_enfant) then
    raise exception 'Profil introuvable' using errcode = '42501';
  end if;
  if coalesce((p_consentement ->> 'utilisation')::boolean, false) then
    perform public._consentement(p_enfant, p_consentement);
    return 'enregistre';
  end if;
  delete from public.consentements where enfant_id = p_enfant and parent_id = auth.uid();
  delete from public.familles where enfant_id = p_enfant and parent_id = auth.uid();
  return case when public._nettoyer(p_enfant) then 'supprime' else 'detache' end;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profil, progression, export
-- ---------------------------------------------------------------------------
create or replace function public.modifier_enfant(p_enfant uuid, p_prenom text, p_avatar text, p_profil text, p_dys boolean)
returns public.enfants language plpgsql volatile security definer set search_path = '' as $$
declare e public.enfants;
begin
  perform public._exiger_vue(p_enfant);
  update public.enfants set prenom = btrim(p_prenom), avatar = p_avatar, profil = p_profil, dys = p_dys
  where id = p_enfant returning * into e;
  return e;
end;
$$;

create or replace function public.lire_progression(p_enfant uuid)
returns table (donnees jsonb, version integer, maj_le timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public._exiger_vue(p_enfant);
  return query select p.donnees, p.version, p.maj_le from public.progressions p where p.enfant_id = p_enfant;
end;
$$;

-- Écriture optimiste : acceptée seulement si l'appareil connaissait la dernière version
-- (sinon il reçoit la version du serveur, fusionne et recommence).
create or replace function public.ecrire_progression(p_enfant uuid, p_donnees jsonb, p_version integer)
returns table (ok boolean, version integer, donnees jsonb)
language plpgsql volatile security definer set search_path = '' as $$
declare p public.progressions;
begin
  perform public._exiger_vue(p_enfant);
  if jsonb_typeof(p_donnees) is distinct from 'object' then
    raise exception 'Progression invalide' using errcode = '22023';
  end if;
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
    'profil', (select to_jsonb(e) - 'code_famille' from public.enfants e where e.id = p_enfant),
    'classe', (select c.nom from public.enfants e join public.classes c on c.id = e.classe_id where e.id = p_enfant),
    'accords', coalesce((select jsonb_agg(to_jsonb(k) - 'parent_id' order by k.le) from public.consentements k
                         where k.enfant_id = p_enfant and (k.parent_id = auth.uid() or public.est_enseignant(p_enfant))), '[]'),
    'progression', (select to_jsonb(p) - 'enfant_id' from public.progressions p where p.enfant_id = p_enfant),
    'journal', coalesce((select jsonb_agg(jsonb_build_object('le', j.le, 'action', j.action) order by j.le)
                         from public.journal_acces j where j.enfant_id = p_enfant), '[]')
  ) into r;
  return r;
end;
$$;

-- Pour le parent : qui a consulté les données de son enfant.
create or replace function public.journal_enfant(p_enfant uuid)
returns table (le timestamptz, action text, qui text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public._exiger_parent();
  if not public.est_parent(p_enfant) then
    raise exception 'Profil introuvable' using errcode = '42501';
  end if;
  return query
    select j.le, j.action,
      case when a.id = auth.uid() then 'vous' when a.role = 'enseignant' then 'enseignant(e) ' || a.nom
           when a.id is null then 'compte supprimé' else 'autre parent ' || a.nom end
    from public.journal_acces j left join public.adultes a on a.id = j.adulte_id
    where j.enfant_id = p_enfant order by j.le desc limit 200;
end;
$$;

-- ---------------------------------------------------------------------------
-- Durées de conservation (à lancer chaque nuit, par exemple avec pg_cron)
-- ---------------------------------------------------------------------------
create or replace function public.purger_donnees()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  journaux integer; comptes integer; profils integer := 0;
  e uuid;
begin
  delete from public.journal_acces where le < now() - interval '6 months';
  get diagnostics journaux = row_count;
  -- comptes inactifs depuis 12 mois (l'e-mail d'avertissement est envoyé avant, hors base)
  delete from auth.users u using public.adultes a where a.id = u.id and a.vu_le < now() - interval '12 months';
  get diagnostics comptes = row_count;
  -- profils sans adulte rattaché, ou sans activité depuis 12 mois hors classe
  for e in select en.id from public.enfants en left join public.progressions p on p.enfant_id = en.id
           where en.classe_id is null
             and (not exists (select 1 from public.familles f where f.enfant_id = en.id)
                  or coalesce(p.maj_le, en.cree_le) < now() - interval '12 months') loop
    delete from public.enfants where id = e;
    profils := profils + 1;
  end loop;
  return jsonb_build_object('journaux', journaux, 'comptes', comptes, 'profils', profils);
end;
$$;

-- ---------------------------------------------------------------------------
-- Droits d'exécution
-- ---------------------------------------------------------------------------
-- Supabase accorde par défaut l'exécution de toute nouvelle fonction aux rôles anon et authenticated :
-- on retire tout, puis on n'accorde que les fonctions prévues pour l'application.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.creer_compte(text, text), public.mon_compte(), public.supprimer_mon_compte(),
  public.creer_classe(text, text), public.mes_classes(), public.nouveau_code_classe(uuid), public.supprimer_classe(uuid),
  public.creer_eleve(uuid, text, text, text, uuid), public.nouveau_code_famille(uuid), public.nouveau_code_images(uuid, text),
  public.retirer_eleve(uuid), public.tableau_classe(uuid),
  public.creer_enfant(uuid, text, text, text, boolean, jsonb), public.rattacher_par_code(text, jsonb),
  public.rejoindre_classe(uuid, text), public.mes_enfants(), public.donner_consentement(uuid, jsonb),
  public.modifier_enfant(uuid, text, text, text, boolean), public.lire_progression(uuid),
  public.ecrire_progression(uuid, jsonb, integer), public.exporter_enfant(uuid), public.journal_enfant(uuid),
  public.est_parent(uuid), public.est_enseignant(uuid), public.peut_voir(uuid)
to authenticated;
