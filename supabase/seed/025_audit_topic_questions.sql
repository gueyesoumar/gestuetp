-- Seed: Questions-clé par sujet d'audit
-- Phase D de la refonte des Entretiens.
--
-- Chaque sujet du catalogue reçoit 3-5 questions ouvertes que l'auditeur
-- pose en entretien. Servent de canevas pour le PV pré-rempli (interview_schedules.pv_template).

-- ============================================================
-- ISO 27001 v2 — 10 sujets
-- ============================================================

update public.audit_topics set default_questions = '[
  "Comment la politique de sécurité de l''information est-elle formalisée et approuvée ?",
  "À quelle fréquence est-elle revue et qui valide les évolutions ?",
  "Comment les rôles et responsabilités SSI sont-ils définis ?",
  "Comment l''entité s''assure-t-elle de la conformité légale et réglementaire applicable ?",
  "Existe-t-il une revue indépendante du SMSI ? À quelle fréquence ?"
]'::jsonb where id = '20000010-0000-0000-0000-000000000001';

update public.audit_topics set default_questions = '[
  "Comment les accès aux systèmes sont-ils provisionnés et révoqués ?",
  "Le MFA est-il imposé sur les accès distants et les comptes à privilèges ?",
  "Comment sont gérés les comptes administrateurs et techniques ?",
  "Existe-t-il une revue périodique des droits d''accès ? À quelle fréquence ?",
  "Comment les comptes sont-ils désactivés en cas de départ ou mutation ?"
]'::jsonb where id = '20000010-0000-0000-0000-000000000002';

update public.audit_topics set default_questions = '[
  "Comment les exigences de sécurité sont-elles intégrées dans les contrats fournisseurs ?",
  "Comment auditez-vous la conformité de vos prestataires aux exigences SSI ?",
  "Comment gérez-vous les accès des fournisseurs à vos systèmes ?",
  "Avez-vous une cartographie de votre supply chain numérique ?",
  "Comment sont gérés les services cloud (clauses, monitoring, plan de réversibilité) ?"
]'::jsonb where id = '20000010-0000-0000-0000-000000000003';

update public.audit_topics set default_questions = '[
  "Quelle est la procédure de gestion des incidents de sécurité ?",
  "Qui détecte les incidents et comment sont-ils remontés ?",
  "Quelle est votre politique de journalisation et conservation des logs ?",
  "Avez-vous un SOC interne ou externalisé ? Quelle couverture horaire ?",
  "Avez-vous réalisé des exercices de réponse à incident dans les 12 derniers mois ?"
]'::jsonb where id = '20000010-0000-0000-0000-000000000004';

update public.audit_topics set default_questions = '[
  "Disposez-vous d''un PCA et/ou PRA formalisé ?",
  "Quels sont vos RTO et RPO par activité critique ?",
  "Quelle est la fréquence des tests de continuité ?",
  "Comment sont gérées les sauvegardes (politique, fréquence, tests de restauration) ?",
  "Avez-vous une stratégie de redondance pour les SI critiques ?"
]'::jsonb where id = '20000010-0000-0000-0000-000000000005';

update public.audit_topics set default_questions = '[
  "Existe-t-il un programme de sensibilisation SSI ? Cible-t-il tous les profils ?",
  "À quelle fréquence les collaborateurs sont-ils formés/sensibilisés ?",
  "Comment sont gérées les habilitations à l''embauche, mutation, départ ?",
  "Comment est encadré le télétravail ?",
  "Comment sont protégées les données à caractère personnel ?"
]'::jsonb where id = '20000010-0000-0000-0000-000000000006';

update public.audit_topics set default_questions = '[
  "Comment est sécurisé l''accès physique aux locaux sensibles (DC, salle serveurs) ?",
  "Existe-t-il un registre d''accès et un dispositif de surveillance ?",
  "Comment sont protégés les équipements contre les menaces environnementales ?",
  "Quelle est la procédure de mise au rebut des équipements et supports ?",
  "Comment est appliquée la politique bureau propre / écran verrouillé ?"
]'::jsonb where id = '20000010-0000-0000-0000-000000000007';

update public.audit_topics set default_questions = '[
  "Disposez-vous d''un inventaire à jour des actifs informationnels ?",
  "Existe-t-il une classification des informations ? Sur quels niveaux ?",
  "Comment sont gérés les transferts d''information sensibles ?",
  "Avez-vous une solution DLP en place ?",
  "Comment sont protégés les supports amovibles ?"
]'::jsonb where id = '20000010-0000-0000-0000-000000000008';

update public.audit_topics set default_questions = '[
  "Comment est segmenté votre réseau ? Existe-t-il une DMZ ?",
  "Quelle solution antivirus/EDR est déployée et comment est-elle pilotée ?",
  "Quelle est votre politique de gestion des vulnérabilités (scans, patching) ?",
  "Comment sont chiffrées les données au repos et en transit ?",
  "Comment est géré le filtrage Web et les flux sortants ?"
]'::jsonb where id = '20000010-0000-0000-0000-000000000009';

update public.audit_topics set default_questions = '[
  "Quel est votre cycle de développement sécurisé (SSDLC) ?",
  "Quelles sont vos pratiques de revue de code et de tests de sécurité ?",
  "Comment sont séparés les environnements de dev, recette et production ?",
  "Quel est votre processus de gestion des changements en production ?",
  "Comment sont encadrés les développements externalisés ?"
]'::jsonb where id = '20000010-0000-0000-0000-00000000000a';

