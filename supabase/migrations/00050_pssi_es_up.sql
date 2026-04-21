-- Migration: PSSI-ES (UP)
-- Description: Ajout de l'Instruction présidentielle N° 003/PR du 03/01/2017
-- Source : Commission Nationale de Cryptologie — Présidence de la République du Sénégal

INSERT INTO public.regulatory_catalog (short_name, name, type, jurisdiction, applicable_sectors, description, key_obligations, penalties, authority, impact)
VALUES (
  'PSSI-ES',
  'Instruction présidentielle N° 003/PR relative à la Politique de Sécurité des Systèmes d''Information de l''État du Sénégal (PSSI-ES)',
  'reglementaire',
  'Sénégal',
  '{"Administration publique", "Défense", "Tous"}',
  'Instruction présidentielle signée le 03 janvier 2017 par la Commission Nationale de Cryptologie. Elle fixe les principes et les règles de sécurité applicables à tous les systèmes d''information des entités de l''État (Ministères, Institutions, Organismes nationaux, Directions générales, Services déconcentrés, Autorités administratives). Structurée en 8 articles et une annexe de 11 chapitres (30 objectifs, 150+ règles), elle couvre l''organisation, la sécurité du personnel, l''acquisition/développement, la gestion des actifs, les fournisseurs, la sécurité physique, la sécurité logique, l''exploitation, le cloud/mobile/télétravail, la gestion des incidents et l''audit/conformité.',
  '[
    {"obligation": "Mettre en place une organisation de sécurité à 3 niveaux : décisionnel (Ministre/HFD), pilotage (Comité de sécurité/AQSSI), opérationnel (ASSI)", "article": "Art. 4 / Chap. I — Obj. 1, REG 1-1 à 1-6"},
    {"obligation": "Nommer des AQSSI (Autorités Qualifiées pour la Sécurité des SI) et des ASSI (Agents de Sécurité des SI) dans chaque entité", "article": "Art. 4 / Chap. I — REG 1-4"},
    {"obligation": "Habiliter le personnel accédant aux informations sensibles : enquêtes de sécurité et de moralité, charte de confidentialité signée", "article": "Chap. II — Obj. 2, REG 2-3"},
    {"obligation": "Informer les agents de leurs responsabilités SSI dès l''embauche et prévoir les sanctions en cas de violation", "article": "Chap. II — Obj. 2, REG 2-1, 2-4"},
    {"obligation": "Sensibiliser et former régulièrement tout le personnel à la sécurité SI via un programme adapté par catégorie", "article": "Chap. II — Obj. 4, REG 4-1 à 4-6"},
    {"obligation": "Gérer les droits d''accès en cas de mouvement de personnel (arrivée, mutation, départ)", "article": "Chap. II — Obj. 3, REG 3-1"},
    {"obligation": "Intégrer la sécurité dès l''acquisition de nouveaux systèmes et le développement de logiciels (cycle de vie sécurisé)", "article": "Chap. III — Obj. 5, REG 5-1 à 5-4"},
    {"obligation": "Inventorier les actifs, les classifier selon leur sensibilité et les affecter à des responsables désignés", "article": "Chap. IV — Obj. 6, REG 6-1 à 6-5"},
    {"obligation": "Protéger les supports d''information amovibles contre la divulgation, la modification ou la destruction", "article": "Chap. IV — REG 6-6, 6-7"},
    {"obligation": "Mettre en place une politique de sécurité fournisseurs : charte, audits des prestations, conformité de la chaîne d''approvisionnement", "article": "Chap. V — Obj. 7, REG 7-1 à 7-9"},
    {"obligation": "Définir des zones sécurisées avec contrôle d''accès physique, registre d''entrée et agent de sécurité", "article": "Chap. VI — Obj. 8, REG 8-1 à 8-8, REG 9-1 à 9-4"},
    {"obligation": "Protéger les matériels : emplacement sécurisé, alimentation redondante, câblage protégé, maintenance tracée", "article": "Chap. VI — Obj. 13, REG 13-1 à 13-16, REG 14-1 à 14-7, REG 15-1 à 15-8"},
    {"obligation": "Appliquer le principe du besoin d''en connaître et d''utiliser : cloisonnement des rôles, revue régulière des droits d''accès", "article": "Chap. VII — Obj. 17, REG 17-1 à 17-6"},
    {"obligation": "Sécuriser les applicatifs : contrôle d''accès, authentification forte pour données classifiées, limitation des connexions non autorisées, mots de passe robustes", "article": "Chap. VII — Obj. 18, REG 18-1 à 18-12"},
    {"obligation": "Sécuriser les échanges réseau : politique d''accès, chiffrement labellisé par la Commission nationale de cryptologie, segmentation des réseaux", "article": "Chap. VII — Obj. 19, REG 19-1 à 19-9-13"},
    {"obligation": "Documenter les procédures d''exploitation, de configuration, de sauvegarde et de redémarrage de chaque système", "article": "Chap. VIII — Obj. 20, REG 20-1 à 20-8"},
    {"obligation": "Gérer les changements via un processus formel d''autorisation avec évaluation d''impact sécurité", "article": "Chap. VIII — Obj. 21, REG 21-1 à 21-8"},
    {"obligation": "Séparer les environnements de développement, de test et d''exploitation", "article": "Chap. VIII — Obj. 22, REG 22-1 à 22-7"},
    {"obligation": "Protéger contre les logiciels malveillants : antivirus sur tous les postes, anti-spams, filtres de contenu, procédures de continuité post-attaque", "article": "Chap. VIII — Obj. 23, REG 23-1 à 23-10"},
    {"obligation": "Sauvegarder périodiquement les données (incrémentielle quotidienne, complète hebdomadaire), chiffrer les sauvegardes sensibles, tester la restauration", "article": "Chap. VIII — Obj. 24, REG 24-1 à 24-8"},
    {"obligation": "Journaliser les événements de sécurité, protéger les journaux contre la falsification, les analyser par des outils automatiques et les vérifier en permanence", "article": "Chap. VIII — Obj. 25, REG 25-1 à 25-7"},
    {"obligation": "Héberger les données sensibles de l''Administration sur le territoire national (sauf dérogation motivée du HFD)", "article": "Chap. IX — Obj. 28, REG 28-2"},
    {"obligation": "Encadrer le cloud, les appareils mobiles et le télétravail : analyse de risques, chiffrement labellisé, politique de contrôle d''accès mobile, effacement à distance", "article": "Chap. IX — Obj. 28, REG 28-1 à 28-10"},
    {"obligation": "Mettre en œuvre des procédures de détection, signalement et réponse aux incidents SSI ; structure d''alerte avec point focal vers ADIE, STCC-SSI, ARTP", "article": "Chap. X — Obj. 29, REG 29-1 à 29-11"},
    {"obligation": "Disposer d''un plan de continuité d''activité, le tester périodiquement et le maintenir à jour", "article": "Chap. X — REG 29-4 à 29-6"},
    {"obligation": "Effectuer des audits de conformité SSI réguliers par des auditeurs compétents ; rapports communiqués à la Commission nationale de cryptologie puis au Président de la République", "article": "Chap. XI — Obj. 30, REG 30-1 à 30-7"},
    {"obligation": "Appliquer les mesures de conformité proposées suite aux audits et en rendre compte", "article": "Chap. XI — REG 30-4"}
  ]',
  'Sanctions administratives et disciplinaires (Code pénal art. 60-64 et 363 ; loi 61-33 du 15 juin 1961 portant statut général des fonctionnaires art. 14). Engagement de la responsabilité personnelle des dirigeants et agents.',
  'Commission Nationale de Cryptologie / Présidence de la République du Sénégal',
  'fort'
)
ON CONFLICT (short_name) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  key_obligations = EXCLUDED.key_obligations,
  penalties = EXCLUDED.penalties,
  authority = EXCLUDED.authority;
