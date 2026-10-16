-- 00329 (DOWN) - retrait des modèles de scénarios.
drop function if exists public.get_scenario_template_nodes(uuid);
drop function if exists public.get_scenario_templates();
drop function if exists public.get_my_supervisor_org_ids();
drop table if exists public.risk_scenario_template_nodes;
drop table if exists public.risk_scenario_templates;
