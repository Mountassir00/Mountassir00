-- =============================================================================
-- BASK'EST LAB — schéma de base partagée (PostgreSQL 15+ / Supabase)
-- Miroir persistant de src/core/model.ts. À appliquer lors du passage
-- "prototype local" → "espace collaboratif" (voir docs/12 et docs/16).
-- Les objets riches (format, budget, implantation…) sont stockés en JSONB
-- typé par l'application ; les champs filtrés / joints sont en colonnes.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Organisation, membres, rôles
-- ---------------------------------------------------------------------------
create type member_role as enum ('president', 'tresorier', 'bureau', 'responsable_evenement', 'benevole', 'partenaire_lecture');

create table organisation (
  id uuid primary key default gen_random_uuid(),
  name text not null,                      -- Bask'Est
  siren text,
  city text,
  brand jsonb not null default '{}'::jsonb, -- BrandSystem (marque mère)
  created_at timestamptz not null default now()
);

create table member (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisation(id) on delete cascade,
  auth_user_id uuid unique,                -- lien vers auth.users (Supabase)
  display_name text not null,
  role member_role not null default 'benevole',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Propriétés événementielles et éditions réelles (§8)
-- ---------------------------------------------------------------------------
create type maturity_level as enum (
  'idee', 'concept_documente', 'concept_en_simulation', 'prototype',
  'evenement_pilote', 'format_valide', 'format_reproductible', 'format_exportable'
);
create type confidence as enum ('verifie', 'probable', 'estimation', 'hypothese', 'non_trouve');

create table event_property (
  id text primary key,                     -- 'asg-grand-est', 'bask-cup', 'king-of-the-court'
  organisation_id uuid not null references organisation(id) on delete cascade,
  name text not null,
  short_name text,
  kind text not null,
  status text not null default 'concept',
  maturity maturity_level not null default 'idee',
  brand jsonb not null default '{}'::jsonb,
  description text
);

create table venue (
  id text primary key,
  name text not null,
  type text not null,                      -- VenueType
  city text,
  floor_length_m numeric, floor_width_m numeric,
  fixed_seats int, authorized_gauge int, locker_rooms int,
  data jsonb not null,                     -- Venue complet (espaces, accès, AV, contraintes)
  provenance jsonb not null default '{}'::jsonb
);

create table edition (
  id text primary key,
  property_id text not null references event_property(id) on delete cascade,
  number int not null,
  date date,
  venue_id text references venue(id),
  budget_planned numeric,
  participants int,
  attendance int,
  tickets_sold int,
  volunteers int,
  data jsonb not null default '{}'::jsonb, -- recettes, dépenses, partenaires, programme, résultats, digital, retours, matériel
  data_completeness jsonb not null default '{}'::jsonb, -- champ → Provenance
  unique (property_id, number)
);

create table incident (
  id uuid primary key default gen_random_uuid(),
  edition_id text not null references edition(id) on delete cascade,
  at timestamptz,
  category text not null,                  -- ErrorCategory
  description text not null,
  severity smallint not null check (severity between 1 and 5),
  resolution text
);

-- ---------------------------------------------------------------------------
-- Connaissances : veille, innovations, erreurs, règles (§3-5)
-- ---------------------------------------------------------------------------
create table watch_source (
  id text primary key,
  name text not null, url text not null, kind text not null,
  topics text[] not null default '{}',
  frequency text not null, reliability smallint not null
);

create table watch_item (
  id uuid primary key default gen_random_uuid(),
  source_id text references watch_source(id),
  title text not null, url text, published_at date,
  summary text, sector text not null, tags text[] not null default '{}',
  relevance numeric not null default 0,
  status text not null default 'nouveau',  -- nouveau / qualifie / transpose / ecarte
  created_by uuid references member(id),
  created_at timestamptz not null default now()
);

create table innovation (
  id text primary key,
  title text not null, sector text not null, origin text not null,
  data jsonb not null,                     -- matrice de transposition complète
  media_potential smallint, immediate boolean not null default false,
  provenance jsonb not null default '{}'::jsonb
);

create table error_case (
  id text primary key,
  category text not null,
  title text not null,
  data jsonb not null,                     -- observé, causes, conséquences, prévention
  rule_ids text[] not null default '{}',
  provenance jsonb not null default '{}'::jsonb
);

create table design_rule (
  id text primary key,                     -- R01..R26
  key text not null, label text not null, category text not null,
  threshold text not null,
  revised_at timestamptz,                  -- seuils révisables après audit (§22)
  revision_note text
);

-- ---------------------------------------------------------------------------
-- Concepts, analyses, évaluations, versions (§6, §7, §21)
-- ---------------------------------------------------------------------------
create table concept (
  id text primary key,
  organisation_id uuid not null references organisation(id) on delete cascade,
  property_id text references event_property(id),
  title text not null,
  version int not null default 1,
  maturity maturity_level not null default 'idee',
  budget_tier text not null,
  venue_type text not null,
  venue_id text references venue(id),
  is_private boolean not null default true, -- privé tant que non publié volontairement (§20)
  data jsonb not null,                     -- Concept complet (format, expérience, identité, sécurité, ops)
  evidence jsonb not null,                 -- MaturityEvidence
  created_by uuid references member(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table concept_version (
  concept_id text not null references concept(id) on delete cascade,
  version int not null,
  data jsonb not null,
  summary text not null,
  author uuid references member(id),
  at timestamptz not null default now(),
  primary key (concept_id, version)
);

create table analysis_run (
  id uuid primary key default gen_random_uuid(),
  concept_id text not null references concept(id) on delete cascade,
  concept_version int not null,
  runs int not null,
  seed text not null,
  fairness jsonb not null,                 -- FairnessReport
  schedule jsonb not null,                 -- Schedule
  budget jsonb not null,                   -- Budget
  scenarios jsonb not null,                -- ScenarioResult[]
  layout jsonb not null,                   -- Layout
  rules jsonb not null,                    -- RuleResult[]
  created_at timestamptz not null default now()
);

create table evaluation (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references analysis_run(id) on delete cascade,
  total numeric not null check (total between 0 and 100),
  grade char(1) not null,
  eligible boolean not null,
  gate_safety text not null, gate_fairness text not null, gate_compliance text not null,
  criteria jsonb not null,
  overrides jsonb not null default '[]'::jsonb, -- surcharges jury motivées
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Projets, tâches, blueprints, validations, notifications (§18-20)
-- ---------------------------------------------------------------------------
create table project (
  id uuid primary key default gen_random_uuid(),
  concept_id text not null references concept(id),
  name text not null,
  stage text not null default 'conception',
  owner uuid references member(id),
  event_date date,
  visibility text not null default 'prive' check (visibility in ('prive', 'equipe', 'publie'))
);

create table project_task (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references project(id) on delete cascade,
  title text not null,
  due_day int not null,                    -- J-x
  owner text,
  deliverable text,
  kpi text,
  done boolean not null default false
);

create table blueprint (
  id uuid primary key default gen_random_uuid(),
  concept_id text not null references concept(id),
  concept_version int not null,
  data jsonb not null,                     -- Blueprint (sections, données d'export)
  files jsonb not null default '{}'::jsonb,-- chemins des exports (pdf, docx, xlsx, pptx)
  created_at timestamptz not null default now()
);

create table approval_request (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action in ('publication', 'depense', 'commande', 'reservation', 'modification_operationnelle')),
  payload jsonb not null,
  requested_by uuid references member(id),
  required_role member_role not null,
  status text not null default 'en_attente' check (status in ('en_attente', 'approuve', 'refuse')),
  decided_by uuid references member(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table notification (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references member(id) on delete cascade,
  level text not null, message text not null, link text,
  read boolean not null default false,
  at timestamptz not null default now()
);

create table post_event_audit (
  id uuid primary key default gen_random_uuid(),
  edition_id text not null references edition(id) on delete cascade,
  targets jsonb not null, actuals jsonb not null,
  score numeric not null, meets_targets boolean not null,
  priorities jsonb not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Sécurité (RLS) : privé par défaut, publication = validation
-- (auth.uid() est fournie par Supabase ; sur un Postgres nu, remplacer par current_setting(...))
-- ---------------------------------------------------------------------------
alter table concept enable row level security;
alter table project enable row level security;
alter table approval_request enable row level security;

create or replace function current_member_role() returns member_role
language sql stable as $$
  select role from member where auth_user_id = auth.uid()
$$;

-- Lecture des concepts : membres de l'organisation ; les concepts publics sont lisibles par tous.
create policy concept_read on concept for select using (
  not is_private
  or organisation_id in (select organisation_id from member where auth_user_id = auth.uid())
);
-- Écriture : tout membre sauf partenaire en lecture.
create policy concept_write on concept for all using (
  organisation_id in (select organisation_id from member where auth_user_id = auth.uid() and role <> 'partenaire_lecture')
);
-- Passage en public : réservé au bureau / président (en plus de la file de validation).
create policy concept_publish on concept for update using (true) with check (
  is_private or current_member_role() in ('president', 'bureau')
);
-- Décision sur une demande d'approbation : rôle requis ou président.
create policy approval_decide on approval_request for update using (
  current_member_role() = required_role or current_member_role() = 'president'
);
create policy approval_read on approval_request for select using (auth.uid() is not null);
