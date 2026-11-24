-- =============================================================================
-- EVENT LAB v0.4 — socle SaaS — migration 4/5
-- Connaissances partagées : briques, registre des erreurs, sources et fiches de veille,
-- concepts du portefeuille. Communes à tous les clients, en lecture seule pour tout
-- utilisateur authentifié ; écriture réservée au rôle de service (et à l'administrateur
-- de la base qui charge la graine supabase/seed.sql).
-- Source : fichiers JSON d'event-lab/ (npm run db:seed:generate).
-- =============================================================================

create table public.kb_building_blocks (
  id text primary key check (id ~ '^B-[a-z0-9_-]+$'),
  type text not null check (type in ('regles', 'qualification', 'recompenses', 'mise_en_scene', 'interaction_public', 'mecanique_jeu', 'experience_digitale', 'scenographie', 'son_lumiere', 'monetisation', 'fidelisation', 'activation_partenaire', 'creation_contenu')),
  name text not null,
  data jsonb not null check (jsonb_typeof(data) = 'object' and data ->> 'id' = id),
  updated_at timestamptz not null default now()
);
create index kb_building_blocks_type_idx on public.kb_building_blocks (type);

create table public.kb_errors (
  id text primary key check (id ~ '^E-[0-9]{3,}$'),
  domain text not null,
  severity text not null check (severity in ('mineure', 'majeure', 'critique')),
  title text not null,
  data jsonb not null check (jsonb_typeof(data) = 'object' and data ->> 'id' = id),
  updated_at timestamptz not null default now()
);
create index kb_errors_domain_idx on public.kb_errors (domain);

create table public.kb_watch_sources (
  id text primary key check (id ~ '^SRC-[0-9]{3,}$'),
  name text not null,
  url text not null,
  type text not null,
  verification text not null check (verification in ('verifie', 'non_verifie')),
  data jsonb not null check (jsonb_typeof(data) = 'object' and data ->> 'id' = id),
  updated_at timestamptz not null default now()
);

-- Fiches de veille (event-lab/knowledge/veille/AAAA/MM/W-*.json) : aucune fiche
-- n'est encore publiée dans le dépôt en v0.4 ; la table est prête.
create table public.kb_watch_entries (
  id text primary key check (id ~ '^W-[0-9]{8}-[a-z0-9-]+$'),
  dedupe_key text,
  status text not null default 'a_valider' check (status in ('a_valider', 'publie', 'rejete', 'fusionne')),
  reliability char(1) check (reliability in ('A', 'B', 'C', 'D')),
  sector_family text,
  data jsonb not null check (jsonb_typeof(data) = 'object' and data ->> 'id' = id),
  updated_at timestamptz not null default now()
);
create index kb_watch_entries_dedupe_idx on public.kb_watch_entries (dedupe_key);

create table public.kb_portfolio_concepts (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  version text not null check (version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  name text not null,
  data jsonb not null check (jsonb_typeof(data) = 'object' and data ->> 'id' = id and data ->> 'version' = version),
  score numeric generated always as ((data #>> '{evaluation,computed,score}')::numeric) stored,
  verdict text generated always as (data #>> '{evaluation,computed,verdict}') stored,
  updated_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['kb_building_blocks', 'kb_errors', 'kb_watch_sources', 'kb_watch_entries', 'kb_portfolio_concepts'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_select', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

comment on table public.kb_building_blocks is 'Briques fonctionnelles (event-lab/knowledge/building-blocks.json). Lecture seule pour les utilisateurs.';
comment on table public.kb_errors is 'Registre des erreurs (event-lab/knowledge/registre-erreurs.json). Lecture seule pour les utilisateurs.';
comment on table public.kb_watch_sources is 'Catalogue des sources de veille (event-lab/knowledge/veille/sources.json). Lecture seule pour les utilisateurs.';
comment on table public.kb_watch_entries is 'Fiches de veille publiées (event-lab/knowledge/veille/). Lecture seule pour les utilisateurs.';
comment on table public.kb_portfolio_concepts is 'Concepts du portefeuille EVENT LAB (event-lab/portfolio/concepts/). Lecture seule pour les utilisateurs.';
