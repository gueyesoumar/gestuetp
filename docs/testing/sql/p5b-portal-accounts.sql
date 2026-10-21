-- Partie 5b : comptes portail CLI (assujetti Douanes) + VEN (candidat fournisseur F).
-- REMPLACE <CLI_UID> et <VEN_UID> (UID Auth de la Partie 1). À lancer APRÈS p5a.
-- Modèle portail : users.role='client' + client_portal_contacts.client_org_id = org du client.
-- (get_my_portal_org_ids lit client_portal_contacts ; is_client_role lit users.role.)
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/testing/sql/p5b-portal-accounts.sql
do $$
declare
  v_douanes uuid := (select id from public.organizations where slug='douanes-test');
  v_four    uuid := (select id from public.organizations where slug='fournisseur-test-f');
  v_cli uuid; v_ven uuid;
begin
  if v_douanes is null or v_four is null then raise exception 'Douanes/Fournisseur introuvables : lance p5a d''abord.'; end if;

  -- CLI : utilisateur role=client rattaché à Douanes (répond aux directives)
  insert into public.users (auth_id,organization_id,email,first_name,last_name,role,is_active)
    values ('<CLI_UID>',v_douanes,'e2e-cli@test.gestugroup.com','E2E','ClientPortail','client',true)
    on conflict (auth_id) do update set role='client', organization_id=v_douanes returning id into v_cli;
  insert into public.client_portal_contacts (client_org_id,user_id,contact_name,email,portal_status)
    values (v_douanes,v_cli,'E2E ClientPortail','e2e-cli@test.gestugroup.com','active')
    on conflict (client_org_id,email) do update set user_id=excluded.user_id, portal_status='active';

  -- VEN : candidat fournisseur role=client rattaché à Fournisseur F (auto-évaluation)
  insert into public.users (auth_id,organization_id,email,first_name,last_name,role,is_active)
    values ('<VEN_UID>',v_four,'e2e-ven@test.gestugroup.com','E2E','CandidatVendor','client',true)
    on conflict (auth_id) do update set role='client', organization_id=v_four returning id into v_ven;
  insert into public.client_portal_contacts (client_org_id,user_id,contact_name,email,portal_status)
    values (v_four,v_ven,'E2E CandidatVendor','e2e-ven@test.gestugroup.com','active')
    on conflict (client_org_id,email) do update set user_id=excluded.user_id, portal_status='active';

  raise notice 'portail ok: cli=% ven=%', v_cli, v_ven;
end $$;
