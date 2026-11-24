-- =============================================================================
-- EVENT LAB v0.4 — tests du socle SaaS (npm run db:test)
-- Exécuté après : simulation locale de Supabase (00-simulation-auth-supabase.sql — ce
-- n'est PAS Supabase), migrations supabase/migrations/*.sql, graine supabase/seed.sql.
-- Chaque vérification affiche « ok - … » (NOTICE) ou « ECHEC - … » (WARNING) ;
-- le lanceur scripts/db-test.ts les compte.
-- =============================================================================
\set ON_ERROR_STOP 1
\o /dev/null

-- ----------------------------------------------------------------------------- outils
create schema tests;
grant usage on schema tests to public;
create table tests.users (key text primary key, id uuid not null, email text not null);
create table tests.ctx (key text primary key, val uuid);
grant all on tests.users, tests.ctx to public;

create function tests.section(p text) returns void language plpgsql as $$ begin raise notice '## %', p; end $$;
create function tests.ok(p_cond boolean, p_label text) returns void language plpgsql as $$
begin
  if coalesce(p_cond, false) then raise notice 'ok - %', p_label; else raise warning 'ECHEC - %', p_label; end if;
end $$;
-- Exécute p_sql et attend une erreur dont le code figure dans p_codes ('42501|PT423'), ou n'importe laquelle si null.
create function tests.throws(p_sql text, p_codes text, p_label text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if p_codes is null or sqlstate = any (string_to_array(p_codes, '|')) then
      raise notice 'ok - % [refus %]', p_label, sqlstate;
    else
      raise warning 'ECHEC - % : code % attendu, obtenu % (%)', p_label, p_codes, sqlstate, sqlerrm;
    end if;
    return;
  end;
  raise warning 'ECHEC - % : aucune erreur levée', p_label;
end $$;
-- Nombre de lignes touchées par p_sql (UPDATE/DELETE sous RLS : 0 = rien de visible).
create function tests.affected(p_sql text) returns bigint language plpgsql as $$
declare n bigint;
begin execute p_sql; get diagnostics n = row_count; return n; end $$;
create function tests.n(p_sql text) returns bigint language plpgsql as $$
declare n bigint;
begin execute format('select count(*) from (%s) as q', p_sql) into n; return n; end $$;
create function tests.v(p_key text) returns uuid language sql stable as $$ select val from tests.ctx where key = p_key $$;
create function tests.put(p_key text, p_val uuid) returns uuid language sql as $$
  insert into tests.ctx (key, val) values (p_key, p_val) on conflict (key) do update set val = excluded.val returning val
$$;
create function tests.uid(p_key text) returns uuid language sql stable as $$ select id from tests.users where key = p_key $$;

-- Changement d'identité, comme PostgREST le fait à chaque requête (réglages de session).
create function tests.login(p_key text) returns void language plpgsql as $$
declare u tests.users;
begin
  select * into u from tests.users where key = p_key;
  if not found then raise exception 'utilisateur de test inconnu : %', p_key; end if;
  perform set_config('role', 'none', false);
  perform set_config('request.jwt.claims', json_build_object('sub', u.id, 'role', 'authenticated', 'aud', 'authenticated', 'email', u.email)::text, false);
  perform set_config('role', 'authenticated', false);
end $$;
create function tests.as_anon() returns void language plpgsql as $$
begin
  perform set_config('role', 'none', false);
  perform set_config('request.jwt.claims', '{"role":"anon"}', false);
  perform set_config('role', 'anon', false);
end $$;
create function tests.as_service() returns void language plpgsql as $$
begin
  perform set_config('role', 'none', false);
  perform set_config('request.jwt.claims', '{"role":"service_role"}', false);
  perform set_config('role', 'service_role', false);
end $$;
-- Connexion d'administration de la base (propriétaire des tables, comme l'éditeur SQL).
create function tests.as_dba() returns void language plpgsql as $$
begin
  perform set_config('role', 'none', false);
  perform set_config('request.jwt.claims', '', false);
end $$;

-- EventConfig minimale
create function tests.cfg(p_slug text, p_version text, p_status text default 'draft', p_name text default 'Test') returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'id', p_slug, 'version', p_version, 'status', p_status, 'maturity', 'concept',
    'identity', jsonb_build_object('name', p_name, 'tagline', 'test', 'disciplines', '[]'::jsonb, 'directions', '["accessible"]'::jsonb),
    'format', jsonb_build_object('summary', 'test', 'building_blocks', '[]'::jsonb),
    'evaluation', jsonb_build_object('type', 'previsionnelle', 'computed', jsonb_build_object('score', 61, 'verdict', 'sous_reserve')),
    'history', jsonb_build_array(jsonb_build_object('version', p_version, 'date', '2026-11-24', 'author', 'test', 'summary', 'création', 'decisions', '[]'::jsonb, 'approved_by', null))
  )
