-- 00283 — Dépendances inter-contrôles (NIST, propagation des constats).
with pairs(src, tgt, rel) as (values
    ('GV.OC', 'GV.RM', 'related'),
    ('GV.OC', 'GV.SC', 'related'),
    ('GV.RM', 'ID.RA', 'related'),
    ('GV.PO', 'GV.RM', 'related'),
    ('GV.OV', 'GV.RM', 'related'),
    ('GV.SC', 'ID.RA', 'related'),
    ('GV.SC', 'ID.AM', 'related'),
    ('GV.SC', 'PR.PS', 'related'),
    ('ID.AM', 'ID.RA', 'related'),
    ('ID.IM', 'ID.RA', 'related'),
    ('GV.PO', 'GV.RR', 'related'),
    ('GV.PO', 'PR.AA', 'related'),
    ('GV.PO', 'PR.DS', 'related'),
    ('GV.PO', 'PR.AT', 'related'),
    ('GV.OV', 'GV.RR', 'related'),
    ('GV.OV', 'ID.IM', 'related'),
    ('GV.RR', 'PR.AT', 'related'),
    ('PR.AA', 'PR.DS', 'related'),
    ('PR.AA', 'PR.PS', 'related'),
    ('DE.CM', 'PR.AA', 'related'),
    ('ID.AM', 'PR.DS', 'related'),
    ('PR.DS', 'PR.IR', 'related'),
    ('PR.DS', 'RC.RP', 'related'),
    ('ID.IM', 'RS.AN', 'related'),
    ('ID.IM', 'RC.RP', 'related'),
    ('ID.AM', 'PR.PS', 'related'),
    ('DE.CM', 'ID.AM', 'related'),
    ('PR.IR', 'PR.PS', 'related'),
    ('DE.AE', 'DE.CM', 'related'),
    ('RS.AN', 'RS.MA', 'partial'),
    ('DE.AE', 'RS.AN', 'related'),
    ('RS.AN', 'RS.MI', 'related'),
    ('RC.CO', 'RC.RP', 'partial'),
    ('PR.IR', 'RC.RP', 'related'),
    ('RC.RP', 'RS.MI', 'related'),
    ('RC.RP', 'RS.MA', 'related'),
    ('DE.AE', 'RS.MA', 'related'),
    ('RS.CO', 'RS.MA', 'partial'),
    ('RS.MA', 'RS.MI', 'partial'),
    ('RC.CO', 'RS.CO', 'related')
)
insert into public.control_mappings (source_control_id, target_control_id, relationship)
select cs.id, ct.id, p.rel from pairs p
join public.controls cs on cs.code = p.src and cs.domain_id in (select id from public.domains where framework_id = '00000000-0000-0000-0000-000000000011')
join public.controls ct on ct.code = p.tgt and ct.domain_id in (select id from public.domains where framework_id = '00000000-0000-0000-0000-000000000011')
on conflict (source_control_id, target_control_id) do nothing;
