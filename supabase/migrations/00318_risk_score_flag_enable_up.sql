-- 00318 - Gëstu Risk / RFC 0017 (D4) : sortie du mode shadow du score de risque.
--
-- Lève le KILL SWITCH GLOBAL du flag risk_score_impact. Cela rend le flag
-- ACTIVABLE par org, mais ne change AUCUN score en soi : chaque org reste OFF
-- (« available ») tant qu'un override ON (feature_flag_overrides) ou un plan ne
-- l'active pas. Le facteur risk_mastery reste calculé/affiché comme avant ; il ne
-- pèsera sur le composite que pour les orgs explicitement activées. Rollout
-- progressif piloté par le super-admin (admin UI), réversible (down = retour shadow).

update public.feature_flags
  set is_globally_enabled = true
  where slug = 'risk_score_impact';
