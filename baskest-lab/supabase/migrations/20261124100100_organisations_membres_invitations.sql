-- =============================================================================
-- EVENT LAB v0.4 — socle SaaS — migration 2/5
-- Organisations, appartenances (rôles), invitations, et fonctions d'aide RLS.
--
-- Reprend de l'ancien baskest-lab/db/schema.sql : organisation (nom, SIREN, ville,
-- marque), membre (nom affiché, lien vers auth.users) ; les rôles associatifs
-- (président, trésorier, bureau…) deviennent des rôles génériques + un libellé libre.
-- =============================================================================

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  siren text check (siren is null or siren ~ '^[0-9]{9}$'),
  city text check (city is null or char_length(city) <= 120),
  brand jsonb not null default '{}'::jsonb check (jsonb_typeof(brand) = 'object' and octet_length(brand::text) <= 65536),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  row_version integer not null default 1
);
comment on table public.organizations is 'Organisation cliente (association, club, collectivité, agence). Toutes les données métier sont isolées par organisation.';

create table public.memberships (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null default 'lecteur',
  function_label text check (function_label is null or char_length(function_label) <= 80),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  row_version integer not null default 1,
  primary key (organization_id, user_id)
);
comment on column public.memberships.function_label is 'Fonction dans la structure, texte libre (ex. « trésorier », « présidente ») : sans effet sur les droits.';
create index memberships_user_id_idx on public.memberships (user_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null check (email = lower(btrim(email)) and char_length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  role public.app_role not null default 'lecteur',
  function_label text check (function_label is null or char_length(function_label) <= 80),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz
);
comment on table public.invitations is 'Invitation nominative (adresse e-mail) ; acceptée par la personne connectée avec cette adresse, via public.accept_invitation(). L''envoi de l''e-mail n''est pas automatisé en v0.4.';
create unique index invitations_pending_unique on public.invitations (organization_id, email) where accepted_at is null and revoked_at is null;
create index invitations_email_idx on public.invitations (email);
create index invitations_organization_id_idx on public.invitations (organization_id);

-- -----------------------------------------------------------------------------
-- Fonctions d'aide RLS (SECURITY DEFINER : elles lisent memberships sans repasser
-- par ses propres règles, ce qui éviterait une récursion). Elles ne renvoient que des
-- informations sur l'utilisateur connecté (auth.uid()).
-- -----------------------------------------------------------------------------

-- Organisations dont l'utilisateur connecté est membre avec au moins le rôle donné.
create function private.orgs_with_role(p_min public.app_role) returns setof uuid
language sql stable security definer set search_path = '' as $$
  select m.organization_id
  from public.memberships m
  where m.user_id = (select auth.uid()) and m.role >= p_min
$$;

create function private.has_role(p_org uuid, p_min public.app_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = p_org and m.user_id = (select auth.uid()) and m.role >= p_min
  )
$$;

create function private.other_owner_exists(p_org uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = p_org and m.user_id <> p_user and m.role = 'proprietaire'
  )
$$;

revoke all on function private.orgs_with_role(public.app_role), private.has_role(uuid, public.app_role), private.other_owner_exists(uuid, uuid) from public;
grant execute on function private.orgs_with_role(public.app_role), private.has_role(uuid, public.app_role), private.other_owner_exists(uuid, uuid) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Journal d'audit (créé ici pour que les déclencheurs des appartenances y écrivent ;
-- règles détaillées dans la migration 3).
-- -----------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations (id) on delete cascade,
  at timestamptz not null default now(),
  actor uuid, -- pas de clé étrangère : identifiant conservé tel quel (pseudonyme) si le compte est supprimé
  action text not null check (action ~ '^[a-z_]+(\.[a-z_]+)+$' and char_length(action) <= 80),
  target text not null check (char_length(target) <= 300),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object' and octet_length(details::text) <= 16384)
);
comment on table public.audit_log is 'Journal d''audit en ajout seul. Les actions « client.* » sont écrites par l''application ; les autres par les déclencheurs.';
create index audit_log_organization_at_idx on public.audit_log (organization_id, at desc);

