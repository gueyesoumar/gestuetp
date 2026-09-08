-- Migration 00227 (UP) — plans.monthly_price en FCFA (XOF).
-- La page /admin/plans (plans_v2) était restée en EUR (colonne monthly_price_eur),
-- alors que la RFC 0006 a basculé le reste du catalogue en XOF (00203). On aligne :
-- renommage + conversion des valeurs existantes EUR → FCFA (parité fixe 655,957).

alter table public.plans rename column monthly_price_eur to monthly_price;

-- Conversion des montants (étaient en EUR) → FCFA. Parité fixe UEMOA.
update public.plans set monthly_price = round(monthly_price * 655.957);

comment on column public.plans.monthly_price is
  'Prix mensuel du plan, en FCFA (XOF). Devise de base RFC 0006 (converti depuis EUR par 00227).';
