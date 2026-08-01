-- Migration 00093: Restaure les accents français sur le seed NIST CSF 2.0 — UP
--
-- Même problème que pour ISO 27001 (cf. 00092) : le seed initial
-- (supabase/seed/005_nist_framework.sql) avait été chargé sans accents
-- (« Strategie », « Proteger », « Detecter », « Repondre », etc.). On
-- restaure les libellés via UPDATE FROM (VALUES …) en filtrant strictement
-- sur framework_id / domain_id pour n'affecter que NIST CSF 2.0.
--
-- Le seed lui-même est mis à jour en parallèle pour les futurs db reset.

-- ============================================================
-- 1. Framework
-- ============================================================
UPDATE public.frameworks
SET description = 'Cadre de cybersécurité du NIST. Organisé en 6 fonctions : Gouverner, Identifier, Protéger, Détecter, Répondre, Rétablir.'
WHERE id = '00000000-0000-0000-0000-000000000011';

-- ============================================================
-- 2. Domaines (6 fonctions)
-- ============================================================
UPDATE public.domains AS d
SET name = v.name, description = v.description
FROM (VALUES
  ('GV', 'Gouverner (Govern)', 'Stratégie de gestion des risques cyber, attentes et politiques'),
  ('ID', 'Identifier (Identify)', 'Compréhension du contexte, des actifs, des risques'),
  ('PR', 'Protéger (Protect)', 'Mesures de protection pour limiter l''impact des menaces'),
  ('DE', 'Détecter (Detect)', 'Détection rapide des événements de cybersécurité'),
  ('RS', 'Répondre (Respond)', 'Actions face à un incident de cybersécurité détecté'),
  ('RC', 'Rétablir (Recover)', 'Restauration des capacités et services après un incident')
) AS v(code, name, description)
WHERE d.framework_id = '00000000-0000-0000-0000-000000000011'
  AND d.code = v.code;

-- ============================================================
-- 3. Contrôles GV — Gouverner (6)
-- ============================================================
UPDATE public.controls AS c
SET name = v.name, description = v.description
FROM (VALUES
  ('GV.OC', 'Contexte organisationnel', 'Compréhension du contexte de l''organisation pour la gestion des risques cyber'),
  ('GV.RM', 'Stratégie de gestion des risques', 'Priorités, contraintes, tolérance au risque, appétence'),
  ('GV.RR', 'Rôles, responsabilités et autorités', 'Rôles et responsabilités en cybersécurité établis et communiqués'),
  ('GV.PO', 'Politiques', 'Politiques de cybersécurité établies, communiquées et appliquées'),
  ('GV.OV', 'Supervision', 'Supervision de la stratégie de cybersécurité'),
  ('GV.SC', 'Gestion de la chaîne d''approvisionnement cyber', 'Risques de la supply chain identifiés et gérés')
) AS v(code, name, description)
WHERE c.code = v.code
  AND c.domain_id = '00000000-0000-0000-0002-000000000001';

-- ============================================================
-- 4. Contrôles ID — Identifier (3)
-- ============================================================
UPDATE public.controls AS c
SET name = v.name, description = v.description
FROM (VALUES
  ('ID.AM', 'Gestion des actifs', 'Inventaire des actifs (matériels, logiciels, données, systèmes)'),
  ('ID.RA', 'Évaluation des risques', 'Risques identifiés, analysés et priorisés'),
  ('ID.IM', 'Amélioration', 'Améliorations identifiées à partir des évaluations et exercices')
) AS v(code, name, description)
WHERE c.code = v.code
  AND c.domain_id = '00000000-0000-0000-0002-000000000002';

-- ============================================================
-- 5. Contrôles PR — Protéger (5)
-- ============================================================
UPDATE public.controls AS c
SET name = v.name, description = v.description
FROM (VALUES
  ('PR.AA', 'Gestion des identités, authentification et accès', 'Accès aux actifs limité aux utilisateurs, services et matériels autorisés'),
  ('PR.AT', 'Sensibilisation et formation', 'Personnel formé et sensibilisé à la cybersécurité'),
  ('PR.DS', 'Sécurité des données', 'Données gérées conformément à la stratégie de risques'),
  ('PR.PS', 'Sécurité des plateformes', 'Sécurité des plateformes matérielles, logicielles et services'),
  ('PR.IR', 'Résilience de l''infrastructure technologique', 'Architectures de sécurité pour protéger les actifs')
) AS v(code, name, description)
WHERE c.code = v.code
  AND c.domain_id = '00000000-0000-0000-0002-000000000003';