$$;
-- Même configuration avec un autre statut et une entrée d'historique en plus (comme transition()).
create function tests.with_status(p_cfg jsonb, p_status text) returns jsonb language sql immutable as $$
  select jsonb_set(p_cfg, '{status}', to_jsonb(p_status))
         || jsonb_build_object('history', coalesce(p_cfg -> 'history', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('version', p_cfg ->> 'version', 'summary', 'Transition → ' || p_status)))
$$;
-- Statut et row_version courants d'une version (lus avec les droits d'administration pour les vérifications).
create function tests.version_row(p_id uuid) returns public.event_versions language sql security definer as $$ select * from public.event_versions where id = p_id $$;
grant execute on all functions in schema tests to public;

-- Utilisateurs simulés
insert into tests.users (key, id, email) values
  ('alice', gen_random_uuid(), 'alice@example.org'),   -- propriétaire de A
  ('bob',   gen_random_uuid(), 'bob@example.org'),     -- éditeur de A
  ('carol', gen_random_uuid(), 'carol@example.org'),   -- lectrice de A
  ('dave',  gen_random_uuid(), 'dave@example.org'),    -- administrateur de A
  ('erin',  gen_random_uuid(), 'erin@example.org'),    -- propriétaire de B
  ('gina',  gen_random_uuid(), 'gina@example.org'),    -- éditrice de B
  ('frank', gen_random_uuid(), 'frank@example.org'),   -- seul membre de C
  ('hugo',  gen_random_uuid(), 'hugo@example.org');    -- sans organisation
insert into auth.users (id, email) select id, email from tests.users;

-- =============================================================================
select tests.section('1. Organisations, invitations, rôles');
-- =============================================================================
select tests.login('alice');
select tests.put('org_a', public.create_organization('Bask''Est', 'Alice'));
select tests.ok(tests.v('org_a') is not null, 'alice crée l''organisation A (create_organization)');
select tests.ok(tests.n($$select 1 from public.memberships where role = 'proprietaire' and user_id = tests.uid('alice')$$) = 1, 'alice en est propriétaire');
insert into public.invitations (organization_id, email, role) values (tests.v('org_a'), '  Bob@Example.org ', 'editeur');
insert into public.invitations (organization_id, email, role, function_label) values (tests.v('org_a'), 'carol@example.org', 'lecteur', 'trésorière');
insert into public.invitations (organization_id, email, role) values (tests.v('org_a'), 'dave@example.org', 'administrateur');
select tests.ok((select email from public.invitations where role = 'editeur') = 'bob@example.org', 'e-mail d''invitation normalisé (minuscules, sans espaces)');
select tests.ok((select invited_by from public.invitations where role = 'editeur') = tests.uid('alice'), 'invited_by forcé à l''utilisateur connecté');
select tests.put('inv_bob', (select id from public.invitations where email = 'bob@example.org'));
select tests.put('inv_carol', (select id from public.invitations where email = 'carol@example.org'));
select tests.put('inv_dave', (select id from public.invitations where email = 'dave@example.org'));

select tests.login('bob');
select tests.ok(tests.n('select * from public.my_invitations()') = 1, 'bob voit son invitation (avec le nom de l''organisation)');
select tests.ok(tests.n('select 1 from public.invitations') = 1, 'bob ne voit que l''invitation adressée à son e-mail');
select tests.throws(format('select public.accept_invitation(%L)', tests.v('inv_carol')), 'PT404', 'bob ne peut pas accepter l''invitation de carol');
select tests.ok(public.accept_invitation(tests.v('inv_bob'), 'Bob') = tests.v('org_a'), 'bob accepte son invitation');
select tests.throws(format('select public.accept_invitation(%L)', tests.v('inv_bob')), 'PT410', 'une invitation ne sert qu''une fois');
select tests.ok((select role from public.memberships where user_id = tests.uid('bob')) = 'editeur', 'bob est éditeur de A');
select tests.login('carol');
select public.accept_invitation(tests.v('inv_carol'), 'Carol');
select tests.ok((select function_label from public.memberships where user_id = tests.uid('carol')) = 'trésorière', 'carol est lectrice, fonction libre « trésorière » sans effet sur les droits');
select tests.login('dave');
select public.accept_invitation(tests.v('inv_dave'), 'Dave');
select tests.throws($$insert into public.invitations (organization_id, email, role) values (tests.v('org_a'), 'x@example.org', 'proprietaire')$$, '42501', 'un administrateur ne peut pas inviter un propriétaire');
select tests.login('carol');
select tests.throws($$insert into public.invitations (organization_id, email, role) values (tests.v('org_a'), 'x@example.org', 'lecteur')$$, '42501', 'une lectrice ne peut pas inviter');
select tests.login('bob');
select tests.throws($$insert into public.invitations (organization_id, email, role) values (tests.v('org_a'), 'x@example.org', 'lecteur')$$, '42501', 'un éditeur ne peut pas inviter');
select tests.throws($$insert into public.memberships (organization_id, user_id, role, display_name) values (tests.v('org_a'), tests.uid('hugo'), 'proprietaire', 'Hugo')$$, '42501', 'personne ne s''ajoute directement à une organisation (pas d''INSERT sur memberships)');

