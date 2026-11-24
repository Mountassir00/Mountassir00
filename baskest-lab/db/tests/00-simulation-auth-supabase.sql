-- =============================================================================
-- SIMULATION LOCALE MINIMALE DE SUPABASE — POUR LES TESTS UNIQUEMENT
--
-- Ce fichier N'EST PAS Supabase. Il imite seulement ce dont les migrations ont besoin :
--   - les rôles anon, authenticated, service_role (service_role contourne RLS) ;
--   - un schéma auth avec une table auth.users réduite (id, email) ;
--   - auth.uid() et auth.jwt(), lus depuis le réglage request.jwt.claims, comme le fait
--     PostgREST (le serveur d'API de Supabase) à chaque requête ;
--   - les privilèges par défaut « larges » qu'un projet Supabase accorde sur le schéma
--     public (les migrations doivent donc les retirer explicitement).
-- Ce qui n'est PAS simulé : GoTrue (inscription, lien e-mail, mots de passe, jetons),
-- PostgREST (HTTP, codes d'erreur), la propriété réelle du schéma auth, les extensions,
-- les réglages du projet. Tout cela reste à vérifier sur un vrai projet
-- (event-lab/docs/14-socle-saas.md §9).
-- =============================================================================

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz not null default now()
);

create function auth.uid() returns uuid
language sql stable as $$
  select nullif(coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  ), '')::uuid
$$;

create function auth.jwt() returns jsonb
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

grant execute on function auth.uid(), auth.jwt() to anon, authenticated, service_role;

-- Privilèges par défaut du schéma public, comme sur un projet Supabase classique
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
