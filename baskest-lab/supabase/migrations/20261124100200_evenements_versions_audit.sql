-- =============================================================================
-- EVENT LAB v0.4 — socle SaaS — migration 3/5
-- Événements, versions d'événement (EventConfig en JSONB), historique de statut,
-- règles du journal d'audit.
--
-- Reprend event-lab/docs/03-modele-de-donnees.md §5 (event, event_version, trigger
-- d'immutabilité, audit_log) et le moteur de versionnement de l'application
-- (src/core/eventlab/versioning.ts) :
--   draft --submit--> review --approve--> validated --archive--> archived
--   review --request_changes--> draft
-- Une version validée ou archivée est figée : son contenu ne change plus jamais et elle
-- ne peut pas être supprimée, même par un propriétaire. Toute évolution passe par une
-- nouvelle version brouillon.
-- =============================================================================

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]+$' and char_length(slug) <= 120),
  name text not null check (char_length(btrim(name)) between 1 and 200),
  origin text not null default 'studio' check (origin in ('studio', 'generateur', 'import')),
  created_by uuid, -- pas de clé étrangère : identifiant conservé (pseudonyme) si le compte est supprimé
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  row_version integer not null default 1,
  unique (organization_id, slug),
  unique (id, organization_id)
);
comment on table public.events is 'Événement d''une organisation, identifié par son slug (EventConfig.id) ; ses versions sont dans event_versions.';
comment on column public.events.origin is 'Provenance : studio (studio de configuration), generateur (générateur multisectoriel), import (données locales importées).';

