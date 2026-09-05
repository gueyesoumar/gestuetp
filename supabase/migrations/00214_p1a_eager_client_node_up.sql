-- Migration 00214 (UP) — P1a (RFC 0007) : éagérisation de la « partie auditée ».
-- Backfill idempotent : matérialise les fiches cabinet_clients encore orphelines
-- (client_org_id NULL, jamais lancées en mission) en organisations-nœuds, puis
-- pose l'arête audit_engagement pour TOUTES les fiches. Aucune modification de
-- schéma, aucune policy touchée. Purement additif.
--
-- Coordination : la matérialisation paresseuse de create-mission reste en place
-- (filet de sécurité, retirée en P1c) et le trigger sync_mission_engagement_edge
-- (00213) réutilise l'arête via on conflict do nothing — aucun doublon possible
-- (index unique uq_org_rel_active).

-- 1) Matérialisation des fiches orphelines.
--    Garde dure (risque n°1) : un numéro d'immatriculation VIDE ne déclenche
--    JAMAIS de déduplication → nouveau nœud, pour éviter toute fusion inter-tenant.
do $$
declare
  r record;
  v_org uuid;
  v_slug text;
begin
  for r in
    select * from public.cabinet_clients where client_org_id is null
  loop
    v_org := null;

    if r.client_registration_number is not null
       and btrim(r.client_registration_number) <> '' then
      select id into v_org
      from public.organizations
      where types @> array['client']
        and registration_number = btrim(r.client_registration_number)
      limit 1;
    end if;

    if v_org is null then
      v_slug := regexp_replace(
        lower(coalesce(nullif(btrim(r.client_name), ''), 'client')),
        '[^a-z0-9]+', '-', 'g'
      );
      v_slug := btrim(v_slug, '-')
              || '-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS')
              || '-' || substr(md5(random()::text), 1, 6);

      insert into public.organizations
        (name, slug, types, registration_number, sector, address, city, country, website, phone)
      values (
        coalesce(nullif(btrim(r.client_name), ''), 'Client'),
        v_slug,
        array['client'],
        nullif(btrim(coalesce(r.client_registration_number, '')), ''),
        r.client_sector,
        r.client_address,
        r.client_city,
        r.client_country,
        r.client_website,
        r.client_phone
      )
      returning id into v_org;
    end if;

    update public.cabinet_clients set client_org_id = v_org where id = r.id;
  end loop;
end $$;

-- 2) Arête audit_engagement pour TOUTES les fiches (idempotent).
insert into public.organization_relationships (actor_org_id, target_org_id, nature, status)
select distinct cc.cabinet_id, cc.client_org_id, 'audit_engagement', 'active'
from public.cabinet_clients cc
where cc.client_org_id is not null
  and cc.cabinet_id <> cc.client_org_id
  and not exists (
    select 1 from public.organization_relationships r
    where r.actor_org_id = cc.cabinet_id
      and r.target_org_id = cc.client_org_id
      and r.nature = 'audit_engagement'
      and r.status = 'active'
  );
