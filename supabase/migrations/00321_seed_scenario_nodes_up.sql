-- 00321 - Gëstu Risk / RFC 0017 (G2) : amorçage auto des causes/conséquences.
-- À la création d'un scénario (saisie directe OU promotion promote_finding /
-- promote_mission_risk), crée une node « cause » depuis threat_ref et une node
-- « conséquence » depuis feared_event_ref, pour que l'éditeur Causes & conséquences
-- arrive pré-rempli et cohérent avec le nœud papillon. L'analyste enrichit ensuite.

create or replace function public.risk_scenario_seed_nodes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if NEW.threat_ref is not null then
    insert into public.risk_scenario_nodes (organization_id, risk_scenario_id, node_type, label, catalog_ref, created_by)
    values (NEW.organization_id, NEW.id, 'cause',
      coalesce((select label from public.risk_catalog where id = NEW.threat_ref), 'Menace'),
      NEW.threat_ref, NEW.created_by);
  end if;
  if NEW.feared_event_ref is not null then
    insert into public.risk_scenario_nodes (organization_id, risk_scenario_id, node_type, label, catalog_ref, created_by)
    values (NEW.organization_id, NEW.id, 'consequence',
      coalesce((select label from public.risk_catalog where id = NEW.feared_event_ref), 'Événement redouté'),
      NEW.feared_event_ref, NEW.created_by);
  end if;
  return NEW;
end $$;

create trigger trg_rsn_seed
  after insert on public.risk_scenarios
  for each row execute function public.risk_scenario_seed_nodes();
