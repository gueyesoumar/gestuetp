-- Migration 00227 (DOWN) — retour à monthly_price_eur (EUR).

update public.plans set monthly_price = round(monthly_price / 655.957);
alter table public.plans rename column monthly_price to monthly_price_eur;
