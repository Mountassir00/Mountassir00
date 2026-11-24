-- =============================================================================
-- EVENT LAB v0.4 — socle SaaS — migration 1/5
-- Schéma privé, rôles applicatifs, fonctions génériques des déclencheurs.
--
-- Cible : PostgreSQL 15+ managé par Supabase (Postgres + Auth + RLS).
-- Prérequis fournis par Supabase : schéma `auth` (auth.users, auth.uid(), auth.jwt())
-- et rôles `anon`, `authenticated`, `service_role`.
-- Les tests locaux (`npm run db:test`) remplacent ces prérequis par une
-- SIMULATION minimale (db/tests/00-simulation-auth-supabase.sql) : ce n'est pas Supabase.
--
-- Documentation : event-lab/docs/14-socle-saas.md
-- =============================================================================

-- Schéma privé : jamais exposé par l'API de données (PostgREST n'expose que `public`
-- dans la configuration par défaut). Il contient les fonctions utilisées par les règles RLS.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- Rôles applicatifs génériques (SaaS), du moins au plus étendu.
-- L'ordre de déclaration sert aux comparaisons (`role >= 'editeur'`).
-- La fonction associative (président, trésorier…) n'est pas un rôle : c'est le
-- libellé libre `memberships.function_label`.
create type public.app_role as enum ('lecteur', 'editeur', 'administrateur', 'proprietaire');

-- -----------------------------------------------------------------------------
-- Contexte d'exécution
-- -----------------------------------------------------------------------------

-- Vrai quand l'instruction s'exécute avec les droits d'un client de l'API
-- (rôles `anon` ou `authenticated`), faux dans une fonction privilégiée
-- (SECURITY DEFINER), pour le rôle de service ou une connexion d'administration.
create function private.is_client() returns boolean
language sql stable set search_path = '' as $$
  select current_user in ('anon', 'authenticated')
$$;

-- Purge d'une organisation en cours (suppression du compte de son dernier membre ou
-- suppression explicite par son propriétaire). Seule exception aux règles d'ajout seul
-- et d'immutabilité. La demande est inscrite dans une table privée, pour la seule
-- transaction en cours, par private.purge_organization() (migration 5) : aucun client
-- ne peut y écrire (pas de droit sur la table).
create table private.purge_requests (
  organization_id uuid not null,
  xact bigint not null,
  primary key (organization_id, xact)
);
alter table private.purge_requests enable row level security;
revoke all on private.purge_requests from public;

create function private.purging(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_org is not null and exists (
    select 1 from private.purge_requests r
    where r.organization_id = p_org and r.xact = txid_current()
  )
$$;

-- -----------------------------------------------------------------------------
-- Concurrence optimiste (row_version)
-- -----------------------------------------------------------------------------
-- Le client renvoie la valeur de row_version qu'il a lue. Si elle ne correspond plus
-- à la ligne en base, la mise à jour est refusée (code PT409) ; sinon row_version est
-- incrémentée. Un client qui omet row_version n'est pas contrôlé : l'application
-- l'envoie toujours (src/core/sync/remote-supabase.ts).

create function private.tg_init_row() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.row_version := 1;
  new.created_at := now();
  new.updated_at := now();
  return new;
end $$;

create function private.tg_row_version() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.row_version is distinct from old.row_version then
    raise exception using
      errcode = 'PT409',
      message = format('conflit_row_version : %s a changé (version lue %s, version actuelle %s)', tg_table_name, new.row_version, old.row_version),
      hint = 'Relire la ligne, puis réappliquer la modification.';
  end if;
  new.row_version := old.row_version + 1;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end $$;

-- -----------------------------------------------------------------------------
-- Tables en ajout seul (journal d'audit, historique de statut)
-- -----------------------------------------------------------------------------
create function private.tg_append_only() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' and private.purging(old.organization_id) then
    return old;
  end if;
  raise exception using
    errcode = 'PT423',
    message = format('%s est en ajout seul : %s refusé', tg_table_name, lower(tg_op));
end $$;

create function private.tg_forbid_truncate() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = 'PT423', message = format('%s est en ajout seul : vidage refusé', tg_table_name);
end $$;

-- -----------------------------------------------------------------------------
-- Comparaison du contenu d'une version (EventConfig) hors statut et historique
-- -----------------------------------------------------------------------------
create function private.version_content(p_config jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select p_config - 'status' - 'history'
$$;

-- Vrai si new_h prolonge old_h (mêmes entrées au début, ajouts seulement à la fin).
create function private.history_extends(old_h jsonb, new_h jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select case
    when old_h is null or jsonb_typeof(old_h) <> 'array' or jsonb_array_length(old_h) = 0 then true
    when new_h is null or jsonb_typeof(new_h) <> 'array' then false
    when jsonb_array_length(new_h) < jsonb_array_length(old_h) then false
    else not exists (
      select 1 from generate_series(0, jsonb_array_length(old_h) - 1) as i
      where (old_h -> i) is distinct from (new_h -> i)
    )
  end
$$;

-- Les fonctions d'aide sont appelées depuis les déclencheurs et les règles RLS, qui
-- s'exécutent avec les droits du client : il lui faut EXECUTE. Le schéma `private`
-- n'étant pas exposé par l'API, elles ne sont pas appelables directement depuis l'application.
revoke all on all functions in schema private from public;
grant execute on function private.is_client(), private.purging(uuid), private.version_content(jsonb), private.history_extends(jsonb, jsonb) to authenticated, service_role;