select tests.login('erin');
select tests.put('org_b', public.create_organization('Club B'));
insert into public.invitations (organization_id, email, role) values (tests.v('org_b'), 'gina@example.org', 'editeur');
select tests.login('gina');
select public.accept_invitation((select id from public.my_invitations() limit 1), 'Gina');
select tests.login('frank');
select tests.put('org_c', public.create_organization('Solo C'));
select tests.login('hugo');
select tests.ok(tests.n('select 1 from public.organizations') = 0 and tests.n('select 1 from public.memberships') = 0, 'un compte sans organisation ne voit aucune organisation');

-- =============================================================================
select tests.section('2. Isolation stricte entre organisations');
-- =============================================================================
select tests.login('bob');
select tests.put('evt_a', gen_random_uuid());
insert into public.events (id, organization_id, slug, name) values (tests.v('evt_a'), tests.v('org_a'), 'la-grille-3x3', 'LA GRILLE 3x3');
select tests.put('va1', gen_random_uuid());
insert into public.event_versions (id, organization_id, event_id, version, status, config)
  values (tests.v('va1'), tests.v('org_a'), tests.v('evt_a'), '0.1.0', 'draft', tests.cfg('la-grille-3x3', '0.1.0', 'draft', 'LA GRILLE 3x3'));
select tests.ok((select created_by from public.events where id = tests.v('evt_a')) = tests.uid('bob'), 'created_by forcé à l''auteur connecté');
select tests.login('gina');
select tests.put('evt_b', gen_random_uuid());
insert into public.events (id, organization_id, slug, name) values (tests.v('evt_b'), tests.v('org_b'), 'tournoi-b', 'Tournoi B');
select tests.put('vb1', gen_random_uuid());
insert into public.event_versions (id, organization_id, event_id, version, status, config)
  values (tests.v('vb1'), tests.v('org_b'), tests.v('evt_b'), '0.1.0', 'draft', tests.cfg('tournoi-b', '0.1.0', 'draft', 'Tournoi B'));

select tests.login('alice');
select tests.ok(tests.n($$select 1 from public.organizations where id = tests.v('org_b')$$) = 0, 'A ne voit pas l''organisation B');
select tests.ok(tests.n($$select 1 from public.memberships where organization_id = tests.v('org_b')$$) = 0, 'A ne voit pas les membres de B');
select tests.ok(tests.n($$select 1 from public.events where organization_id = tests.v('org_b')$$) = 0, 'A ne voit pas les événements de B');
select tests.ok(tests.n($$select 1 from public.event_versions where organization_id = tests.v('org_b')$$) = 0, 'A ne voit pas les versions de B');
select tests.ok(tests.n($$select 1 from public.invitations where organization_id = tests.v('org_b')$$) = 0, 'A ne voit pas les invitations de B');
select tests.ok(tests.n($$select 1 from public.audit_log where organization_id = tests.v('org_b')$$) = 0, 'A ne voit pas le journal d''audit de B');
select tests.ok(tests.n($$select 1 from public.event_version_status_history where organization_id = tests.v('org_b')$$) = 0, 'A ne voit pas l''historique de statut de B');
select tests.ok(tests.affected($$update public.organizations set name = 'piratée' where id = tests.v('org_b')$$) = 0, 'A ne peut pas renommer B (0 ligne)');
select tests.ok(tests.affected($$update public.events set name = 'piraté' where id = tests.v('evt_b')$$) = 0, 'A ne peut pas modifier un événement de B (0 ligne)');
select tests.ok(tests.affected($$update public.event_versions set config = config || '{"x":1}' where id = tests.v('vb1')$$) = 0, 'A ne peut pas modifier une version de B (0 ligne)');
select tests.ok(tests.affected($$delete from public.event_versions where id = tests.v('vb1')$$) = 0, 'A ne peut pas supprimer une version de B (0 ligne)');
select tests.ok(tests.affected($$delete from public.memberships where organization_id = tests.v('org_b')$$) = 0, 'A ne peut pas retirer les membres de B (0 ligne)');
select tests.ok(tests.affected($$delete from public.events where id = tests.v('evt_b')$$) = 0, 'A ne peut pas supprimer un événement de B (0 ligne)');
select tests.throws($$insert into public.events (organization_id, slug, name) values (tests.v('org_b'), 'intrus', 'Intrus')$$, '42501', 'A ne peut pas créer d''événement dans B');
select tests.throws($$insert into public.event_versions (organization_id, event_id, version, status, config) values (tests.v('org_b'), tests.v('evt_b'), '9.9.9', 'draft', tests.cfg('tournoi-b', '9.9.9'))$$, '42501|PT400', 'A ne peut pas ajouter de version à un événement de B');
select tests.throws($$insert into public.event_versions (organization_id, event_id, version, status, config) values (tests.v('org_a'), tests.v('evt_b'), '9.9.9', 'draft', tests.cfg('tournoi-b', '9.9.9'))$$, '23503|PT400|42501', 'A ne peut pas rattacher une version de A à un événement de B');
select tests.throws($$insert into public.invitations (organization_id, email, role) values (tests.v('org_b'), 'alice2@example.org', 'administrateur')$$, '42501', 'A ne peut pas s''inviter dans B');
select tests.throws($$insert into public.audit_log (organization_id, action, target) values (tests.v('org_b'), 'client.export', 'x')$$, '42501', 'A ne peut pas écrire dans le journal de B');
select tests.login('erin');
select tests.ok((select name from public.events where id = tests.v('evt_b')) = 'Tournoi B' and tests.n($$select 1 from public.event_versions where id = tests.v('vb1')$$) = 1, 'les données de B sont intactes');

