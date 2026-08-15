-- 00192 — rollback

delete from public.feature_flags where slug = 'policy_score_impact';
