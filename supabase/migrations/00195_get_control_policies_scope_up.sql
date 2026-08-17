-- 00195 — Durcissement need-to-know de get_control_policies (audit sécu F2).
--
-- Avant : être membre d'UNE mission chez le client ouvrait ses politiques pour
-- N'IMPORTE quel control_id. Après : l'accès cross-tenant n'est accordé que si le
-- contrôle interrogé appartient au RÉFÉRENTIEL d'une mission active dont je suis
-- membre et dont mon org est le cabinet (control → domain → framework = mission).
-- Moindre privilège, granularité par mission. Le chemin auto-audit (mon org) est
-- inchangé. Strictement plus restrictif qu'en 00194 → aucune sur-exposition.

create or replace function public.get_control_policies(p_control_id uuid)
returns table (policy_id uuid, title text, status text, applied boolean)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.title, p.status::text,
    exists (
      select 1 from public.policy_effectiveness_attestations e
      where e.policy_id = p.id and e.status = 'applied'
    ) as applied
  from public.policy_control_links pcl
  join public.policies p on p.id = pcl.policy_id
  where pcl.control_id = p_control_id
    and public.is_aal2()
    and not public.is_client_role()
    and (
      -- Auto-audit : mes propres politiques (inchangé).
      pcl.organization_id = public.get_my_organization_id()
      -- Cross-tenant : la politique appartient au client d'une mission ACTIVE dont
      -- je suis membre, dont mon org est le cabinet, ET dont le référentiel contient
      -- CE contrôle (need-to-know par mission).
      or exists (
        select 1
        from public.missions m
        join public.mission_members mm on mm.mission_id = m.id
        join public.domains d on d.framework_id = m.framework_id
        join public.controls c on c.domain_id = d.id
        where m.cabinet_id = public.get_my_organization_id()
          and mm.user_id = public.get_my_user_id()
          and m.is_active = true
          and c.id = p_control_id
          and m.client_id = pcl.organization_id
      )
    );
$$;

revoke all on function public.get_control_policies(uuid) from public;
grant execute on function public.get_control_policies(uuid) to authenticated;
