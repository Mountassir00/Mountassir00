-- =============================================================================
-- EVENT LAB v0.4 — socle SaaS — migration 5/5
-- Fonctions appelées par l'application (RPC) : créer une organisation, accepter une
-- invitation, lister ses invitations, supprimer une organisation, supprimer son compte.
--
-- Ce sont des fonctions SECURITY DEFINER : elles s'exécutent avec les droits de leur
-- propriétaire (le rôle qui applique les migrations) et contournent donc les règles RLS.
-- Chacune vérifie elle-même l'identité (auth.uid()) et les droits de l'appelant.
-- EXECUTE est retiré à `public` et `anon`, accordé à `authenticated` seulement.
-- =============================================================================

-- Purge complète d'une organisation et de toutes ses données (y compris les versions
-- figées et le journal d'audit). Fonction privée : appelée seulement par
-- public.delete_organization() et public.delete_my_account().
create function private.purge_organization(p_org uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into private.purge_requests (organization_id, xact) values (p_org, txid_current()) on conflict do nothing;
  delete from public.organizations where id = p_org;
  delete from private.purge_requests where organization_id = p_org and xact = txid_current();
end $$;
revoke all on function private.purge_organization(uuid) from public, anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
create function public.create_organization(p_name text, p_display_name text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text := (select auth.jwt()) ->> 'email';
  v_org uuid;
begin
  if v_uid is null then
    raise exception using errcode = '42501', message = 'connexion requise';
  end if;
  if (select count(*) from public.organizations o where o.created_by = v_uid) >= 20 then
    raise exception using errcode = 'PT429', message = 'limite atteinte : 20 organisations créées par compte';
  end if;
  insert into public.organizations (name, created_by) values (btrim(p_name), v_uid) returning id into v_org;
  insert into public.memberships (organization_id, user_id, role, display_name)
  values (v_org, v_uid, 'proprietaire', left(coalesce(nullif(btrim(p_display_name), ''), nullif(split_part(coalesce(v_email, ''), '@', 1), ''), 'Propriétaire'), 80));
  return v_org;
end $$;

-- -----------------------------------------------------------------------------
-- Invitations adressées à l'utilisateur connecté (avec le nom de l'organisation, qu'il
-- ne peut pas encore lire puisqu'il n'en est pas membre).
create function public.my_invitations()
returns table (id uuid, organization_id uuid, organization_name text, role public.app_role, function_label text, created_at timestamptz, expires_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.id, i.organization_id, o.name, i.role, i.function_label, i.created_at, i.expires_at
  from public.invitations i
  join public.organizations o on o.id = i.organization_id
  where (select auth.uid()) is not null
    and i.email = lower((select auth.jwt()) ->> 'email')
    and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
  order by i.created_at
$$;

-- -----------------------------------------------------------------------------
create function public.accept_invitation(p_invitation uuid, p_display_name text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text := lower((select auth.jwt()) ->> 'email');
  v_inv public.invitations;
begin
  if v_uid is null or v_email is null then
    raise exception using errcode = '42501', message = 'connexion requise';
  end if;
  select * into v_inv from public.invitations i where i.id = p_invitation for update;
  if not found or v_inv.email <> v_email then
    raise exception using errcode = 'PT404', message = 'invitation introuvable pour cette adresse e-mail';
  end if;
  if v_inv.revoked_at is not null or v_inv.accepted_at is not null or v_inv.expires_at <= now() then
    raise exception using errcode = 'PT410', message = 'invitation révoquée, expirée ou déjà utilisée';
  end if;
  insert into public.memberships (organization_id, user_id, role, function_label, display_name)
  values (v_inv.organization_id, v_uid, v_inv.role, v_inv.function_label,
          left(coalesce(nullif(btrim(p_display_name), ''), nullif(split_part(v_email, '@', 1), ''), 'Membre'), 80))
  on conflict (organization_id, user_id) do nothing;
  update public.invitations set accepted_at = now(), accepted_by = v_uid where id = v_inv.id;
  return v_inv.organization_id;
end $$;

-- -----------------------------------------------------------------------------
-- Suppression d'une organisation par un propriétaire (confirmation : son nom exact).
create function public.delete_organization(p_org uuid, p_confirm_name text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_name text;
begin
  if (select auth.uid()) is null or not private.has_role(p_org, 'proprietaire') then
    raise exception using errcode = '42501', message = 'suppression réservée à un propriétaire de l''organisation';
  end if;
  select o.name into v_name from public.organizations o where o.id = p_org;
  if p_confirm_name is distinct from v_name then
    raise exception using errcode = 'PT400', message = 'confirmation incorrecte : saisir le nom exact de l''organisation';
  end if;
  insert into public.audit_log (organization_id, actor, action, target, details)
  values (null, (select auth.uid()), 'organization.delete', 'organization:' || p_org, '{}'::jsonb);
  perform private.purge_organization(p_org);
end $$;

-- -----------------------------------------------------------------------------
-- Suppression de son propre compte (exigence des magasins d'applications).
--
-- Règle pour chaque organisation dont l'utilisateur est membre :
--   - il en est le seul membre               -> l'organisation et toutes ses données sont supprimées ;
--   - il en est le seul propriétaire et
--     d'autres membres existent              -> REFUS : nommer d'abord un autre propriétaire
--                                               (ou supprimer l'organisation) ;
--   - sinon (co-propriétaire, autre rôle)    -> son appartenance est retirée ; l'organisation
--                                               et ses données restent (elles lui appartiennent).
-- public.account_deletion_preview() donne ce bilan avant confirmation.
create function public.account_deletion_preview()
returns table (organization_id uuid, organization_name text, my_role public.app_role, other_members integer, other_owners integer, outcome text)
language sql stable security definer set search_path = '' as $$
  select m.organization_id, o.name, m.role,
         (select count(*)::int from public.memberships x where x.organization_id = m.organization_id and x.user_id <> m.user_id),
         (select count(*)::int from public.memberships x where x.organization_id = m.organization_id and x.user_id <> m.user_id and x.role = 'proprietaire'),
         case
           when not exists (select 1 from public.memberships x where x.organization_id = m.organization_id and x.user_id <> m.user_id) then 'organisation_supprimee'
           when m.role = 'proprietaire' and not exists (select 1 from public.memberships x where x.organization_id = m.organization_id and x.user_id <> m.user_id and x.role = 'proprietaire') then 'bloquant'
           else 'adhesion_retiree'
         end
  from public.memberships m
  join public.organizations o on o.id = m.organization_id
  where m.user_id = (select auth.uid())
  order by o.name
$$;

create function public.delete_my_account(p_confirm text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text := lower((select auth.jwt()) ->> 'email');
  v_blocking text;
  r record;
begin
  if v_uid is null then
    raise exception using errcode = '42501', message = 'connexion requise';
  end if;
  if p_confirm is distinct from 'SUPPRIMER' then
    raise exception using errcode = 'PT400', message = 'confirmation incorrecte : saisir SUPPRIMER';
  end if;
  select string_agg(p.organization_name, ', ') into v_blocking from public.account_deletion_preview() p where p.outcome = 'bloquant';
  if v_blocking is not null then
    raise exception using
      errcode = 'PT409',
      message = format('suppression_bloquee : vous êtes le seul propriétaire de %s, qui compte d''autres membres', v_blocking),
      hint = 'Nommez un autre propriétaire (page Compte et organisation) ou supprimez l''organisation, puis recommencez.';
  end if;
  for r in select p.organization_id from public.account_deletion_preview() p where p.outcome = 'organisation_supprimee' loop
    perform private.purge_organization(r.organization_id);
  end loop;
  delete from public.memberships where user_id = v_uid;
  if v_email is not null then
    delete from public.invitations where email = v_email and accepted_at is null;
  end if;
  insert into public.audit_log (organization_id, actor, action, target, details)
  values (null, v_uid, 'account.delete', 'user:' || v_uid, '{}'::jsonb);
  -- POINT À VÉRIFIER sur le projet Supabase réel : le rôle propriétaire de cette
  -- fonction (postgres) doit avoir le droit DELETE sur auth.users. Sinon, remplacer
  -- cette ligne par un appel à l'API d'administration (fonction Edge avec la clé de
  -- service : auth.admin.deleteUser) — voir event-lab/docs/14-socle-saas.md §8.
  delete from auth.users where id = v_uid;
end $$;

-- -----------------------------------------------------------------------------
-- Droits d'exécution : uniquement pour les utilisateurs connectés
-- -----------------------------------------------------------------------------
revoke all on function public.create_organization(text, text), public.my_invitations(), public.accept_invitation(uuid, text),
  public.delete_organization(uuid, text), public.account_deletion_preview(), public.delete_my_account(text) from public, anon;
grant execute on function public.create_organization(text, text), public.my_invitations(), public.accept_invitation(uuid, text),
  public.delete_organization(uuid, text), public.account_deletion_preview(), public.delete_my_account(text) to authenticated;