create table public.event_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  event_id uuid not null,
  version text not null check (version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  status text not null default 'draft' check (status in ('draft', 'review', 'validated', 'archived')),
  config jsonb not null check (
    jsonb_typeof(config) = 'object'
    and config ->> 'version' = version
    and config ->> 'status' = status
    and octet_length(config::text) <= 1048576
  ),
  -- Colonnes dérivées de la configuration, pour filtrer et trier sans lire le JSON
  name text generated always as (config #>> '{identity,name}') stored,
  maturity text generated always as (coalesce(config ->> 'maturity', 'concept')) stored check (maturity in ('concept', 'blueprint', 'executed')),
  score numeric generated always as ((config #>> '{evaluation,computed,score}')::numeric) stored,
  verdict text generated always as (config #>> '{evaluation,computed,verdict}') stored,
  parent_slug text generated always as (config #>> '{parent,id}') stored,
  parent_version text generated always as (config #>> '{parent,version}') stored,
  parent_relation text generated always as (config #>> '{parent,relation}') stored,
  created_by uuid,   -- pas de clé étrangère (voir events.created_by)
  validated_by uuid, -- idem
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  row_version integer not null default 1,
  foreign key (event_id, organization_id) references public.events (id, organization_id) on delete cascade,
  unique (event_id, version)
);
comment on table public.event_versions is 'Versions d''un événement. Brouillon modifiable ; validée ou archivée = figée (déclencheur event_versions_10_guard).';
create index event_versions_organization_status_idx on public.event_versions (organization_id, status);
create index event_versions_event_id_idx on public.event_versions (event_id);
create index event_versions_updated_at_idx on public.event_versions (organization_id, updated_at);

create table public.event_version_status_history (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  version_id uuid not null, -- pas de clé étrangère : l'historique survit à la suppression d'un brouillon
  event_slug text not null,
  version text not null,
  from_status text,
  to_status text not null,
  actor uuid,
  at timestamptz not null default now()
);
comment on table public.event_version_status_history is 'Historique des changements de statut des versions, en ajout seul, écrit par déclencheur.';
create index event_version_status_history_version_idx on public.event_version_status_history (version_id, at);
create index event_version_status_history_org_idx on public.event_version_status_history (organization_id, at desc);

-- -----------------------------------------------------------------------------
-- Déclencheurs : événements
-- -----------------------------------------------------------------------------
create function private.tg_events_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if private.is_client() then
      new.created_by := (select auth.uid());
    end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    -- Un éditeur ne supprime un événement que s'il ne contient que des brouillons ;
    -- une version figée bloque la suppression pour tous (déclencheur des versions).
    if private.is_client()
       and exists (select 1 from public.event_versions v where v.event_id = old.id and v.status <> 'draft')
       and not private.has_role(old.organization_id, 'administrateur') then
      raise exception using errcode = '42501', message = 'droits_insuffisants : cet événement a des versions en revue ou figées ; suppression réservée à un administrateur';
    end if;
    return old;
  end if;
  if (new.id, new.organization_id, new.slug, new.created_by) is distinct from (old.id, old.organization_id, old.slug, old.created_by) then
    raise exception using errcode = 'PT400', message = 'événement : identifiant, organisation, slug et créateur non modifiables';
  end if;
  return new;
end $$;

create function private.tg_events_log() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform private.audit(new.organization_id, 'event.create', 'event:' || new.slug, jsonb_build_object('origin', new.origin));
  elsif tg_op = 'DELETE' then
    perform private.audit(old.organization_id, 'event.delete', 'event:' || old.slug, '{}'::jsonb);
  end if;
  return null;
end $$;

create trigger events_05_guard before insert or update or delete on public.events for each row execute function private.tg_events_guard();
create trigger events_10_init before insert on public.events for each row execute function private.tg_init_row();
create trigger events_20_row_version before update on public.events for each row execute function private.tg_row_version();
create trigger events_90_log after insert or delete on public.events for each row execute function private.tg_events_log();

-- -----------------------------------------------------------------------------
-- Déclencheur central : immutabilité, transitions, concurrence optimiste
-- -----------------------------------------------------------------------------
create function private.tg_event_versions_guard() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_slug text;
  v_required public.app_role;
begin
  if tg_op = 'INSERT' then
    select e.slug into v_slug from public.events e where e.id = new.event_id and e.organization_id = new.organization_id;
    if v_slug is null or new.config ->> 'id' is distinct from v_slug then
      raise exception using errcode = 'PT400', message = format('version : config.id (%s) doit être le slug de l''événement (%s)', new.config ->> 'id', coalesce(v_slug, 'introuvable'));
    end if;
    new.row_version := 1;
    new.created_at := now();
    new.updated_at := now();
    if private.is_client() then
      new.created_by := v_uid;
    end if;
    if new.status in ('validated', 'archived') then
      new.validated_by := coalesce(v_uid, new.validated_by);
      new.validated_at := now();
    else
      new.validated_by := null;
      new.validated_at := null;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.status in ('validated', 'archived') and not private.purging(old.organization_id) then
      raise exception using errcode = 'PT423', message = format('version_figee : la version %s de « %s » est %s, elle ne peut pas être supprimée', old.version, old.config ->> 'id', old.status);
    end if;
    return old;
  end if;

  -- UPDATE
  if (new.id, new.organization_id, new.event_id, new.version, new.created_by, new.created_at)
     is distinct from (old.id, old.organization_id, old.event_id, old.version, old.created_by, old.created_at) then
    raise exception using errcode = 'PT400', message = 'version : identifiant, événement, numéro et auteur non modifiables';
  end if;

  -- 1) Immutabilité : rien ne change sur une version figée, sauf le passage
  --    validated -> archived sans aucune modification du contenu (historique prolongé seulement).
  if old.status in ('validated', 'archived') then
    if not (
      old.status = 'validated' and new.status = 'archived'
      and private.version_content(new.config) = private.version_content(old.config)
      and private.history_extends(old.config -> 'history', new.config -> 'history')
      and new.validated_by is not distinct from old.validated_by
      and new.validated_at is not distinct from old.validated_at
    ) then
      raise exception using
        errcode = 'PT423',
        message = format('version_figee : la version %s de « %s » est %s, elle ne peut pas être modifiée', old.version, old.config ->> 'id', old.status),
        hint = 'Créer une nouvelle version brouillon à partir de celle-ci.';
    end if;
  end if;

  -- 2) Concurrence optimiste
  if new.row_version is distinct from old.row_version then
    raise exception using
      errcode = 'PT409',
      message = format('conflit_row_version : la version %s de « %s » a changé (lue %s, actuelle %s)', old.version, old.config ->> 'id', new.row_version, old.row_version),
      hint = 'Relire la version, puis réappliquer la modification.';
  end if;

  -- 3) Transitions de statut
  if new.status is distinct from old.status then
    if (old.status, new.status) not in (('draft', 'review'), ('review', 'draft'), ('review', 'validated'), ('validated', 'archived')) then
      raise exception using errcode = 'PT400', message = format('transition_interdite : %s -> %s', old.status, new.status);
    end if;
    if private.version_content(new.config) is distinct from private.version_content(old.config) then
      raise exception using errcode = 'PT400', message = 'transition : le contenu ne peut pas changer en même temps que le statut';
    end if;
    if private.is_client() then
      v_required := case when old.status = 'draft' and new.status = 'review' then 'editeur' else 'administrateur' end;
      if not private.has_role(old.organization_id, v_required) then
        raise exception using errcode = '42501', message = format('droits_insuffisants : la transition %s -> %s demande le rôle %s', old.status, new.status, v_required);
      end if;
    end if;
    if new.status = 'validated' then
      new.validated_by := v_uid;
      new.validated_at := now();
    end if;
  elsif private.version_content(new.config) is distinct from private.version_content(old.config) and old.status <> 'draft' then
    raise exception using errcode = 'PT423', message = format('seul un brouillon est modifiable (statut actuel : %s)', old.status);
  end if;

  if new.status <> 'validated' and new.status <> 'archived' then
    new.validated_by := null;
    new.validated_at := null;
  end if;
  new.row_version := old.row_version + 1;
  new.updated_at := now();
  return new;
end $$;

create function private.tg_event_versions_log() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.event_versions;
  v_action text;
begin
  v_row := case when tg_op = 'DELETE' then old else new end;
  if private.purging(v_row.organization_id) then
    return null;
  end if;
  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    insert into public.event_version_status_history (organization_id, version_id, event_slug, version, from_status, to_status, actor)
    values (v_row.organization_id, v_row.id, v_row.config ->> 'id', v_row.version, case when tg_op = 'UPDATE' then old.status end, v_row.status, (select auth.uid()));
  end if;
  v_action := case
    when tg_op = 'INSERT' then 'version.create'
    when tg_op = 'DELETE' then 'version.delete'
    when new.status is distinct from old.status then
      case old.status || '>' || new.status
        when 'draft>review' then 'version.submit'
        when 'review>draft' then 'version.request_changes'
        when 'review>validated' then 'version.approve'
        when 'validated>archived' then 'version.archive'
      end
    else 'version.update'
  end;
  perform private.audit(v_row.organization_id, v_action, 'event_version:' || (v_row.config ->> 'id') || '@' || v_row.version, jsonb_build_object('version_id', v_row.id, 'status', v_row.status));
  return null;
end $$;

create trigger event_versions_10_guard before insert or update or delete on public.event_versions for each row execute function private.tg_event_versions_guard();
create trigger event_versions_90_log after insert or update or delete on public.event_versions for each row execute function private.tg_event_versions_log();

-- -----------------------------------------------------------------------------
-- Journal d'audit et historique de statut : ajout seul (y compris pour le rôle de service)
-- -----------------------------------------------------------------------------
create function private.tg_audit_log_init() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.at := now();
  if private.is_client() then
    new.actor := (select auth.uid());
  end if;
  return new;
end $$;

create trigger audit_log_10_init before insert on public.audit_log for each row execute function private.tg_audit_log_init();
create trigger audit_log_20_append_only before update or delete on public.audit_log for each row execute function private.tg_append_only();
create trigger audit_log_30_no_truncate before truncate on public.audit_log for each statement execute function private.tg_forbid_truncate();
create trigger status_history_20_append_only before update or delete on public.event_version_status_history for each row execute function private.tg_append_only();
create trigger status_history_30_no_truncate before truncate on public.event_version_status_history for each statement execute function private.tg_forbid_truncate();

-- -----------------------------------------------------------------------------
-- Sécurité au niveau des lignes (RLS)
-- -----------------------------------------------------------------------------
alter table public.events enable row level security;
alter table public.event_versions enable row level security;
alter table public.event_version_status_history enable row level security;
alter table public.audit_log enable row level security;

-- Événements : lecture par tout membre ; création, renommage et suppression à partir
-- du rôle éditeur (la suppression échoue si l'événement a une version figée).
create policy events_select on public.events for select to authenticated
  using (organization_id in (select private.orgs_with_role('lecteur')));
create policy events_insert on public.events for insert to authenticated
  with check (organization_id in (select private.orgs_with_role('editeur')));
create policy events_update on public.events for update to authenticated
  using (organization_id in (select private.orgs_with_role('editeur')))
  with check (organization_id in (select private.orgs_with_role('editeur')));
create policy events_delete on public.events for delete to authenticated
  using (organization_id in (select private.orgs_with_role('editeur')));

-- Versions :
--  - lecture : tout membre ;
--  - création : éditeur (brouillon ou en revue) ; administrateur (tout statut) ;
--  - modification : éditeur sur un brouillon (contenu, ou soumission en revue) ;
--    administrateur sur toute version non figée (demande de modifications, validation)
--    et archivage d'une version validée ; le déclencheur vérifie chaque transition ;
--  - suppression : éditeur pour un brouillon, administrateur pour un brouillon ou une
--    version en revue ; jamais une version figée.
create policy event_versions_select on public.event_versions for select to authenticated
  using (organization_id in (select private.orgs_with_role('lecteur')));
create policy event_versions_insert on public.event_versions for insert to authenticated
  with check (
    (status in ('draft', 'review') and organization_id in (select private.orgs_with_role('editeur')))
    or organization_id in (select private.orgs_with_role('administrateur'))
  );
create policy event_versions_update_editor on public.event_versions for update to authenticated
  using (status = 'draft' and organization_id in (select private.orgs_with_role('editeur')))
  with check (status in ('draft', 'review') and organization_id in (select private.orgs_with_role('editeur')));
create policy event_versions_update_admin on public.event_versions for update to authenticated
  using (organization_id in (select private.orgs_with_role('administrateur')))
  with check (organization_id in (select private.orgs_with_role('administrateur')));
create policy event_versions_delete on public.event_versions for delete to authenticated
  using (
    (status = 'draft' and organization_id in (select private.orgs_with_role('editeur')))
    or (status in ('draft', 'review') and organization_id in (select private.orgs_with_role('administrateur')))
  );

-- Historique de statut : lecture par tout membre ; écrit uniquement par déclencheur.
create policy status_history_select on public.event_version_status_history for select to authenticated
  using (organization_id in (select private.orgs_with_role('lecteur')));

-- Journal d'audit : lecture par tout membre ; ajout par un membre, pour son
-- organisation, d'actions « client.* » (ex. client.export) ; jamais de modification.
create policy audit_log_select on public.audit_log for select to authenticated
  using (organization_id in (select private.orgs_with_role('lecteur')));
create policy audit_log_insert on public.audit_log for insert to authenticated
  with check (
    organization_id in (select private.orgs_with_role('lecteur'))
    and action like 'client.%'
  );

-- -----------------------------------------------------------------------------
-- Droits d'accès explicites
-- -----------------------------------------------------------------------------
revoke all on public.events, public.event_versions, public.event_version_status_history, public.audit_log from public, anon, authenticated, service_role;
grant select, delete on public.events to authenticated;
grant insert (id, organization_id, slug, name, origin) on public.events to authenticated;
grant update (name, row_version) on public.events to authenticated;
grant select, delete on public.event_versions to authenticated;
grant insert (id, organization_id, event_id, version, status, config) on public.event_versions to authenticated;
grant update (config, status, row_version) on public.event_versions to authenticated;
grant select on public.event_version_status_history to authenticated;
grant select on public.audit_log to authenticated;
grant insert (organization_id, action, target, details) on public.audit_log to authenticated;
grant all on public.events, public.event_versions to service_role;
grant select, insert on public.event_version_status_history, public.audit_log to service_role;
