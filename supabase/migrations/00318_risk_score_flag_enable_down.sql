-- Rollback 00318 : retour en mode shadow (kill switch global baissé).
-- Baisser le kill switch neutralise aussi tout override ON existant (le flag
-- redevient OFF partout), donc plus aucune org n'applique le facteur risque.
update public.feature_flags
  set is_globally_enabled = false
  where slug = 'risk_score_impact';