-- ============================================================
-- 6. Contrôles DE — Détecter (2)
-- ============================================================
UPDATE public.controls AS c
SET name = v.name, description = v.description
FROM (VALUES
  ('DE.CM', 'Surveillance continue', 'Actifs surveillés pour identifier anomalies et indicateurs de compromission'),
  ('DE.AE', 'Analyse des événements', 'Anomalies, indicateurs de compromission et autres événements analysés')
) AS v(code, name, description)
WHERE c.code = v.code
  AND c.domain_id = '00000000-0000-0000-0002-000000000004';

-- ============================================================
-- 7. Contrôles RS — Répondre (4)
-- ============================================================
UPDATE public.controls AS c
SET name = v.name, description = v.description
FROM (VALUES
  ('RS.MA', 'Gestion des incidents', 'Réponses aux incidents gérés et coordonnés'),
  ('RS.AN', 'Analyse des incidents', 'Investigations pour assurer une réponse efficace et support forensique'),
  ('RS.CO', 'Communication des incidents', 'Activités de réponse coordonnées avec les parties prenantes'),
  ('RS.MI', 'Atténuation des incidents', 'Activités pour prévenir l''expansion et atténuer les effets')
) AS v(code, name, description)
WHERE c.code = v.code
  AND c.domain_id = '00000000-0000-0000-0002-000000000005';

-- ============================================================
-- 8. Contrôles RC — Rétablir (2)
-- ============================================================
UPDATE public.controls AS c
SET name = v.name, description = v.description
FROM (VALUES
  ('RC.RP', 'Exécution du plan de rétablissement', 'Activités de restauration pour assurer la disponibilité'),
  ('RC.CO', 'Communication du rétablissement', 'Activités de restauration coordonnées avec les parties prenantes')
) AS v(code, name, description)
WHERE c.code = v.code
  AND c.domain_id = '00000000-0000-0000-0002-000000000006';

-- ============================================================
-- 9. Notes des correspondances ISO 27001 ↔ NIST CSF 2.0
--    (matchées sur la valeur initiale pour ne toucher que les rows seedées)
-- ============================================================
UPDATE public.control_mappings AS cm
SET notes = v.new_notes
FROM (VALUES
  ('Politiques de securite de l''information', 'Politiques de sécurité de l''information'),
  ('Definition des roles et responsabilites securite', 'Définition des rôles et responsabilités sécurité'),
  ('Classification ISO plus granulaire que securite des donnees NIST', 'Classification ISO plus granulaire que sécurité des données NIST'),
  ('ISO decoupe le controle d''acces en 4 controles, NIST regroupe', 'ISO découpe le contrôle d''accès en 4 contrôles, NIST regroupe'),
  ('ISO plus detaille sur les relations fournisseurs', 'ISO plus détaillé sur les relations fournisseurs'),
  ('Planification et gestion des incidents de securite', 'Planification et gestion des incidents de sécurité'),
  ('Continuite d''activite et retablissement', 'Continuité d''activité et rétablissement'),
  ('Mecanismes de signalement et communication d''incidents', 'Mécanismes de signalement et communication d''incidents'),
  ('Authentification est un sous-ensemble de la gestion des identites NIST', 'Authentification est un sous-ensemble de la gestion des identités NIST'),
  ('Vulnerabilites techniques contribuent a l''evaluation des risques', 'Vulnérabilités techniques contribuent à l''évaluation des risques'),
  ('Journalisation et surveillance des activites', 'Journalisation et surveillance des activités'),
  ('Sauvegarde est un element de la resilience infrastructure', 'Sauvegarde est un élément de la résilience infrastructure')
) AS v(old_notes, new_notes)
WHERE cm.notes = v.old_notes;
