-- Rollback 00270 — retire les starters PSSI-ES (bibliothèque, checklist, crosswalk).

-- Sous-ensemble des contrôles PSSI-ES.
-- (1) Bibliothèque : retire les constats-types plateforme rattachés à des contrôles PSSI-ES.
delete from public.finding_templates ft
where ft.scope = 'platform'
  and ft.control_id in (
    select c.id from public.controls c
    where c.domain_id in (select id from public.domains where framework_id = '00000000-0000-0000-0000-000000000017')
  );

-- (3) Crosswalk : retire les paires intra-PSSI-ES (les deux contrôles dans le framework 017).
delete from public.control_mappings cm
using public.controls cs, public.controls ct
where cm.source_control_id = cs.id and cm.target_control_id = ct.id
  and cs.domain_id in (select id from public.domains where framework_id = '00000000-0000-0000-0000-000000000017')
  and ct.domain_id in (select id from public.domains where framework_id = '00000000-0000-0000-0000-000000000017');

-- (2) Checklist : réinitialise audit_checklist des contrôles seedés par 00270.
update public.controls c
set audit_checklist = '[]'::jsonb
where c.code in ('REG 17-5','REG 18-7','REG 18-4','REG 25-4','REG 25-6','REG 24-1','REG 24-7','REG 23-1','REG 8-2','REG 6-1','REG 19-8','REG 29-6')
  and c.domain_id in (select id from public.domains where framework_id = '00000000-0000-0000-0000-000000000017');
