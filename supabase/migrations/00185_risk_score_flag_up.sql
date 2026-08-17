-- 00185 — Gëstu Risk (RFC 0004) : flag d'activation de l'impact score.
--
-- Off par défaut (mode « shadow ») : le facteur risk_mastery est calculé et affiché
-- (radar résiduel, simulateur) mais ne pèse PAS sur le composite tant que le
-- super-admin n'active pas le flag pour l'org (feature_flag_overrides).

insert into public.feature_flags (slug, name, description, is_globally_enabled)
values (
  'risk_score_impact',
  'Impact Gëstu Risk sur le score',
  'Active la prise en compte du facteur risk_mastery (résiduel du registre de risques) dans le score de confiance de l''organisation. Désactivé = mode shadow (calculé et affiché, sans effet sur le composite).',
  false
)
on conflict (slug) do nothing;
