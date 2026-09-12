-- Migration 00239 (UP) — bac à sable : isolation du registre de risques.
--
-- Le registre de risques (risk_scenarios) est rattaché à l'organisation RÉELLE du
-- cabinet (organization_id) et n'avait pas de marqueur de démo. Pour peupler le
-- Risk d'un bac à sable SANS polluer le registre réel — et pour qu'il alimente le
-- score/radar sous la « lentille » — on ajoute is_demo + demo_owner_id, à l'image
-- de missions/cabinet_clients (migration 00235).
--
-- Sécurité : is_demo n'est PAS une frontière de sécurité (RLS org-scoped
-- inchangée). Les lectures « réelles » (registre, score) filtrent is_demo=false ;
-- la lentille inclut les scénarios dont demo_owner_id = l'utilisateur courant.
-- Les barrières (risk_control_links) n'ont pas besoin du marqueur : elles
-- cascadent avec leur scénario et ne sont rattachées au score que via un scénario
-- inclus. is_demo par défaut = false → les données existantes restent « réelles ».

alter table public.risk_scenarios
  add column if not exists is_demo boolean not null default false,
  add column if not exists demo_owner_id uuid references public.users(id) on delete cascade;

create index if not exists idx_rs_demo
  on public.risk_scenarios(demo_owner_id) where is_demo = true;
