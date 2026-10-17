-- 00332 - Gëstu Risk : réaligner l'autorité des directives sur le résolveur unifié.
--
-- M1 (audit) : can_supervise_org (00316) était resté missions-only, jamais réaligné
-- après 00327 (graphe + affectations + mode régulateur). Conséquences : (a) un membre
-- régulateur sur une mission Comply mais SANS affectation pouvait émettre/vérifier des
-- directives et lire preuves/provenance (contournait D3) ; (b) un régulateur graphe-only
-- (sans mission Comply) ne pouvait pas utiliser la boucle directives. On dérive
-- can_supervise_org du MÊME socle que les lectures (get_my_supervised_org_ids), qui
-- porte déjà les gardes is_aal2 + not client + graphe + affectations + missions.
create or replace function public.can_supervise_org(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_org in (select public.get_my_supervised_org_ids());
$$;
revoke all on function public.can_supervise_org(uuid) from public;
grant execute on function public.can_supervise_org(uuid) to authenticated;

-- F1 (audit) : add_directive_evidence doit imposer que le chemin soit sous le préfixe
-- risk-directives/<action>/ pour éviter des références de preuve trompeuses/orphelines.
create or replace function public.add_directive_evidence(p_action uuid, p_path text, p_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_id uuid;
begin
  select organization_id into v_org from public.risk_treatment_actions
    where id = p_action and origin = 'supervisor_directive';
  if v_org is null then raise exception 'not found'; end if;
  if not public.is_client_role() or v_org not in (select public.get_my_portal_org_ids()) then
    raise exception 'not authorized';
  end if;
  if p_path not like ('risk-directives/' || p_action::text || '/%') then
    raise exception 'invalid path';
  end if;
  insert into public.risk_directive_evidence (action_id, file_path, file_name, uploaded_by)
  values (p_action, p_path, p_name, public.get_my_user_id())
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.add_directive_evidence(uuid, text, text) from public;
grant execute on function public.add_directive_evidence(uuid, text, text) to authenticated;
