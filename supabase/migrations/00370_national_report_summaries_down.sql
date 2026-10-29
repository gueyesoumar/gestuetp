-- 00370 (DOWN) - rollback RFC 0024 Lot 1 (agrégats rapport national).
drop function if exists public.get_national_regul_summary(date, date);
drop function if exists public.get_national_risk_summary(date, date);

update public.platform_roles
set permissions = permissions - 'can_generate_national_report'
where permissions ? 'can_generate_national_report';