-- =============================================================================
select tests.section('3. Lecteur : lecture seule');
-- =============================================================================
select tests.login('carol');
select tests.ok(tests.n('select 1 from public.event_versions') = 1 and tests.n('select 1 from public.events') = 1, 'carol lit les événements et versions de A');
select tests.throws($$insert into public.events (organization_id, slug, name) values (tests.v('org_a'), 'autre', 'Autre')$$, '42501', 'carol ne peut pas créer d''événement');
select tests.throws($$insert into public.event_versions (organization_id, event_id, version, status, config) values (tests.v('org_a'), tests.v('evt_a'), '0.9.0', 'draft', tests.cfg('la-grille-3x3', '0.9.0'))$$, '42501', 'carol ne peut pas créer de version');
select tests.ok(tests.affected($$update public.event_versions set config = config || '{"note":"x"}', row_version = row_version where id = tests.v('va1')$$) = 0, 'carol ne peut pas modifier un brouillon (0 ligne)');
select tests.ok(tests.affected($$update public.event_versions set status = 'review', config = tests.with_status(config, 'review') where id = tests.v('va1')$$) = 0, 'carol ne peut pas soumettre un brouillon (0 ligne)');
select tests.ok(tests.affected($$delete from public.event_versions where id = tests.v('va1')$$) = 0, 'carol ne peut pas supprimer un brouillon (0 ligne)');
select tests.ok(tests.affected($$delete from public.events where id = tests.v('evt_a')$$) = 0, 'carol ne peut pas supprimer un événement (0 ligne)');
select tests.ok(tests.affected($$update public.organizations set name = 'x' where id = tests.v('org_a')$$) = 0, 'carol ne peut pas renommer l''organisation (0 ligne)');
select tests.ok(tests.affected($$delete from public.memberships where user_id = tests.uid('bob')$$) = 0, 'carol ne peut pas retirer un membre (0 ligne)');
select tests.throws($$update public.memberships set role = 'administrateur' where user_id = tests.uid('carol')$$, '42501', 'carol ne peut pas s''attribuer un rôle');
select tests.ok(tests.affected($$update public.memberships set display_name = 'Carole' where user_id = tests.uid('carol')$$) = 1, 'carol peut modifier son propre nom affiché');
select tests.login('dave');
select tests.ok((select row_version from tests.version_row(tests.v('va1'))) = 1 and (select status from tests.version_row(tests.v('va1'))) = 'draft', 'le brouillon est intact après les tentatives de la lectrice');

-- =============================================================================
select tests.section('4. Éditeur : brouillons oui, validation non');
-- =============================================================================
select tests.login('bob');
select tests.ok(tests.affected($$update public.event_versions set config = jsonb_set(config, '{identity,tagline}', '"modifié"'), row_version = 1 where id = tests.v('va1')$$) = 1, 'bob modifie son brouillon (row_version lue = 1)');
select tests.ok((select row_version from tests.version_row(tests.v('va1'))) = 2, 'row_version incrémentée à 2');
select tests.throws($$update public.event_versions set status = 'validated', config = tests.with_status(config, 'validated'), row_version = 2 where id = tests.v('va1')$$, '42501|PT400', 'bob ne peut pas valider directement un brouillon');
select tests.throws($$insert into public.event_versions (organization_id, event_id, version, status, config) values (tests.v('org_a'), tests.v('evt_a'), '0.5.0', 'validated', tests.cfg('la-grille-3x3', '0.5.0', 'validated'))$$, '42501', 'bob ne peut pas créer une version déjà validée');
select tests.ok(tests.affected($$update public.event_versions set status = 'review', config = tests.with_status(config, 'review'), row_version = 2 where id = tests.v('va1')$$) = 1, 'bob soumet son brouillon en revue');
select tests.ok(tests.affected($$update public.event_versions set status = 'validated', config = tests.with_status(config, 'validated'), row_version = 3 where id = tests.v('va1')$$) = 0, 'bob ne peut pas approuver une version en revue (0 ligne)');
select tests.ok(tests.affected($$update public.event_versions set status = 'draft', config = tests.with_status(config, 'draft'), row_version = 3 where id = tests.v('va1')$$) = 0, 'bob ne peut pas renvoyer en brouillon (réservé à l''administrateur)');
select tests.ok(tests.affected($$update public.event_versions set config = jsonb_set(config, '{identity,tagline}', '"en revue"'), row_version = 3 where id = tests.v('va1')$$) = 0, 'bob ne peut plus modifier une version en revue');
select tests.ok(tests.affected($$delete from public.event_versions where id = tests.v('va1')$$) = 0, 'bob ne peut pas supprimer une version en revue');
select tests.ok(tests.affected($$update public.memberships set role = 'administrateur' where user_id = tests.uid('carol')$$) = 0, 'bob ne peut pas changer le rôle d''un autre membre');
select tests.login('dave');
select tests.ok((select status from tests.version_row(tests.v('va1'))) = 'review', 'la version est toujours en revue');

