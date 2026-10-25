-- Migration: 00357_report_templates_down
-- Rollback : supprime la table report_templates et retire la permission des roles.

drop table if exists public.report_templates cascade;

update public.platform_roles
set permissions = permissions - 'can_manage_report_templates'
where permissions ? 'can_manage_report_templates';
