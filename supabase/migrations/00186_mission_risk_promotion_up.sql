-- 00186 — Promotion d'un mission_risk (Comply/Regul) vers le registre Gëstu Risk
-- de l'ORGANISATION AUDITÉE (missions.client_id).
--
-- Logique produit : une organisation auditée devient cliente de Gëstu et gère
-- ensuite ses risques dans Gëstu Risk. La promotion pré-amorce SON registre pendant
-- l'audit. Écriture cross-tenant : l'auditeur (cabinet = get_my_organization_id())
-- ne peut PAS écrire dans le registre de l'audité sous la RLS org-scoped de
-- risk_scenarios → SECURITY DEFINER, avec gardes :
--   - AAL2 (cohérent avec les policies RESTRICTIVE de Gëstu Risk),
--   - appartenance à l'équipe de la mission (get_my_mission_ids), staff only,
--   - idempotence : une seule promotion par mission_risk (garde source_risk_id).
-- Cloisonnement strict : après promotion, le scénario appartient à l'audité ; le
-- cabinet ne conserve que l'indicateur « Promu » (promoted_at, visible côté cabinet).

alter table public.mission_risks
  add column if not exists promoted_at timestamptz;
comment on column public.mission_risks.promoted_at is
  'Horodatage de promotion vers le registre Gëstu Risk de l''organisation auditée (null = non promu).';

create or replace function public.promote_mission_risk(
  p_mission_risk_id uuid,
  p_dimension public.score_dimension,
  p_likelihood int,
  p_impact int,
  p_vulnerability text default null,
  p_threat_ref uuid default null,
  p_feared_event_ref uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mission_id uuid;
  v_client_id uuid;
  v_title text;
  v_description text;
  v_existing uuid;
  v_new_id uuid;
begin
  -- Garde AAL2 (le reste de Gëstu Risk l'exige via des policies RESTRICTIVE).
  if not public.is_aal2() then
    raise exception 'AAL2 requis';
  end if;

  -- Cotation 4×4 valide.
  if p_likelihood is null or p_impact is null
     or p_likelihood < 1 or p_likelihood > 4 or p_impact < 1 or p_impact > 4 then
    raise exception 'cotation invalide';
  end if;

  -- Charger le mission_risk + l'organisation auditée (client_id) de sa mission.
  select mr.mission_id, mr.title, mr.description, m.client_id
    into v_mission_id, v_title, v_description, v_client_id
  from public.mission_risks mr
  join public.missions m on m.id = mr.mission_id
  where mr.id = p_mission_risk_id;

  if v_mission_id is null then
    raise exception 'mission_risk introuvable';
  end if;

  -- Autorisation : l'appelant doit être membre de l'équipe de la mission (staff).
  if v_mission_id not in (select public.get_my_mission_ids()) then
    raise exception 'non autorisé';
  end if;

  -- Idempotence : une seule promotion par mission_risk.
  select id into v_existing
  from public.risk_scenarios
  where source_risk_id = p_mission_risk_id
  limit 1;
  if v_existing is not null then
    update public.mission_risks set promoted_at = coalesce(promoted_at, now())
      where id = p_mission_risk_id;
    return v_existing;
  end if;

  -- Insertion dans le registre de l'ORGANISATION AUDITÉE (org_id dérivé serveur,
  -- jamais transmis par le client). created_by = null : cloisonnement strict (la
  -- provenance passe par source_mission_id / source_risk_id).
  insert into public.risk_scenarios (
    organization_id, title, description, dimension,
    threat_ref, feared_event_ref, vulnerability,
    inherent_likelihood, inherent_impact,
    source_mission_id, source_risk_id, created_by
  ) values (
    v_client_id, v_title, v_description, p_dimension,
    p_threat_ref, p_feared_event_ref, p_vulnerability,
    p_likelihood, p_impact,
    v_mission_id, p_mission_risk_id, null
  ) returning id into v_new_id;

  update public.mission_risks set promoted_at = now() where id = p_mission_risk_id;

  return v_new_id;
end;
$$;

revoke all on function public.promote_mission_risk(uuid, public.score_dimension, int, int, text, uuid, uuid) from public;
grant execute on function public.promote_mission_risk(uuid, public.score_dimension, int, int, text, uuid, uuid) to authenticated;
