-- Équivalent minimal de ce que Supabase fournit (schéma auth, rôles), pour tester la migration
-- sur un Postgres local (PGlite) : tests automatiques et mode démonstration hors ligne.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  -- empreinte du mot de passe (mode démonstration local uniquement ; Supabase gère cela lui-même)
  empreinte text not null,
  cree_le timestamptz not null default now()
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

-- Comme sur Supabase : droits par défaut accordés aux rôles de l'API sur tout ce qui est créé dans public.
-- La migration doit donc retirer explicitement ce qui ne doit pas être accessible.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