-- ============================================================
-- PSSI-ES — 11 sujets
-- ============================================================

update public.audit_topics set default_questions = '[
  "Comment est composé le Comité de sécurité (AQSSI) et à quelle fréquence se réunit-il ?",
  "Le RSSI dispose-t-il d''une lettre de mission formelle ?",
  "Comment sont nommés et formés les ASSI sur les sites ?",
  "Existe-t-il une note d''organisation SSI signée par l''autorité de l''entité ?",
  "Comment le RSSI suit-il la mise en place de la PSSI-ES ?"
]'::jsonb where id = '20000017-0000-0000-0000-000000000001';

update public.audit_topics set default_questions = '[
  "Les agents signent-ils une charte de confidentialité à l''embauche ?",
  "Comment se déroulent les enquêtes de sécurité préalables aux habilitations ?",
  "Quelle est la fréquence des actions de sensibilisation SSI ?",
  "Comment sont gérés les départs et changements de poste (révocation des accès) ?",
  "Les agents sont-ils informés des sanctions en cas de violation ?"
]'::jsonb where id = '20000017-0000-0000-0000-000000000002';

update public.audit_topics set default_questions = '[
  "Les exigences de sécurité sont-elles formalisées dans les cahiers des charges ?",
  "Comment se déroulent les tests de sécurité avant mise en production ?",
  "Quelles normes ou standards de développement sécurisé appliquez-vous ?",
  "Comment encadrez-vous les développements externalisés ?",
  "Les locaux de développement sont-ils sécurisés ?"
]'::jsonb where id = '20000017-0000-0000-0000-000000000003';

update public.audit_topics set default_questions = '[
  "Disposez-vous d''un inventaire des actifs SI à jour ?",
  "Chaque actif est-il affecté à un responsable identifié ?",
  "Comment classifiez-vous les informations (TRÈS SECRET / SECRET / CONFIDENTIEL) ?",
  "Comment sont protégés les supports amovibles ?",
  "Quelle est la procédure de mise au rebut sécurisé des matériels ?"
]'::jsonb where id = '20000017-0000-0000-0000-000000000004';

update public.audit_topics set default_questions = '[
  "Comment sont contractualisées les exigences SSI avec les fournisseurs ?",
  "Existe-t-il une charte de sécurité signée par les prestataires ?",
  "Comment vérifiez-vous la conformité de vos fournisseurs ?",
  "Quels audits réalisez-vous sur les prestations externalisées ?",
  "Comment sont pris en compte les sous-traitants ?"
]'::jsonb where id = '20000017-0000-0000-0000-000000000005';

update public.audit_topics set default_questions = '[
  "Comment sont identifiées les zones sécurisées (DC, salles serveurs) ?",
  "Quel est le dispositif de contrôle d''accès physique (badges, registre, agent) ?",
  "Comment sont gérées les autorisations d''accès aux zones sensibles ?",
  "Comment sont protégés les locaux contre les menaces environnementales ?",
  "Une politique de bureau propre est-elle en place ?"
]'::jsonb where id = '20000017-0000-0000-0000-000000000006';

update public.audit_topics set default_questions = '[
  "Comment sont attribués et révoqués les droits d''accès logiques ?",
  "Existe-t-il une politique de mots de passe formalisée ?",
  "Le MFA est-il en place sur les accès sensibles ?",
  "Quels mécanismes de chiffrement sont utilisés (en transit, au repos) ?",
  "Comment sont gérés les comptes à privilèges ?"
]'::jsonb where id = '20000017-0000-0000-0000-000000000007';

update public.audit_topics set default_questions = '[
  "Existe-t-il des procédures d''exploitation documentées ?",
  "Quelle est votre politique de sauvegarde (fréquence, rétention, tests) ?",
  "Quelle solution antivirus/anti-malware est déployée ?",
  "Comment est gérée la journalisation et la conservation des logs ?",
  "Comment sont gérés les changements en production ?"
]'::jsonb where id = '20000017-0000-0000-0000-000000000008';

update public.audit_topics set default_questions = '[
  "Quels services cloud utilisez-vous et pour quels usages ?",
  "Comment sont contractualisées les clauses de sécurité avec les fournisseurs cloud ?",
  "Existe-t-il une politique d''utilisation des appareils mobiles ?",
  "Comment est encadré le télétravail (équipement, accès, formation) ?",
  "Comment sont gérées les données stockées dans le cloud ?"
]'::jsonb where id = '20000017-0000-0000-0000-000000000009';

update public.audit_topics set default_questions = '[
  "Existe-t-il une procédure formalisée de gestion des incidents de sécurité ?",
  "Comment les agents signalent-ils un incident ?",
  "Quel est le délai moyen de détection et traitement ?",
  "Combien d''incidents majeurs avez-vous traités dans les 12 derniers mois ?",
  "Existe-t-il un retour d''expérience capitalisé après chaque incident ?"
]'::jsonb where id = '20000017-0000-0000-0000-00000000000a';

update public.audit_topics set default_questions = '[
  "À quelle fréquence sont réalisés des audits internes de conformité PSSI-ES ?",
  "Quels indicateurs SSI suivez-vous au comité de direction ?",
  "Comment est piloté le plan d''actions correctives suite aux audits ?",
  "Avez-vous déjà fait l''objet d''un audit externe (ARTP, ADIE, STCC-SSI) ?",
  "Comment êtes-vous informé des évolutions réglementaires SSI ?"
]'::jsonb where id = '20000017-0000-0000-0000-00000000000b';
