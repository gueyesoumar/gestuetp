-- 00192 — Gëstu Policy (RFC 0005) : flag d'activation de l'impact score.
--
-- Off par défaut (mode « shadow ») : la contribution de Policy (gouvernance, facteur
-- humain, vérifiabilité) est calculée et affichée mais ne pèse PAS sur le composite
-- tant que le super-admin n'active pas le flag pour l'org (feature_flag_overrides).

insert into public.feature_flags (slug, name, description, is_globally_enabled)
values (
  'policy_score_impact',
  'Impact Gëstu Policy sur le score',
  'Active la prise en compte de la gouvernance documentaire (couverture des politiques requises, taux d''adoption, application effective) dans le score de confiance de l''organisation. Désactivé = mode shadow (calculé et affiché, sans effet sur le composite).',
  false
)
on conflict (slug) do nothing;