-- =============================================================================
select tests.section('5. Administrateur : validation et gestion des membres');
-- =============================================================================
select tests.login('dave');
select tests.throws($$update public.event_versions set status = 'validated', config = jsonb_set(tests.with_status(config, 'validated'), '{identity,tagline}', '"glissé"'), row_version = 3 where id = tests.v('va1')$$, 'PT400', 'le contenu ne change pas pendant une transition');
select tests.ok(tests.affected($$update public.event_versions set status = 'validated', config = tests.with_status(config, 'validated'), row_version = 3 where id = tests.v('va1')$$) = 1, 'dave (administrateur) approuve la version');
select tests.ok((select validated_by from tests.version_row(tests.v('va1'))) = tests.uid('dave') and (select validated_at from tests.version_row(tests.v('va1'))) is not null, 'validated_by et validated_at renseignés par le serveur');
select tests.ok(tests.n($$select 1 from public.event_version_status_history where version_id = tests.v('va1')$$) = 3, 'historique de statut : création, soumission, validation');
select tests.ok(tests.n($$select 1 from public.audit_log where action = 'version.approve' and actor = tests.uid('dave')$$) = 1, 'journal d''audit : approbation tracée avec son auteur');
select tests.ok(tests.affected($$update public.memberships set role = 'editeur' where user_id = tests.uid('carol')$$) = 1, 'dave promeut carol éditrice');
select tests.throws($$update public.memberships set role = 'proprietaire' where user_id = tests.uid('carol')$$, '42501', 'dave ne peut pas nommer de propriétaire');
select tests.throws($$update public.memberships set role = 'lecteur' where user_id = tests.uid('alice')$$, '42501', 'dave ne peut pas rétrograder la propriétaire');
select tests.throws($$delete from public.memberships where user_id = tests.uid('alice')$$, '42501', 'dave ne peut pas retirer la propriétaire');
select tests.ok(tests.affected($$update public.memberships set role = 'lecteur' where user_id = tests.uid('carol')$$) = 1, 'dave rétablit carol lectrice');

-- =============================================================================
select tests.section('6. Version validée : immuable, même pour la propriétaire');
-- =============================================================================
select tests.login('alice');
select tests.throws($$update public.event_versions set config = jsonb_set(config, '{identity,tagline}', '"réécrit"'), row_version = 4 where id = tests.v('va1')$$, 'PT423', 'la propriétaire ne peut pas modifier le contenu d''une version validée');
select tests.throws($$update public.event_versions set status = 'draft', config = tests.with_status(config, 'draft'), row_version = 4 where id = tests.v('va1')$$, 'PT423', 'une version validée ne redevient pas brouillon');
select tests.throws($$update public.event_versions set config = jsonb_set(config, '{history,0,author}', '"falsifié"'), row_version = 4 where id = tests.v('va1')$$, 'PT423', 'l''historique d''une version validée ne se réécrit pas');
select tests.ok(tests.affected($$delete from public.event_versions where id = tests.v('va1')$$) = 0, 'la propriétaire ne peut pas supprimer une version validée (exclue par RLS)');
select tests.throws($$delete from public.events where id = tests.v('evt_a')$$, 'PT423', 'supprimer l''événement est refusé tant qu''il contient une version validée');
select tests.login('bob');
select tests.throws($$delete from public.events where id = tests.v('evt_a')$$, '42501', 'un éditeur ne supprime pas un événement qui contient une version figée');
select tests.as_service();
select tests.throws($$update public.event_versions set config = config || '{"x":1}', row_version = 4 where id = tests.v('va1')$$, 'PT423', 'même le rôle de service ne modifie pas une version validée');
select tests.throws($$delete from public.event_versions where id = tests.v('va1')$$, 'PT423', 'même le rôle de service ne supprime pas une version validée');
select tests.as_dba();
select tests.throws($$delete from public.event_versions where id = tests.v('va1')$$, 'PT423', 'même l''administrateur de la base ne supprime pas une version validée (déclencheur)');
select tests.login('alice');
select tests.throws($$insert into private.purge_requests (organization_id, xact) values (tests.v('org_a'), txid_current())$$, '42501', 'un client ne peut pas déclencher une purge (table privée)');
select tests.throws(format('select private.purge_organization(%L)', tests.v('org_a')), '42501', 'un client ne peut pas appeler la purge');
select tests.ok(tests.affected($$update public.event_versions set status = 'archived', config = tests.with_status(config, 'archived'), row_version = 4 where id = tests.v('va1')$$) = 1, 'archivage autorisé (statut seul, contenu identique, historique prolongé)');
select tests.throws($$update public.event_versions set status = 'validated', config = tests.with_status(config, 'validated'), row_version = 5 where id = tests.v('va1')$$, 'PT423', 'une version archivée est figée');
select tests.login('bob');
select tests.put('va2', gen_random_uuid());
insert into public.event_versions (id, organization_id, event_id, version, status, config)
  values (tests.v('va2'), tests.v('org_a'), tests.v('evt_a'), '0.2.0', 'draft', tests.cfg('la-grille-3x3', '0.2.0') || '{"parent":{"id":"la-grille-3x3","version":"0.1.0","relation":"new_version"}}');
