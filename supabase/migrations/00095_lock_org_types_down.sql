-- Migration 00095: Verrou trigger sur organizations.types — DOWN

DROP TRIGGER IF EXISTS trg_organizations_lock_types ON public.organizations;
DROP FUNCTION IF EXISTS public.prevent_org_types_change_by_user();