create function private.audit(p_org uuid, p_action text, p_target text, p_details jsonb default '{}'::jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_log (organization_id, actor, action, target, details)
  select p_org, (select auth.uid()), p_action, p_target, coalesce(p_details, '{}'::jsonb)
  where not private.purging(p_org)
$$;
revoke all on function private.audit(uuid, text, text, jsonb) from public;
grant execute on function private.audit(uuid, text, text, jsonb) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Déclencheurs : organisations
-- -----------------------------------------------------------------------------
create function private.tg_organizations_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- created_by peut passer à null par la clé étrangère quand le compte créateur est supprimé
  if new.id is distinct from old.id or (new.created_by is distinct from old.created_by and private.is_client()) then
    raise exception using errcode = 'PT400', message = 'organisation : identifiant et créateur non modifiables';
  end if;
  return new;
end $$;

create trigger organizations_10_init before insert on public.organizations for each row execute function private.tg_init_row();
create trigger organizations_10_guard before update on public.organizations for each row execute function private.tg_organizations_guard();
create trigger organizations_20_row_version before update on public.organizations for each row execute function private.tg_row_version();

-- -----------------------------------------------------------------------------
-- Déclencheurs : appartenances
-- Règles (en plus des règles RLS) :
--  - changer un rôle : administrateur ou plus ; tout ce qui touche au rôle
--    « proprietaire » (donner, retirer) est réservé à un propriétaire ;
--  - retirer un membre : soi-même (quitter), administrateur pour les non-propriétaires,
--    propriétaire pour un propriétaire ;
--  - une organisation garde toujours au moins un propriétaire (sauf purge).
-- -----------------------------------------------------------------------------
create function private.tg_memberships_guard() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if tg_op = 'UPDATE' then
    if new.organization_id is distinct from old.organization_id or new.user_id is distinct from old.user_id then
      raise exception using errcode = 'PT400', message = 'appartenance : organisation et utilisateur non modifiables';
    end if;
    if private.is_client() then
      if new.role is distinct from old.role then
        if (old.role = 'proprietaire' or new.role = 'proprietaire') and not private.has_role(old.organization_id, 'proprietaire') then
          raise exception using errcode = '42501', message = 'seul un propriétaire peut donner ou retirer le rôle de propriétaire';
        elsif not private.has_role(old.organization_id, 'administrateur') then
          raise exception using errcode = '42501', message = 'changer un rôle demande le rôle administrateur';
        end if;
      end if;
      if (new.display_name is distinct from old.display_name or new.function_label is distinct from old.function_label)
         and old.user_id <> v_uid and not private.has_role(old.organization_id, 'administrateur') then
        raise exception using errcode = '42501', message = 'seul le membre lui-même ou un administrateur peut modifier ce nom ou cette fonction';
      end if;
    end if;
    if old.role = 'proprietaire' and new.role <> 'proprietaire' and not private.other_owner_exists(old.organization_id, old.user_id) then
      raise exception using errcode = 'PT409', message = 'dernier_proprietaire : nommer un autre propriétaire avant de retirer ce rôle';
    end if;
    return new;
  end if;

  -- DELETE
  if private.purging(old.organization_id) then
    return old;
  end if;
  if private.is_client() and old.user_id <> v_uid then
    if old.role = 'proprietaire' and not private.has_role(old.organization_id, 'proprietaire') then
      raise exception using errcode = '42501', message = 'seul un propriétaire peut retirer un propriétaire';
    elsif not private.has_role(old.organization_id, 'administrateur') then
      raise exception using errcode = '42501', message = 'retirer un membre demande le rôle administrateur';
    end if;
  end if;
  if old.role = 'proprietaire' and not private.other_owner_exists(old.organization_id, old.user_id) then
    raise exception using errcode = 'PT409', message = 'dernier_proprietaire : une organisation doit garder au moins un propriétaire (nommer un autre propriétaire ou supprimer l''organisation)';
  end if;
  return old;
end $$;

create function private.tg_memberships_log() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform private.audit(new.organization_id, 'membership.add', 'user:' || new.user_id, jsonb_build_object('role', new.role));
  elsif tg_op = 'UPDATE' and new.role is distinct from old.role then
    perform private.audit(new.organization_id, 'membership.role', 'user:' || new.user_id, jsonb_build_object('from', old.role, 'to', new.role));
  elsif tg_op = 'DELETE' then
    perform private.audit(old.organization_id, 'membership.remove', 'user:' || old.user_id, jsonb_build_object('role', old.role));
  end if;
  return null;
end $$;

create trigger memberships_10_init before insert on public.memberships for each row execute function private.tg_init_row();
create trigger memberships_10_guard before update or delete on public.memberships for each row execute function private.tg_memberships_guard();
create trigger memberships_20_row_version before update on public.memberships for each row execute function private.tg_row_version();
create trigger memberships_90_log after insert or update or delete on public.memberships for each row execute function private.tg_memberships_log();

-- -----------------------------------------------------------------------------
-- Déclencheurs : invitations
-- -----------------------------------------------------------------------------
create function private.tg_invitations_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.email := lower(btrim(new.email));
    new.created_at := now();
    new.accepted_at := null;
    new.accepted_by := null;
    new.revoked_at := null;
    if private.is_client() then
      new.invited_by := (select auth.uid());
      if new.expires_at is null or new.expires_at > now() + interval '30 days' or new.expires_at <= now() then
        new.expires_at := now() + interval '14 days';
      end if;
    end if;
    return new;
  end if;
  -- UPDATE : un client ne peut que révoquer une invitation en attente
  if private.is_client() then
    if (new.organization_id, new.email, new.role, new.function_label, new.invited_by, new.created_at, new.expires_at, new.accepted_at, new.accepted_by)
       is distinct from (old.organization_id, old.email, old.role, old.function_label, old.invited_by, old.created_at, old.expires_at, old.accepted_at, old.accepted_by) then
      raise exception using errcode = 'PT400', message = 'invitation : seule la révocation est possible';
    end if;
    if old.accepted_at is not null then
      raise exception using errcode = 'PT409', message = 'invitation déjà acceptée';
    end if;
    if new.revoked_at is not null then
      new.revoked_at := now();
    end if;
  end if;
  return new;
end $$;

create function private.tg_invitations_log() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform private.audit(new.organization_id, 'invitation.create', 'invitation:' || new.id, jsonb_build_object('role', new.role));
  elsif tg_op = 'UPDATE' and new.revoked_at is not null and old.revoked_at is null then
    perform private.audit(new.organization_id, 'invitation.revoke', 'invitation:' || new.id, '{}'::jsonb);
  end if;
  return null;
end $$;

create trigger invitations_10_guard before insert or update on public.invitations for each row execute function private.tg_invitations_guard();
create trigger invitations_90_log after insert or update on public.invitations for each row execute function private.tg_invitations_log();

-- -----------------------------------------------------------------------------
-- Sécurité au niveau des lignes (RLS)
-- -----------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;

-- Organisations : visibles par leurs membres ; modifiables par administrateur ou plus.
-- Création et suppression : uniquement par les fonctions public.create_organization()
-- et public.delete_organization() (migration 5).
create policy organizations_select on public.organizations for select to authenticated
  using (id in (select private.orgs_with_role('lecteur')));
create policy organizations_update on public.organizations for update to authenticated
  using (id in (select private.orgs_with_role('administrateur')))
  with check (id in (select private.orgs_with_role('administrateur')));

-- Appartenances : chaque membre voit les membres de ses organisations.
-- Ajout : uniquement par invitation acceptée ou création d'organisation (fonctions).
create policy memberships_select on public.memberships for select to authenticated
  using (organization_id in (select private.orgs_with_role('lecteur')));
create policy memberships_update on public.memberships for update to authenticated
  using (user_id = (select auth.uid()) or organization_id in (select private.orgs_with_role('administrateur')))
  with check (user_id = (select auth.uid()) or organization_id in (select private.orgs_with_role('administrateur')));
create policy memberships_delete on public.memberships for delete to authenticated
  using (user_id = (select auth.uid()) or organization_id in (select private.orgs_with_role('administrateur')));

-- Invitations : gérées par administrateur ou plus ; la personne invitée voit celles
-- adressées à son e-mail (revendication `email` du jeton d'accès).
create policy invitations_select on public.invitations for select to authenticated
  using (
    organization_id in (select private.orgs_with_role('administrateur'))
    or email = lower((select auth.jwt()) ->> 'email')
  );
create policy invitations_insert on public.invitations for insert to authenticated
  with check (
    organization_id in (select private.orgs_with_role('administrateur'))
    and (role <> 'proprietaire' or organization_id in (select private.orgs_with_role('proprietaire')))
  );
create policy invitations_update on public.invitations for update to authenticated
  using (organization_id in (select private.orgs_with_role('administrateur')))
  with check (organization_id in (select private.orgs_with_role('administrateur')));
create policy invitations_delete on public.invitations for delete to authenticated
  using (organization_id in (select private.orgs_with_role('administrateur')));

-- -----------------------------------------------------------------------------
-- Droits d'accès explicites (ne dépendent pas des privilèges par défaut du projet)
-- -----------------------------------------------------------------------------
revoke all on public.organizations, public.memberships, public.invitations from public, anon, authenticated;
grant select on public.organizations, public.memberships, public.invitations to authenticated;
grant update (name, siren, city, brand, row_version) on public.organizations to authenticated;
grant update (role, function_label, display_name, row_version) on public.memberships to authenticated;
grant delete on public.memberships to authenticated;
grant insert (organization_id, email, role, function_label, expires_at) on public.invitations to authenticated;
grant update (revoked_at) on public.invitations to authenticated;
grant delete on public.invitations to authenticated;
grant all on public.organizations, public.memberships, public.invitations to service_role;