select tests.ok((select parent_version from tests.version_row(tests.v('va2'))) = '0.1.0', 'la bonne voie : nouvelle version brouillon 0.2.0 avec filiation vers 0.1.0');
select tests.throws($$insert into public.event_versions (organization_id, event_id, version, status, config) values (tests.v('org_a'), tests.v('evt_a'), '0.2.0', 'draft', tests.cfg('la-grille-3x3', '0.2.0'))$$, '23505', 'deux versions ne partagent pas le même numéro');
select tests.throws($$insert into public.event_versions (organization_id, event_id, version, status, config) values (tests.v('org_a'), tests.v('evt_a'), '0.3.0', 'draft', tests.cfg('autre-slug', '0.3.0'))$$, 'PT400', 'config.id doit être le slug de l''événement');
select tests.throws($$insert into public.event_versions (organization_id, event_id, version, status, config) values (tests.v('org_a'), tests.v('evt_a'), '0.3.0', 'draft', tests.cfg('la-grille-3x3', '0.4.0'))$$, '23514', 'config.version doit être le numéro de la version');

-- =============================================================================
select tests.section('7. Concurrence optimiste (row_version)');
-- =============================================================================
select tests.login('bob');
select tests.ok(tests.affected($$update public.event_versions set config = jsonb_set(config, '{identity,tagline}', '"poste 1"'), row_version = 1 where id = tests.v('va2')$$) = 1, 'poste 1 enregistre avec row_version 1');
select tests.throws($$update public.event_versions set config = jsonb_set(config, '{identity,tagline}', '"poste 2"'), row_version = 1 where id = tests.v('va2')$$, 'PT409', 'poste 2 avec row_version périmée (1 au lieu de 2) : refus');
select tests.ok((select config #>> '{identity,tagline}' from tests.version_row(tests.v('va2'))) = 'poste 1', 'la modification du poste 1 est conservée');
select tests.login('alice');
select tests.throws($$update public.organizations set name = 'Bask''Est 2', row_version = 99 where id = tests.v('org_a')$$, 'PT409', 'organisation : row_version périmée refusée');
select tests.throws($$update public.events set name = 'X', row_version = 99 where id = tests.v('evt_a')$$, 'PT409', 'événement : row_version périmée refusée');
select tests.throws($$update public.memberships set display_name = 'X', row_version = 99 where user_id = tests.uid('alice')$$, 'PT409', 'appartenance : row_version périmée refusée');
select tests.ok(tests.affected($$update public.organizations set city = 'Nancy', row_version = 1 where id = tests.v('org_a')$$) = 1, 'organisation : row_version correcte acceptée');

-- =============================================================================
select tests.section('8. Journal d''audit : ajout seul');
-- =============================================================================
select tests.login('carol');
select tests.ok(tests.n('select 1 from public.audit_log') > 5, 'le journal de A est lisible par ses membres');
insert into public.audit_log (organization_id, action, target, details) values (tests.v('org_a'), 'client.export', 'event_version:la-grille-3x3@0.1.0', '{"format":"json"}');
select tests.ok((select actor from public.audit_log where action = 'client.export') = tests.uid('carol'), 'ajout d''une action client.* ; auteur forcé par le serveur');
select tests.throws($$insert into public.audit_log (organization_id, action, target) values (tests.v('org_a'), 'version.approve', 'faux')$$, '42501', 'un client ne peut pas forger une action serveur');
select tests.throws($$insert into public.audit_log (organization_id, actor, action, target) values (tests.v('org_a'), tests.uid('alice'), 'client.export', 'x')$$, '42501', 'un client ne peut pas choisir l''auteur');
select tests.throws($$update public.audit_log set target = 'effacé'$$, '42501', 'un client ne peut pas modifier le journal');
select tests.throws($$delete from public.audit_log$$, '42501', 'un client ne peut pas supprimer le journal');
select tests.as_service();
select tests.throws($$update public.audit_log set target = 'effacé'$$, '42501', 'le rôle de service ne peut pas modifier le journal');
select tests.throws($$delete from public.audit_log$$, '42501', 'le rôle de service ne peut pas supprimer le journal');
select tests.as_dba();
select tests.throws($$update public.audit_log set target = 'effacé'$$, 'PT423', 'même l''administrateur de la base ne modifie pas le journal (déclencheur)');
select tests.throws($$delete from public.audit_log$$, 'PT423', 'même l''administrateur de la base ne supprime pas le journal (déclencheur)');
select tests.throws($$truncate public.audit_log$$, 'PT423', 'le journal ne peut pas être vidé');
select tests.throws($$update public.event_version_status_history set to_status = 'draft'$$, 'PT423', 'l''historique de statut est en ajout seul');

-- =============================================================================
select tests.section('9. Visiteur anonyme (anon) : rien');
-- =============================================================================
select tests.as_anon();
select tests.throws(format('select * from public.%I', t), '42501', format('anon ne lit pas %s', t))
  from unnest(array['organizations', 'memberships', 'invitations', 'events', 'event_versions', 'event_version_status_history', 'audit_log', 'kb_building_blocks', 'kb_errors', 'kb_watch_sources', 'kb_watch_entries', 'kb_portfolio_concepts']) as t;
select tests.throws($$select public.create_organization('anonyme')$$, '42501', 'anon ne crée pas d''organisation');
select tests.throws($$select * from public.my_invitations()$$, '42501', 'anon n''appelle pas les fonctions du compte');
select tests.throws($$select public.delete_my_account('SUPPRIMER')$$, '42501', 'anon ne supprime aucun compte');

-- =============================================================================
select tests.section('10. Connaissances partagées : lecture seule');
-- =============================================================================
select tests.login('hugo');
select tests.ok(tests.n('select 1 from public.kb_building_blocks') = 70, 'tout utilisateur connecté lit les 70 briques');
select tests.ok(tests.n('select 1 from public.kb_errors') = 28, '28 erreurs du registre');
select tests.ok(tests.n('select 1 from public.kb_watch_sources') = 70, '70 sources de veille');
select tests.ok(tests.n('select 1 from public.kb_portfolio_concepts') = 10, '10 concepts du portefeuille');
select tests.ok((select score from public.kb_portfolio_concepts where id = 'la-joute') = 77, 'score dérivé du JSON (la-joute : 77)');
select tests.throws($$insert into public.kb_building_blocks (id, type, name, data) values ('B-pirate', 'regles', 'x', '{"id":"B-pirate"}')$$, '42501', 'ajout de brique refusé');
select tests.throws($$update public.kb_errors set title = 'x'$$, '42501', 'modification du registre des erreurs refusée');
select tests.throws($$delete from public.kb_watch_sources$$, '42501', 'suppression de sources refusée');
select tests.throws($$update public.kb_portfolio_concepts set name = 'x'$$, '42501', 'modification du portefeuille refusée');
select tests.as_service();
select tests.ok(tests.affected($$update public.kb_errors set title = title where id = 'E-001'$$) = 1, 'le rôle de service peut écrire les connaissances');

-- =============================================================================
select tests.section('11. Contrôles du catalogue');
-- =============================================================================
select tests.as_dba();
select tests.ok(not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity), 'RLS activée sur toutes les tables du schéma public');
select tests.ok(not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm') and (has_table_privilege('anon', c.oid, 'select') or has_table_privilege('anon', c.oid, 'insert') or has_table_privilege('anon', c.oid, 'update') or has_table_privilege('anon', c.oid, 'delete'))), 'aucun droit d''anon sur les tables du schéma public');
select tests.ok(not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')), 'anon n''exécute aucune fonction du schéma public');
select tests.ok(not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('public', 'private') and p.prosecdef and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%')), 'chaque fonction SECURITY DEFINER fixe son search_path');
select tests.ok(not has_function_privilege('authenticated', 'private.purge_organization(uuid)', 'execute'), 'la purge d''organisation n''est pas exécutable par un client');

-- =============================================================================
select tests.section('12. Suppression de son propre compte');
-- =============================================================================
-- Organisation D d'alice avec une version validée, supprimée par sa propriétaire
select tests.login('alice');
select tests.put('org_d', public.create_organization('Org D'));
select tests.put('evt_d', gen_random_uuid());
insert into public.events (id, organization_id, slug, name) values (tests.v('evt_d'), tests.v('org_d'), 'evt-d', 'Evt D');
insert into public.event_versions (organization_id, event_id, version, status, config) values (tests.v('org_d'), tests.v('evt_d'), '1.0.0', 'validated', tests.cfg('evt-d', '1.0.0', 'validated'));
select tests.login('dave');
select tests.throws(format('select public.delete_organization(%L, %L)', tests.v('org_a'), 'Bask''Est'), '42501', 'un administrateur ne supprime pas l''organisation');
select tests.login('alice');
select tests.throws(format('select public.delete_organization(%L, %L)', tests.v('org_d'), 'mauvais nom'), 'PT400', 'suppression d''organisation : confirmation par le nom exact');
select public.delete_organization(tests.v('org_d'), 'Org D');
select tests.as_dba();
select tests.ok(not exists (select 1 from public.organizations where id = tests.v('org_d')) and not exists (select 1 from public.event_versions where organization_id = tests.v('org_d')) and not exists (select 1 from public.audit_log where organization_id = tests.v('org_d')), 'la propriétaire supprime son organisation D et toutes ses données (version validée comprise)');

-- Seule propriétaire d'une organisation qui a d'autres membres : refus
select tests.login('erin');
select tests.ok((select outcome from public.account_deletion_preview() where organization_id = tests.v('org_b')) = 'bloquant', 'bilan avant suppression : B bloque (seule propriétaire, d''autres membres)');
select tests.throws($$select public.delete_my_account('oui')$$, 'PT400', 'confirmation « SUPPRIMER » exigée');
select tests.throws($$select public.delete_my_account('SUPPRIMER')$$, 'PT409', 'erin, seule propriétaire de B avec d''autres membres : suppression refusée');
select tests.as_dba();
select tests.ok(exists (select 1 from auth.users where id = tests.uid('erin')), 'le compte d''erin existe toujours');
select tests.login('erin');
select tests.throws($$delete from public.memberships where user_id = tests.uid('erin')$$, 'PT409', 'la dernière propriétaire ne peut pas quitter son organisation');
select tests.throws($$update public.memberships set role = 'editeur' where user_id = tests.uid('erin')$$, 'PT409', 'la dernière propriétaire ne peut pas abandonner son rôle');
select tests.ok(tests.affected($$update public.memberships set role = 'proprietaire' where user_id = tests.uid('gina')$$) = 1, 'erin nomme gina propriétaire');
select tests.ok((select outcome from public.account_deletion_preview() where organization_id = tests.v('org_b')) = 'adhesion_retiree', 'bilan : son adhésion à B sera seulement retirée');
select public.delete_my_account('SUPPRIMER');
select tests.as_dba();
select tests.ok(not exists (select 1 from auth.users where id = tests.uid('erin')) and not exists (select 1 from public.memberships where user_id = tests.uid('erin')), 'le compte et les adhésions d''erin sont supprimés');
select tests.ok(exists (select 1 from public.organizations where id = tests.v('org_b')) and exists (select 1 from public.event_versions where id = tests.v('vb1')), 'l''organisation B et ses données restent, gina en est propriétaire');
select tests.ok(exists (select 1 from public.audit_log where action = 'account.delete' and actor = tests.uid('erin')), 'suppression du compte tracée (identifiant seul)');

-- Membre non propriétaire : son adhésion part, ses contributions restent à l'organisation
select tests.login('bob');
select public.delete_my_account('SUPPRIMER');
select tests.as_dba();
select tests.ok(not exists (select 1 from auth.users where id = tests.uid('bob')), 'bob (éditeur) supprime son compte');
select tests.ok((select created_by from public.event_versions where id = tests.v('va1')) = tests.uid('bob') and (select status from public.event_versions where id = tests.v('va1')) = 'archived', 'la version figée créée par bob reste intacte (identifiant conservé, pseudonyme)');

-- Seul membre : l'organisation et toutes ses données partent avec le compte
select tests.login('frank');
select tests.put('evt_c', gen_random_uuid());
insert into public.events (id, organization_id, slug, name) values (tests.v('evt_c'), tests.v('org_c'), 'solo', 'Solo');
insert into public.event_versions (organization_id, event_id, version, status, config) values (tests.v('org_c'), tests.v('evt_c'), '1.0.0', 'validated', tests.cfg('solo', '1.0.0', 'validated'));
select tests.ok((select outcome from public.account_deletion_preview() where organization_id = tests.v('org_c')) = 'organisation_supprimee', 'bilan : C (seul membre) sera supprimée');
select public.delete_my_account('SUPPRIMER');
select tests.as_dba();
select tests.ok(not exists (select 1 from auth.users where id = tests.uid('frank')), 'le compte de frank est supprimé');
select tests.ok(not exists (select 1 from public.organizations where id = tests.v('org_c')) and not exists (select 1 from public.events where organization_id = tests.v('org_c')) and not exists (select 1 from public.event_versions where organization_id = tests.v('org_c')) and not exists (select 1 from public.audit_log where organization_id = tests.v('org_c')) and not exists (select 1 from public.event_version_status_history where organization_id = tests.v('org_c')), 'C et toutes ses données (version validée, journal) sont supprimées');
select tests.ok(exists (select 1 from public.organizations where id = tests.v('org_a')), 'l''organisation A n''est pas touchée');
