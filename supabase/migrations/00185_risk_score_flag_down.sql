-- 00185 — DOWN : retire le flag risk_score_impact (les overrides cascade via FK).
delete from public.feature_flags where slug = 'risk_score_impact';
