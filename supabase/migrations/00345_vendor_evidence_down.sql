-- 00345 (DOWN) : retire les preuves fournisseur + restaure can_access_document_object (00328).
drop function if exists public.delete_vendor_evidence(uuid);
drop function if exists public.get_vendor_evidence(uuid);
drop function if exists public.add_vendor_evidence(uuid, uuid, text, text);

create or replace function public.can_access_document_object(object_name text)
returns boolean language sql stable set search_path = public as $$
  select (
    (storage.foldername(object_name))[1] = 'missions'
    and (
      exists (select 1 from public.get_my_mission_ids() gm where gm::text = (storage.foldername(object_name))[2])
      or exists (select 1 from public.get_my_client_mission_ids() cm where cm::text = (storage.foldername(object_name))[2])
      or public.is_platform_owner()
    )
  ) or (
    (storage.foldername(object_name))[1] = 'risk-directives'
    and public.can_access_risk_directive_file((storage.foldername(object_name))[2])
  );
$$;

drop function if exists public.can_access_vendor_evidence_file(text);
drop table if exists public.vendor_evidence;
