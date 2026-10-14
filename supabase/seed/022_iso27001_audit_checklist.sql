-- Seed: audit_checklist pour 93 controles ISO 27001:2022 Annex A
-- Format : single UPDATE avec VALUES list (compatible Studio SQL Editor).
-- Apostrophes echappees ('') et caracteres ASCII pour eviter encoding issues.
-- Idempotent : re-runnable a volonte.

update public.controls c
set audit_checklist = m.checklist::jsonb
from (values
  ('A.5.1', '[
{"label": "Vérifier l''existence d''une PSSI documentée et approuvée par la direction", "hint": "Document portant signature ou approbation formelle de la direction", "evidence_type": "document"},
{"label": "Confirmer la date de dernière revue (< 12 mois)", "hint": "Page de garde ou historique de versions", "evidence_type": "document"},
{"label": "Vérifier la diffusion aux collaborateurs", "hint": "Email de diffusion, accusé de lecture, ou page intranet dédiée", "evidence_type": "interview"},
{"label": "S''assurer que la PSSI couvre tous les périmètres techniques (cloud, on-prem)", "hint": "Section périmètre du document", "evidence_type": "document"},
{"label": "Confirmer la cohérence avec les exigences légales et contractuelles", "hint": "Référence aux normes, lois, ou contrats clients applicables", "evidence_type": "document"}
]'),
  ('A.5.2', '[
{"label": "Identifier le responsable de la sécurité (RSSI ou équivalent)", "hint": "Lettre de mission, organigramme ou fiche de poste", "evidence_type": "document"},
{"label": "Vérifier la définition formalisée des rôles SI dans l''organisation", "hint": "Matrice RACI ou tableau d''attribution des responsabilités", "evidence_type": "document"},
{"label": "Confirmer que les responsabilités sont documentées et communiquées", "hint": "Diffusion via fiches de poste ou email officiel", "evidence_type": "interview"},
{"label": "Vérifier l''adéquation des compétences avec les rôles attribués", "hint": "Certifications, formations, expérience documentée", "evidence_type": "document"}
]'),
  ('A.5.3', '[
{"label": "Identifier les fonctions critiques nécessitant séparation (admin/audit, dev/prod, etc.)", "hint": "Cartographie des processus sensibles", "evidence_type": "document"},
{"label": "Vérifier qu''aucune personne ne cumule des rôles incompatibles", "hint": "Matrice des incompatibilités RACI", "evidence_type": "document"},
{"label": "Confirmer la mise en place de contrôles compensatoires si la séparation est impossible", "hint": "Logs d''approbation à 4 yeux, double validation", "evidence_type": "test"},
{"label": "Vérifier la revue périodique des cumuls de fonctions", "hint": "Compte-rendu de revue annuelle des accès", "evidence_type": "document"}
]'),
  ('A.5.4', '[
{"label": "Vérifier l''engagement formel de la direction envers la sécurité SI", "hint": "Lettre d''engagement, charte, ou déclaration de la direction", "evidence_type": "document"},
{"label": "Confirmer l''existence d''un comité de sécurité et sa fréquence de réunion", "hint": "PV ou compte-rendus de COSI/CSSI sur les 12 derniers mois", "evidence_type": "document"},
{"label": "Vérifier l''allocation de ressources budgétaires a la sécurité SI", "hint": "Budget annuel, lignes dédiées sécurité", "evidence_type": "document"},
{"label": "S''assurer du suivi par la direction des indicateurs sécurité", "hint": "Tableau de bord ou KPI présentés en CODIR", "evidence_type": "document"}
]'),
  ('A.5.5', '[
{"label": "Identifier les autorités pertinentes pour l''organisation (CNIL, ANSSI, police, etc.)", "hint": "Liste des contacts d''urgence", "evidence_type": "document"},
{"label": "Vérifier l''existence d''une procédure de signalement aux autorités", "hint": "Procédure de gestion d''incidents avec section autorités", "evidence_type": "document"},
{"label": "Confirmer la documentation des contacts (noms, téléphones, emails)", "hint": "Annuaire contacts d''urgence à jour (< 12 mois)", "evidence_type": "document"},
{"label": "Vérifier les modalités de notification réglementaires (CNIL 72h, etc.)", "hint": "Référence RGPD article 33 dans la procédure", "evidence_type": "document"}
]'),
  ('A.5.6', '[
{"label": "Identifier les groupes d''intérêt sectoriels (CERT, CLUSIF, ISACA, etc.)", "hint": "Adhésions ou abonnements documentés", "evidence_type": "document"},
{"label": "Vérifier les sources de veille sécurité utilisées", "hint": "Bulletins ANSSI, CVE feeds, threat intelligence", "evidence_type": "interview"},
{"label": "Confirmer la diffusion de l''information sécurité en interne", "hint": "Newsletter, mailing-list, alertes diffusées", "evidence_type": "document"}
]'),
  ('A.5.7', '[
{"label": "Vérifier l''existence d''une démarche de threat intelligence", "hint": "Sources externes (CERT, vendor feeds), abonnements", "evidence_type": "document"},
{"label": "Confirmer l''analyse régulière des menaces pertinentes", "hint": "Rapport de threat assessment ou compte-rendu mensuel", "evidence_type": "document"},
{"label": "Vérifier l''intégration des informations dans les processus sécurité", "hint": "Liens vers SIEM, gestion des vulnérabilités, IR", "evidence_type": "test"},
{"label": "S''assurer que la threat intel alimente l''analyse de risques", "hint": "Mises à jour de la cartographie des risques", "evidence_type": "document"}
]'),
  ('A.5.8', '[
{"label": "Vérifier l''intégration de la sécurité dans les phases projet", "hint": "Méthodologie projet (Agile, V) avec checkpoints sécurité", "evidence_type": "document"},
{"label": "Confirmer la réalisation d''analyses de risques en amont des projets", "hint": "Privacy by design, risk assessment initial", "evidence_type": "document"},
{"label": "Vérifier la validation sécurité avant mise en production", "hint": "Go/No-go sécurité documenté dans les comités projet", "evidence_type": "document"},
{"label": "S''assurer de la formation sécurité des chefs de projet", "hint": "Plan de formation, certifications", "evidence_type": "interview"}
]'),
  ('A.5.9', '[
{"label": "Vérifier l''existence d''un inventaire des actifs informationnels", "hint": "Tableau ou base CMDB recensant les actifs", "evidence_type": "document"},
{"label": "Confirmer la mise à jour récente (< 6 mois)", "hint": "Date de dernière mise à jour sur l''inventaire", "evidence_type": "document"},
{"label": "Vérifier l''identification d''un propriétaire pour chaque actif", "hint": "Colonne propriétaire/responsable sur l''inventaire", "evidence_type": "document"},
{"label": "S''assurer que l''inventaire couvre les actifs cloud", "hint": "Présence des ressources Azure/AWS/GCP", "evidence_type": "document"},
{"label": "Confirmer la cohérence avec la classification des données", "hint": "Lien entre actifs et niveaux de classification", "evidence_type": "interview"}
]'),
  ('A.5.10', '[
{"label": "Vérifier l''existence d''une charte d''usage acceptable des actifs", "hint": "Document signé a l''embauche ou consultable en interne", "evidence_type": "document"},
{"label": "Confirmer la diffusion et l''acceptation par les utilisateurs", "hint": "Signatures ou validation électronique", "evidence_type": "document"},
{"label": "Vérifier les règles spécifiques par catégorie d''actif (PC, mobile, USB)", "hint": "Sections dédiées dans la charte", "evidence_type": "document"},
{"label": "S''assurer du processus de revue régulière de la charte", "hint": "Date de dernière revue (< 24 mois)", "evidence_type": "document"}
]'),
  ('A.5.11', '[
{"label": "Vérifier la procédure de restitution des actifs a la sortie", "hint": "Checklist sortie collaborateur (PC, badge, carte SIM, tokens)", "evidence_type": "document"},
{"label": "Confirmer le suivi formel des restitutions", "hint": "Registre signé par RH et IT", "evidence_type": "document"},
{"label": "Vérifier le délai de restitution avant le départ effectif", "hint": "Procédure exigeant restitution avant J-1 ou jour J", "evidence_type": "document"},
{"label": "S''assurer du nettoyage des actifs récupérés (effacement sécurisé)", "hint": "Procédure de wiping documentée", "evidence_type": "test"}
]'),
  ('A.5.12', '[
{"label": "Vérifier l''existence d''un schéma de classification des informations", "hint": "Niveaux: Public/Interne/Confidentiel/Secret ou équivalent", "evidence_type": "document"},
{"label": "Confirmer la classification effective des actifs critiques", "hint": "Inventaire avec colonne classification", "evidence_type": "document"},
{"label": "Vérifier l''adoption par les collaborateurs", "hint": "Tests de classification sur des documents échantillons", "evidence_type": "test"},
{"label": "S''assurer que la classification déclenche les mesures de protection adéquates", "hint": "Politique de chiffrement liée aux niveaux", "evidence_type": "document"}
]'),
  ('A.5.13', '[
{"label": "Vérifier l''existence de règles de marquage des informations", "hint": "Templates de documents avec mention de classification", "evidence_type": "document"},
{"label": "Confirmer le marquage sur des échantillons réels", "hint": "Documents internes (Word, PDF, emails)", "evidence_type": "observation"},
{"label": "Vérifier le marquage des supports physiques", "hint": "Étiquettes sur disques, classeurs, dossiers", "evidence_type": "observation"},
{"label": "S''assurer du marquage automatique dans les outils (DLP, IRM)", "hint": "Configuration Microsoft Information Protection ou équivalent", "evidence_type": "test"}
]'),
  ('A.5.14', '[
{"label": "Vérifier l''existence de règles de transfert d''information", "hint": "Procédure de transfert externe avec niveaux de protection", "evidence_type": "document"},
{"label": "Confirmer le chiffrement des données en transit", "hint": "TLS 1.2+ obligatoire, configuration des serveurs", "evidence_type": "test"},
{"label": "Vérifier l''existence d''accords de transfert avec les tiers", "hint": "DPA, NDA, clauses contractuelles types", "evidence_type": "document"},
{"label": "S''assurer de la traçabilité des transferts sensibles", "hint": "Logs de transfert, audit trail", "evidence_type": "document"}
]'),
  ('A.5.15', '[
{"label": "Vérifier l''existence d''une politique de contrôle d''accès", "hint": "Document définissant les règles d''attribution des droits", "evidence_type": "document"},
{"label": "Confirmer le principe du moindre privilege", "hint": "Documentation et application dans l''IAM", "evidence_type": "document"},
{"label": "Vérifier la revue périodique des accès", "hint": "Recertification des droits (au moins annuelle)", "evidence_type": "document"},
{"label": "S''assurer du processus formel de demande/validation d''accès", "hint": "Workflow ITSM pour création/modification d''accès", "evidence_type": "test"}
]'),
  ('A.5.16', '[
{"label": "Vérifier l''existence d''un référentiel central des identités (IAM)", "hint": "Active Directory, LDAP, IdP cloud", "evidence_type": "document"},
{"label": "Confirmer le processus formel de création/suppression d''identités", "hint": "Workflow lié au cycle de vie RH", "evidence_type": "document"},
{"label": "Vérifier la suppression effective des identités a la sortie", "hint": "Test sur dossiers de départs récents", "evidence_type": "test"},
{"label": "S''assurer de la prévention des doublons d''identités", "hint": "Règles d''unicité dans l''IAM", "evidence_type": "document"}
]'),
  ('A.5.17', '[
{"label": "Vérifier la politique de mots de passe (longueur, complexité, rotation)", "hint": "Conformité aux recommandations ANSSI/NIST", "evidence_type": "document"},
{"label": "Confirmer la mise en place du MFA pour les accès sensibles", "hint": "MFA actif sur admin, distant, cloud", "evidence_type": "test"},
{"label": "Vérifier la sécurisation du stockage des mots de passe", "hint": "Hash bcrypt/argon2, pas de stockage en clair", "evidence_type": "test"},
{"label": "S''assurer du processus de réinitialisation sécurisé", "hint": "Vérification d''identité avant reset", "evidence_type": "document"}
]'),
  ('A.5.18', '[
{"label": "Vérifier le processus formel d''attribution des droits d''accès", "hint": "Demande, validation hiérarchique, traçabilité", "evidence_type": "document"},
{"label": "Confirmer la revue périodique des droits", "hint": "Campagne de recertification documentée", "evidence_type": "document"},
{"label": "Vérifier la révocation rapide a la sortie ou changement de poste", "hint": "Délai cible (< 24h) et test sur cas réels", "evidence_type": "test"},
{"label": "S''assurer de la gestion des comptes privilégiés", "hint": "Vault, PAM, comptes nominatifs", "evidence_type": "test"}
]'),
  ('A.5.19', '[
{"label": "Vérifier l''existence d''une politique de sécurité fournisseurs", "hint": "Document de référence pour la chaîne d''approvisionnement", "evidence_type": "document"},
{"label": "Confirmer la cartographie des fournisseurs SI critiques", "hint": "Liste avec niveau de criticité et risques associés", "evidence_type": "document"},
{"label": "Vérifier l''évaluation préalable des fournisseurs", "hint": "Questionnaire sécurité, due diligence avant contractualisation", "evidence_type": "document"},
{"label": "S''assurer du suivi régulier des fournisseurs en place", "hint": "Compte-rendu d''évaluation annuelle", "evidence_type": "document"}
]'),
  ('A.5.20', '[
{"label": "Vérifier la présence de clauses sécurité dans les contrats fournisseurs", "hint": "Annexe sécurité, DPA, SLA sécurité", "evidence_type": "document"},
{"label": "Confirmer la couverture des principaux risques", "hint": "Audit, droit à l''audit, notification d''incident, sous-traitance", "evidence_type": "document"},
{"label": "Vérifier les exigences de notification d''incident", "hint": "Délai de notification (24-72h typique)", "evidence_type": "document"},
{"label": "S''assurer de la possibilité d''audit du fournisseur", "hint": "Clause d''audit annuel ou sur incident", "evidence_type": "document"}
]'),
  ('A.5.21', '[
{"label": "Vérifier la cartographie de la chaîne ICT", "hint": "Schéma de la supply chain SI (sous-traitants, hébergeurs, éditeurs)", "evidence_type": "document"},
{"label": "Confirmer la gestion des risques fournisseurs en cascade", "hint": "Évaluation des sous-traitants des fournisseurs", "evidence_type": "document"},
{"label": "Vérifier les exigences sur la sécurité des produits/services", "hint": "Standards de codage, certifications produit", "evidence_type": "document"},
{"label": "S''assurer du suivi des vulnérabilités tiers (CVE)", "hint": "Veille sur les composants utilisés", "evidence_type": "document"}
]'),
  ('A.5.22', '[
{"label": "Vérifier le processus de revue régulière des prestations fournisseurs", "hint": "Comité de pilotage périodique avec le fournisseur", "evidence_type": "document"},
{"label": "Confirmer la mesure des SLA et indicateurs sécurité", "hint": "Tableau de bord SLA mensuel/trimestriel", "evidence_type": "document"},
{"label": "Vérifier la gestion des changements impactant les services fournisseurs", "hint": "Comité changement avec impact sécurité évalué", "evidence_type": "document"},
{"label": "S''assurer de la documentation des incidents fournisseurs", "hint": "Registre incidents avec actions correctives", "evidence_type": "document"}
]'),
  ('A.5.23', '[
{"label": "Vérifier l''inventaire des services cloud utilisés", "hint": "CASB, audit cloud, liste documentée", "evidence_type": "document"},
{"label": "Confirmer l''évaluation sécurité de chaque fournisseur cloud", "hint": "Certifications (SOC 2, ISO 27001, HDS)", "evidence_type": "document"},
{"label": "Vérifier les paramètres de sécurité (chiffrement, MFA, IAM)", "hint": "Configuration baseline appliquée", "evidence_type": "test"},
{"label": "S''assurer de la conformité géographique des données", "hint": "Localisation explicite (EU, France, etc.)", "evidence_type": "document"},
{"label": "Vérifier la gestion des accès au shadow IT", "hint": "Détection CASB, sensibilisation", "evidence_type": "test"}
]'),
  ('A.5.24', '[
{"label": "Vérifier l''existence d''un plan de gestion d''incidents documenté", "hint": "Procédure formalisée, processus IR", "evidence_type": "document"},
{"label": "Confirmer la définition des rôles et de la cellule de crise", "hint": "Fiche organisationnelle de l''équipe IR", "evidence_type": "document"},
{"label": "Vérifier l''existence d''arbres de décision et matrices d''escalade", "hint": "Critères de classification de gravité, contacts par niveau", "evidence_type": "document"},
{"label": "S''assurer de l''organisation d''exercices réguliers", "hint": "PV d''exercice de simulation (tabletop, red team)", "evidence_type": "document"}
]'),
  ('A.5.25', '[
{"label": "Vérifier le processus d''évaluation et de qualification des événements", "hint": "Critères pour distinguer événement vs incident", "evidence_type": "document"},
{"label": "Confirmer le rôle du SOC ou équipe sécurité dans la qualification", "hint": "Procédure d''analyse SOC, niveaux N1/N2/N3", "evidence_type": "document"},
{"label": "Vérifier les délais de qualification cibles", "hint": "SLA interne pour qualification (< 1h)", "evidence_type": "document"},
{"label": "S''assurer de la documentation des décisions de qualification", "hint": "Ticketing, journal d''analyse", "evidence_type": "test"}
]'),
  ('A.5.26', '[
{"label": "Vérifier les procédures de réponse par type d''incident", "hint": "Playbooks (ransomware, data leak, DDoS, etc.)", "evidence_type": "document"},
{"label": "Confirmer la disponibilité 24/7 de l''équipe IR", "hint": "Astreinte, contrat MSSP, contacts joignables", "evidence_type": "interview"},
{"label": "Vérifier les outils de réponse (forensic, isolation, communication)", "hint": "EDR avec capacité d''isolation, kit forensic", "evidence_type": "test"},
{"label": "S''assurer de la communication structurée pendant les incidents", "hint": "Templates de communication interne/externe", "evidence_type": "document"}
]'),
  ('A.5.27', '[
{"label": "Vérifier l''existence d''un processus de retour d''expérience post-incident", "hint": "Réunion REX systématique après incident majeur", "evidence_type": "document"},
{"label": "Confirmer la documentation des leçons apprises", "hint": "Rapport d''incident final avec recommandations", "evidence_type": "document"},
{"label": "Vérifier le suivi de la mise en oeuvre des actions correctives", "hint": "Plan d''action issu du REX, tracking dans outil", "evidence_type": "document"},
{"label": "S''assurer de la diffusion des enseignements aux équipes concernées", "hint": "Mise à jour des procédures, formation ciblée", "evidence_type": "interview"}
]'),
  ('A.5.28', '[
{"label": "Vérifier la procédure de collecte de preuves numériques", "hint": "Méthodologie forensic conforme (chain of custody)", "evidence_type": "document"},
{"label": "Confirmer la formation des intervenants a la préservation des preuves", "hint": "Certifications GCFE, GCFA, CHFI ou équivalent", "evidence_type": "document"},
{"label": "Vérifier les outils utilisés (imagers, write-blockers, hash)", "hint": "Inventaire du kit forensic", "evidence_type": "observation"},
{"label": "S''assurer du stockage sécurisé des preuves", "hint": "Coffre, accès restreint, journalisation", "evidence_type": "observation"}
]'),
  ('A.5.29', '[
{"label": "Vérifier l''existence d''un PCA/PRA documenté", "hint": "Plan de continuité d''activité formalisé", "evidence_type": "document"},
{"label": "Confirmer la couverture des scénarios de disruption", "hint": "Cyberattaque, panne majeure, indisponibilité site", "evidence_type": "document"},
{"label": "Vérifier l''identification des activités essentielles et RTO/RPO", "hint": "BIA - Business Impact Analysis avec objectifs de reprise", "evidence_type": "document"},
{"label": "S''assurer de la réalisation d''exercices de continuité", "hint": "PV de test annuel du PCA/PRA", "evidence_type": "document"}
]'),
  ('A.5.30', '[
{"label": "Vérifier la stratégie de continuité ICT", "hint": "Architecture redondante, sites de secours, cloud DR", "evidence_type": "document"},
{"label": "Confirmer la sauvegarde régulière des données critiques", "hint": "Politique de backup, fréquence, rétention", "evidence_type": "document"},
{"label": "Vérifier la testabilité de la restauration", "hint": "Tests de restauration documentés (au moins annuels)", "evidence_type": "test"},
{"label": "S''assurer de l''alignement avec les RTO/RPO du PCA", "hint": "Mise en cohérence avec le BIA", "evidence_type": "document"}
]'),
  ('A.5.31', '[
{"label": "Vérifier l''identification des exigences légales applicables", "hint": "Registre de conformité (RGPD, secteur, PCI-DSS, etc.)", "evidence_type": "document"},
{"label": "Confirmer la mise à jour régulière du registre", "hint": "Date de dernière revue (< 12 mois)", "evidence_type": "document"},
{"label": "Vérifier la traduction en politiques et procédures internes", "hint": "Liens registre vers PSSI, charte, procédures", "evidence_type": "document"},
{"label": "S''assurer de la veille réglementaire", "hint": "Source officielle (ANSSI, CNIL, ENISA)", "evidence_type": "interview"}
]'),
  ('A.5.32', '[
{"label": "Vérifier l''inventaire des logiciels et licences", "hint": "Outil de software asset management (SAM)", "evidence_type": "document"},
{"label": "Confirmer la conformité licences (nb d''installations vs licences acquises)", "hint": "Audit interne SAM annuel", "evidence_type": "document"},
{"label": "Vérifier les processus de protection de la PI interne", "hint": "Marquage des documents propriétaires, NDA", "evidence_type": "document"},
{"label": "S''assurer du respect des licences open-source", "hint": "Inventaire des composants OSS et licences", "evidence_type": "document"}
]'),
  ('A.5.33', '[
{"label": "Vérifier l''identification des enregistrements a protéger légalement", "hint": "Liste des documents soumis a conservation (compta, RH, etc.)", "evidence_type": "document"},
{"label": "Confirmer les durées de conservation par catégorie", "hint": "Politique de rétention conforme aux obligations", "evidence_type": "document"},
{"label": "Vérifier la protection contre l''altération et la perte", "hint": "Stockage sécurisé, intégrité contrôlée", "evidence_type": "test"},
{"label": "S''assurer de la suppression sécurisée a l''issue de la rétention", "hint": "Procédure de purge documentée", "evidence_type": "document"}
]'),
  ('A.5.34', '[
{"label": "Vérifier la conformité RGPD (registre des traitements, DPO si applicable)", "hint": "Registre conforme article 30 RGPD", "evidence_type": "document"},
{"label": "Confirmer l''existence d''analyses d''impact (AIPD/PIA)", "hint": "PIA documentée pour traitements sensibles", "evidence_type": "document"},
{"label": "Vérifier la gestion des droits des personnes", "hint": "Procédure et délais de réponse (1 mois)", "evidence_type": "document"},
{"label": "S''assurer de la sensibilisation des collaborateurs sur la PII", "hint": "Module RGPD dans le plan de formation", "evidence_type": "document"}
]'),
  ('A.5.35', '[
{"label": "Vérifier la planification d''audits internes/externes de sécurité", "hint": "Plan d''audit pluriannuel", "evidence_type": "document"},
{"label": "Confirmer l''indépendance des auditeurs", "hint": "Auditeur tiers ou audit interne hors hiérarchie SI", "evidence_type": "document"},
{"label": "Vérifier le traitement des recommandations d''audits précédents", "hint": "Plan d''action audit avec suivi", "evidence_type": "document"},
{"label": "S''assurer de la communication des résultats a la direction", "hint": "Présentation du rapport d''audit en COSI", "evidence_type": "document"}
]'),
  ('A.5.36', '[
{"label": "Vérifier le contrôle régulier de l''application des politiques SI", "hint": "Audits de conformité internes", "evidence_type": "document"},
{"label": "Confirmer la mesure d''indicateurs de conformité", "hint": "KPI de conformité, % de couverture des contrôles", "evidence_type": "document"},
{"label": "Vérifier le traitement des écarts détectés", "hint": "Plan d''action correctif", "evidence_type": "document"},
{"label": "S''assurer de la prise en compte par les responsables d''unités", "hint": "Reporting de conformité aux responsables", "evidence_type": "interview"}
]'),
  ('A.5.37', '[
{"label": "Vérifier l''existence de procédures opérationnelles documentées", "hint": "Documentation accessible aux opérateurs", "evidence_type": "document"},
{"label": "Confirmer la couverture des opérations critiques", "hint": "Sauvegarde, restauration, gestion des comptes admin", "evidence_type": "document"},
{"label": "Vérifier la mise à jour régulière des procédures", "hint": "Date de revue (< 24 mois)", "evidence_type": "document"},
{"label": "S''assurer de l''adoption effective par les équipes", "hint": "Test sur procédure d''astreinte", "evidence_type": "test"}
]'),
  ('A.6.1', '[
{"label": "Vérifier l''existence d''une procédure de screening pre-embauche", "hint": "Politique RH avec étapes de vérification", "evidence_type": "document"},
{"label": "Confirmer la vérification d''identité et de références", "hint": "Trace dans dossier RH des références contactées", "evidence_type": "document"},
{"label": "Vérifier les contrôles spécifiques pour postes sensibles", "hint": "Extrait casier judiciaire, due diligence renforcée", "evidence_type": "document"},
{"label": "S''assurer de la conformité du processus avec la législation", "hint": "Respect du droit du travail et RGPD sur les données candidat", "evidence_type": "document"}
]'),
  ('A.6.2', '[
{"label": "Vérifier les clauses de confidentialité dans les contrats de travail", "hint": "Article confidentialité, NDA dans le contrat", "evidence_type": "document"},
{"label": "Confirmer l''engagement formel sur les politiques sécurité", "hint": "Signature de la charte SI a l''embauche", "evidence_type": "document"},
{"label": "Vérifier l''information sur les sanctions disciplinaires", "hint": "Référence au règlement intérieur dans le contrat", "evidence_type": "document"},
{"label": "S''assurer de la couverture des obligations post-contrat", "hint": "Clauses de non-divulgation post-emploi", "evidence_type": "document"}
]'),
  ('A.6.3', '[
{"label": "Vérifier l''existence d''un plan de sensibilisation annuel", "hint": "Programme de formation SI avec calendrier", "evidence_type": "document"},
{"label": "Confirmer la réalisation de campagnes (phishing, ransomware, RGPD)", "hint": "Campagnes simulées, taux de clic mesure", "evidence_type": "document"},
{"label": "Vérifier le taux de completion par les collaborateurs", "hint": "Reporting LMS avec % de completion", "evidence_type": "document"},
{"label": "S''assurer de la formation spécifique pour les rôles a risque", "hint": "Modules dédiés admins, dev, juridique", "evidence_type": "document"}
]'),
  ('A.6.4', '[
{"label": "Vérifier l''existence d''un processus disciplinaire documenté", "hint": "Procédure RH référencée au règlement intérieur", "evidence_type": "document"},
{"label": "Confirmer la définition des sanctions par type de violation", "hint": "Échelle de sanctions proportionnée", "evidence_type": "document"},
{"label": "Vérifier l''application effective sur des cas passes", "hint": "Anonymisation: revue de cas traités", "evidence_type": "interview"},
{"label": "S''assurer du respect des droits du salarié dans la procédure", "hint": "Convocation préalable, droit à se faire assister", "evidence_type": "document"}
]'),
  ('A.6.5', '[
{"label": "Vérifier la procédure de fin de contrat ou changement de poste", "hint": "Checklist de sortie / mobilité", "evidence_type": "document"},
{"label": "Confirmer la révocation des accès dans les délais", "hint": "Délai cible (< 24h) + test sur cas réels", "evidence_type": "test"},
{"label": "Vérifier la restitution des actifs et badges", "hint": "Registre signé par RH et IT", "evidence_type": "document"},
{"label": "S''assurer du rappel des obligations post-emploi", "hint": "Lettre de rappel des clauses de confidentialité", "evidence_type": "document"}
]'),
  ('A.6.6', '[
{"label": "Vérifier l''utilisation systématique de NDA pour les tiers", "hint": "Modèle NDA officiel utilisé", "evidence_type": "document"},
{"label": "Confirmer la signature des NDA avant tout échange sensible", "hint": "Process commercial intégrant NDA", "evidence_type": "document"},
{"label": "Vérifier la couverture des collaborateurs internes via charte/contrat", "hint": "Clause de confidentialité dans contrat de travail", "evidence_type": "document"},
{"label": "S''assurer de la durée et portée des NDA", "hint": "Durée post-contrat suffisante (5+ ans)", "evidence_type": "document"}
]'),
  ('A.6.7', '[
{"label": "Vérifier la politique de télétravail incluant les règles sécurité", "hint": "Charte télétravail avec section sécurité", "evidence_type": "document"},
{"label": "Confirmer la mise a disposition d''équipements sécurisés", "hint": "PC chiffrés, VPN obligatoire", "evidence_type": "test"},
{"label": "Vérifier les règles d''usage en environnement personnel", "hint": "Règles WiFi domestique, espace de travail", "evidence_type": "document"},
{"label": "S''assurer du contrôle d''accès distant fort", "hint": "MFA obligatoire pour le VPN", "evidence_type": "test"}
]'),
  ('A.6.8', '[
{"label": "Vérifier l''existence d''un canal de signalement d''événements sécurité", "hint": "Email dédié, hotline, ticketing", "evidence_type": "document"},
{"label": "Confirmer la sensibilisation des collaborateurs a signaler", "hint": "Module dédié dans la formation SI", "evidence_type": "document"},
{"label": "Vérifier la prise en charge rapide des signalements", "hint": "SLA de qualification (< 1 jour)", "evidence_type": "document"},
{"label": "S''assurer de la culture de non-répression du signalement", "hint": "Communication sur la valorisation des signalements", "evidence_type": "interview"}
]'),
  ('A.7.1', '[
{"label": "Vérifier l''existence de périmètres physiques sécurisés", "hint": "Plan des bâtiments avec zones de sécurité", "evidence_type": "document"},
{"label": "Confirmer le contrôle d''accès aux périmètres (badges, biométrie)", "hint": "Système de contrôle d''accès fonctionnel", "evidence_type": "observation"},
{"label": "Vérifier la robustesse physique (murs, portes, fenêtres)", "hint": "Inspection visuelle des points d''accès", "evidence_type": "observation"},
{"label": "S''assurer de la séparation entre zones publiques et sécurisées", "hint": "Zones d''accueil distinctes des zones IT/admin", "evidence_type": "observation"}
]'),
  ('A.7.2', '[
{"label": "Vérifier la procédure de gestion des badges et accès physiques", "hint": "Workflow d''attribution/restitution", "evidence_type": "document"},
{"label": "Confirmer la traçabilité des entrées/sorties", "hint": "Logs d''accès consultables", "evidence_type": "test"},
{"label": "Vérifier la gestion des visiteurs", "hint": "Registre, accompagnement, badge visiteur", "evidence_type": "observation"},
{"label": "S''assurer du retrait rapide des badges a la sortie", "hint": "Procédure de désactivation immédiate", "evidence_type": "test"}
]'),
  ('A.7.3', '[
{"label": "Vérifier la sécurisation des bureaux et salles sensibles", "hint": "Salles informatiques fermées a clé, badges restreints", "evidence_type": "observation"},
{"label": "Confirmer la protection des zones avec données sensibles", "hint": "Zones dédiées, contrôle d''accès renforcé", "evidence_type": "observation"},
{"label": "Vérifier les règles d''occupation des locaux", "hint": "Politique d''accès par zone", "evidence_type": "document"},
{"label": "S''assurer de la fermeture en dehors des heures ouvrées", "hint": "Procédure de fermeture, alarme", "evidence_type": "observation"}
]'),
  ('A.7.4', '[
{"label": "Vérifier le système de surveillance vidéo (caméras, enregistrement)", "hint": "Caméras aux points stratégiques", "evidence_type": "observation"},
{"label": "Confirmer la durée de conservation des enregistrements", "hint": "Politique de rétention conforme RGPD (typique 30j)", "evidence_type": "document"},
{"label": "Vérifier la déclaration CNIL/affichage", "hint": "Information visible des personnes filmées", "evidence_type": "observation"},
{"label": "S''assurer de la couverture des accès et zones sensibles", "hint": "Plan de couverture caméras", "evidence_type": "document"}
]'),
  ('A.7.5', '[
{"label": "Vérifier la protection contre incendie (détection, extinction)", "hint": "Système de détection automatique, extincteurs", "evidence_type": "observation"},
{"label": "Confirmer la protection contre dégât des eaux", "hint": "Détecteurs de fuite, surélévation des équipements", "evidence_type": "observation"},
{"label": "Vérifier la protection contre coupure électrique", "hint": "Onduleurs, groupe électrogène", "evidence_type": "observation"},
{"label": "S''assurer du contrôle de température et humidité en salle serveur", "hint": "Climatisation redondante, sondes", "evidence_type": "observation"}
]'),
  ('A.7.6', '[
{"label": "Vérifier les règles spécifiques pour les zones sécurisées", "hint": "Politique de comportement en salle serveur", "evidence_type": "document"},
{"label": "Confirmer l''interdiction d''équipements personnels (téléphones, USB)", "hint": "Affichage et contrôle a l''entrée", "evidence_type": "observation"},
{"label": "Vérifier l''accompagnement des intervenants externes", "hint": "Escorte par personnel autorisé", "evidence_type": "interview"},
{"label": "S''assurer de l''enregistrement des activités en zone sécurisée", "hint": "Registre des interventions", "evidence_type": "document"}
]'),
  ('A.7.7', '[
{"label": "Vérifier la politique clean desk et clean screen", "hint": "Document de référence", "evidence_type": "document"},
{"label": "Confirmer le verrouillage automatique des sessions", "hint": "Configuration GPO < 15 min", "evidence_type": "test"},
{"label": "Vérifier l''application sur le terrain", "hint": "Inspection après les heures ouvrées", "evidence_type": "observation"},
{"label": "S''assurer du rangement des documents sensibles", "hint": "Armoires fermées a clé en fin de journée", "evidence_type": "observation"}
]'),
  ('A.7.8', '[
{"label": "Vérifier la disposition sécurisée des équipements", "hint": "Écrans non visibles depuis l''extérieur, racks fermés", "evidence_type": "observation"},
{"label": "Confirmer la protection contre les nuisances environnementales", "hint": "Position éloignée des fenêtres, sources de chaleur", "evidence_type": "observation"},
{"label": "Vérifier la protection des câbles et connexions", "hint": "Goulottes, racks fermés", "evidence_type": "observation"},
{"label": "S''assurer de la stabilité physique des installations", "hint": "Racks fixes, équipements stables", "evidence_type": "observation"}
]'),
  ('A.7.9', '[
{"label": "Vérifier la politique de sécurisation des actifs hors site", "hint": "Charte télétravail, déplacement professionnel", "evidence_type": "document"},
{"label": "Confirmer le chiffrement des PC portables", "hint": "BitLocker / FileVault active", "evidence_type": "test"},
{"label": "Vérifier la protection physique en déplacement", "hint": "Câbles antivol, ne pas laisser sans surveillance", "evidence_type": "interview"},
{"label": "S''assurer du processus de déclaration de perte/vol", "hint": "Procédure de signalement immédiat", "evidence_type": "document"}
]'),
  ('A.7.10', '[
{"label": "Vérifier la gestion des supports de stockage (USB, disques)", "hint": "Inventaire des supports, marquage", "evidence_type": "document"},
{"label": "Confirmer le chiffrement des supports amovibles sensibles", "hint": "Politique BitLocker To Go ou équivalent", "evidence_type": "test"},
{"label": "Vérifier les règles de transport des supports", "hint": "Mallette sécurisée, transport trace", "evidence_type": "document"},
{"label": "S''assurer de la destruction sécurisée des supports en fin de vie", "hint": "Procédure de wiping ou destruction physique", "evidence_type": "document"}
]'),
  ('A.7.11', '[
{"label": "Vérifier la disponibilité des utilités essentielles (elec, eau, climatisation)", "hint": "Schéma des utilités, redondances", "evidence_type": "document"},
{"label": "Confirmer la protection contre les coupures (UPS, groupe)", "hint": "Test mensuel des UPS, groupe électrogène", "evidence_type": "test"},
{"label": "Vérifier la maintenance préventive des utilités", "hint": "Contrats de maintenance, historique interventions", "evidence_type": "document"},
{"label": "S''assurer du monitoring continu des paramètres", "hint": "Sondes raccordées au SOC/NOC", "evidence_type": "test"}
]'),
  ('A.7.12', '[
{"label": "Vérifier la sécurisation physique du câblage réseau", "hint": "Goulottes verrouillées, salles techniques fermées", "evidence_type": "observation"},
{"label": "Confirmer la séparation des câbles courant fort/faible", "hint": "Schéma de câblage", "evidence_type": "document"},
{"label": "Vérifier l''identification des câbles", "hint": "Étiquetage clair", "evidence_type": "observation"},
{"label": "S''assurer de la protection contre les écoutes", "hint": "Pas de câble accessible au public", "evidence_type": "observation"}
]'),
  ('A.7.13', '[
{"label": "Vérifier le programme de maintenance des équipements", "hint": "Contrats, planning préventif", "evidence_type": "document"},
{"label": "Confirmer la traçabilité des interventions", "hint": "Logs et registres de maintenance", "evidence_type": "document"},
{"label": "Vérifier l''autorisation des intervenants", "hint": "Liste des prestataires habilités", "evidence_type": "document"},
{"label": "S''assurer du retrait des données avant intervention sur disque", "hint": "Procédure d''effacement avant remise en réparation", "evidence_type": "document"}
]'),
  ('A.7.14', '[
{"label": "Vérifier la procédure de mise au rebut des équipements", "hint": "Procédure DEEE avec étape de wiping", "evidence_type": "document"},
{"label": "Confirmer l''effacement sécurisé avant cession", "hint": "Outil DBAN, certificate de destruction", "evidence_type": "test"},
{"label": "Vérifier la traçabilité (numéro série, certificat de destruction)", "hint": "Registre de destruction", "evidence_type": "document"},
{"label": "S''assurer du recours a un prestataire qualifié pour la destruction physique", "hint": "Certification du prestataire DEEE", "evidence_type": "document"}
]'),
  ('A.8.1', '[
{"label": "Vérifier l''existence d''une politique de sécurisation des postes utilisateurs", "hint": "Configuration de référence (hardening baseline)", "evidence_type": "document"},
{"label": "Confirmer le chiffrement disque obligatoire", "hint": "BitLocker / FileVault sur 100% du parc", "evidence_type": "test"},
{"label": "Vérifier le déploiement antivirus et EDR", "hint": "Console centralisée avec couverture complète", "evidence_type": "test"},
{"label": "S''assurer du verrouillage automatique des sessions", "hint": "GPO de timeout < 15 min", "evidence_type": "test"}
]'),
  ('A.8.2', '[
{"label": "Vérifier l''inventaire des comptes a privilèges", "hint": "Liste exhaustive des admins, root, super-users", "evidence_type": "document"},
{"label": "Confirmer l''utilisation d''une solution PAM", "hint": "CyberArk, Delinea, BeyondTrust", "evidence_type": "test"},
{"label": "Vérifier la séparation comptes utilisateur / comptes admin", "hint": "Comptes nominatifs distincts", "evidence_type": "test"},
{"label": "S''assurer du logging et de la revue des actions privilégiées", "hint": "Session recording, audit trail", "evidence_type": "test"}
]'),
  ('A.8.3', '[
{"label": "Vérifier la mise en oeuvre du moindre privilege applicatif", "hint": "Rôles et permissions définis dans les apps", "evidence_type": "document"},
{"label": "Confirmer la restriction d''accès aux informations sensibles", "hint": "Filtres, masquage, pas d''accès en lecture par défaut", "evidence_type": "test"},
{"label": "Vérifier la traçabilité des accès aux données sensibles", "hint": "Logs d''accès actives et conservés", "evidence_type": "test"},
{"label": "S''assurer de la revue périodique des autorisations applicatives", "hint": "Recertification annuelle minimum", "evidence_type": "document"}
]'),
  ('A.8.4', '[
{"label": "Vérifier la restriction d''accès aux dépôts de code source", "hint": "Configuration GitHub/GitLab avec ACL", "evidence_type": "test"},
{"label": "Confirmer la séparation des accès par projet/environnement", "hint": "Permissions granulaires par repo", "evidence_type": "test"},
{"label": "Vérifier le MFA pour les accès aux dépôts", "hint": "Enforce MFA au niveau organisation", "evidence_type": "test"},
{"label": "S''assurer de l''absence de secrets dans le code", "hint": "Outil de scan secrets (gitleaks, trufflehog)", "evidence_type": "test"}
]'),
  ('A.8.5', '[
{"label": "Vérifier le déploiement du MFA sur les services critiques", "hint": "VPN, admin, mail, cloud avec MFA obligatoire", "evidence_type": "test"},
{"label": "Confirmer la robustesse de la politique de mots de passe", "hint": "Min 12 caractères, complexité, anti-réutilisation", "evidence_type": "document"},
{"label": "Vérifier les protections anti-brute-force", "hint": "Verrouillage compte après N tentatives", "evidence_type": "test"},
{"label": "S''assurer du déploiement SSO centralisé", "hint": "IdP type Okta, Azure AD, Keycloak", "evidence_type": "test"}
]'),
  ('A.8.6', '[
{"label": "Vérifier le monitoring des capacités (CPU, RAM, disque, réseau)", "hint": "Tableau de bord de capacité", "evidence_type": "test"},
{"label": "Confirmer les seuils d''alerte et procédures d''escalade", "hint": "Alertes configurées avec seuils", "evidence_type": "document"},
{"label": "Vérifier la planification capacitaire a moyen terme", "hint": "Forecast de capacité annuel", "evidence_type": "document"},
{"label": "S''assurer de la prévention des saturations DOS", "hint": "Limites de rate-limiting, scaling automatique", "evidence_type": "test"}
]'),
  ('A.8.7', '[
{"label": "Vérifier le déploiement antivirus sur 100% des endpoints et serveurs", "hint": "Console EDR/AV avec inventaire", "evidence_type": "test"},
{"label": "Confirmer la mise à jour des signatures et moteurs", "hint": "Mise à jour automatique active", "evidence_type": "test"},
{"label": "Vérifier la protection des serveurs mail et web (filtrage)", "hint": "Anti-spam, sandbox, reputation filtering", "evidence_type": "test"},
{"label": "S''assurer de la sensibilisation utilisateur (phishing)", "hint": "Campagnes de simulation phishing", "evidence_type": "document"}
]'),
  ('A.8.8', '[
{"label": "Vérifier l''existence d''un programme de gestion des vulnérabilités", "hint": "Politique de scanning et remediation", "evidence_type": "document"},
{"label": "Confirmer le scanning régulier des assets", "hint": "Outil type Nessus, Qualys avec rapports", "evidence_type": "test"},
{"label": "Vérifier les délais de remediation par criticité", "hint": "SLA: critique 7j, haut 30j, moyen 90j", "evidence_type": "document"},
{"label": "S''assurer du suivi des vulnérabilités a risque", "hint": "Tableau de bord de remediation", "evidence_type": "document"}
]'),
  ('A.8.9', '[
{"label": "Vérifier l''existence de configurations de référence (hardening)", "hint": "Baseline CIS, ANSSI ou interne", "evidence_type": "document"},
{"label": "Confirmer le déploiement automatisé des configurations", "hint": "Outil IaC (Ansible, Terraform, Puppet)", "evidence_type": "test"},
{"label": "Vérifier la détection des dérives de configuration", "hint": "Compliance scan régulier", "evidence_type": "test"},
{"label": "S''assurer du processus de mise à jour des baselines", "hint": "Revue annuelle des standards", "evidence_type": "document"}
]'),
  ('A.8.10', '[
{"label": "Vérifier la procédure de suppression sécurisée des données", "hint": "Politique de suppression conforme a la rétention", "evidence_type": "document"},
{"label": "Confirmer le wiping en fin de vie des supports", "hint": "Outil de wiping certifié, certificate", "evidence_type": "test"},
{"label": "Vérifier la suppression effective sur backups expirés", "hint": "Politique de purge des sauvegardes anciennes", "evidence_type": "document"},
{"label": "S''assurer du droit a l''effacement RGPD", "hint": "Procédure de réponse aux demandes d''effacement", "evidence_type": "document"}
]'),
  ('A.8.11', '[
{"label": "Vérifier l''application du masquage en environnements non-prod", "hint": "Anonymisation/pseudonymisation des données de test", "evidence_type": "test"},
{"label": "Confirmer l''absence de PII en environnement de développement", "hint": "Audit des bases dev/test", "evidence_type": "test"},
{"label": "Vérifier la qualité du masquage (irréversibilité)", "hint": "Méthode utilisée (hash, randomisation)", "evidence_type": "document"},
{"label": "S''assurer de la cohérence référentielle après masquage", "hint": "Tests fonctionnels avec données masquées", "evidence_type": "test"}
]'),
  ('A.8.12', '[
{"label": "Vérifier le déploiement d''une solution DLP", "hint": "Outil DLP type Microsoft Purview, Forcepoint", "evidence_type": "test"},
{"label": "Confirmer les règles de détection des données sensibles", "hint": "Patterns PII, PCI, classifications", "evidence_type": "document"},
{"label": "Vérifier les canaux couverts (email, web, USB, cloud)", "hint": "Liste des canaux protégés", "evidence_type": "test"},
{"label": "S''assurer du traitement des alertes DLP", "hint": "Workflow d''investigation et remediation", "evidence_type": "document"}
]'),
  ('A.8.13', '[
{"label": "Vérifier l''existence d''une politique de sauvegarde", "hint": "Politique RTO/RPO documentée", "evidence_type": "document"},
{"label": "Confirmer la fréquence et la rétention des sauvegardes", "hint": "Schéma 3-2-1 (3 copies, 2 supports, 1 hors-site)", "evidence_type": "document"},
{"label": "Vérifier le chiffrement des sauvegardes", "hint": "Sauvegardes chiffrées au repos", "evidence_type": "test"},
{"label": "S''assurer des tests de restauration réguliers", "hint": "Tests documentés (au moins trimestriels)", "evidence_type": "test"},
{"label": "Vérifier la protection des sauvegardes contre ransomware", "hint": "Sauvegardes immutables ou air-gapped", "evidence_type": "test"}
]'),
  ('A.8.14', '[
{"label": "Vérifier la redondance des composants critiques", "hint": "Schéma d''architecture haute disponibilité", "evidence_type": "document"},
{"label": "Confirmer le test des bascules (failover)", "hint": "Tests documentés annuels", "evidence_type": "test"},
{"label": "Vérifier la redondance géographique pour les services critiques", "hint": "Multi-site ou multi-region cloud", "evidence_type": "document"},
{"label": "S''assurer du monitoring de la disponibilité", "hint": "SLO mesures et reportés", "evidence_type": "test"}
]'),
  ('A.8.15', '[
{"label": "Vérifier la politique de logging des systèmes critiques", "hint": "Politique avec liste des événements a logger", "evidence_type": "document"},
{"label": "Confirmer la centralisation des logs (SIEM)", "hint": "SIEM type Splunk, Sentinel, Elastic", "evidence_type": "test"},
{"label": "Vérifier la durée de conservation conforme aux exigences", "hint": "Rétention 1 an minimum (12 mois standard)", "evidence_type": "document"},
{"label": "S''assurer de la protection de l''intégrité des logs", "hint": "Append-only, immutabilité", "evidence_type": "test"}
]'),
  ('A.8.16', '[
{"label": "Vérifier le monitoring sécurité 24/7 ou heures étendues", "hint": "SOC interne ou MSSP avec SLA", "evidence_type": "document"},
{"label": "Confirmer les règles de détection (use cases, scénarios)", "hint": "Catalogue de use cases SIEM documenté", "evidence_type": "document"},
{"label": "Vérifier le tuning régulier pour réduire les faux positifs", "hint": "Compte-rendu de tuning mensuel", "evidence_type": "document"},
{"label": "S''assurer de l''intégration avec la threat intelligence", "hint": "IoC feeds connectés au SIEM", "evidence_type": "test"}
]'),
  ('A.8.17', '[
{"label": "Vérifier la synchronisation NTP de tous les systèmes", "hint": "Configuration NTP avec source unique", "evidence_type": "test"},
{"label": "Confirmer la fiabilité de la source NTP", "hint": "Source officielle (gouvernementale, fournisseur)", "evidence_type": "document"},
{"label": "Vérifier la cohérence des timestamps dans les logs", "hint": "Comparaison logs entre systèmes", "evidence_type": "test"},
{"label": "S''assurer de l''alerte en cas de désynchronisation", "hint": "Monitoring de l''écart NTP", "evidence_type": "test"}
]'),
  ('A.8.18', '[
{"label": "Vérifier le contrôle des outils utilitaires privilégiés", "hint": "Liste des outils admin (Sysinternals, scripts)", "evidence_type": "document"},
{"label": "Confirmer la restriction d''accès aux utilitaires", "hint": "AppLocker / WDAC, restrictions par groupe", "evidence_type": "test"},
{"label": "Vérifier le logging de l''usage des utilitaires sensibles", "hint": "Logs PowerShell, command line auditing", "evidence_type": "test"},
{"label": "S''assurer de l''autorisation préalable pour l''usage d''outils sensibles", "hint": "Process d''approbation pour les outils risques", "evidence_type": "document"}
]'),
  ('A.8.19', '[
{"label": "Vérifier la gestion des installations sur systèmes opérationnels", "hint": "Procédure de change management", "evidence_type": "document"},
{"label": "Confirmer la restriction des droits d''installation", "hint": "Utilisateurs non admin sur leur poste", "evidence_type": "test"},
{"label": "Vérifier la validation des logiciels avant déploiement", "hint": "Allowlist d''applications validées", "evidence_type": "document"},
{"label": "S''assurer de la mise à jour régulière des logiciels", "hint": "Politique de patching", "evidence_type": "test"}
]'),
  ('A.8.20', '[
{"label": "Vérifier l''architecture réseau sécurisée (segmentation, firewalls)", "hint": "Schéma réseau avec zones de sécurité", "evidence_type": "document"},
{"label": "Confirmer la configuration des firewalls (règles documentées)", "hint": "Revue des ACL firewall", "evidence_type": "document"},
{"label": "Vérifier la protection contre les intrusions (IDS/IPS)", "hint": "IDS/IPS opérationnel avec signatures à jour", "evidence_type": "test"},
{"label": "S''assurer du monitoring du trafic réseau", "hint": "NDR, NetFlow analysis", "evidence_type": "test"}
]'),
  ('A.8.21', '[
{"label": "Vérifier l''inventaire des services réseau exposés", "hint": "Cartographie des services et ports", "evidence_type": "document"},
{"label": "Confirmer la sécurisation des services critiques (TLS, MFA)", "hint": "Pas de protocoles non chiffrés en prod", "evidence_type": "test"},
{"label": "Vérifier les accords de service avec fournisseurs réseau", "hint": "Contrat ISP/MPLS avec SLA sécurité", "evidence_type": "document"},
{"label": "S''assurer du monitoring des services réseau", "hint": "Disponibilité monitorée", "evidence_type": "test"}
]'),
  ('A.8.22', '[
{"label": "Vérifier la segmentation réseau (VLAN, sous-réseaux)", "hint": "Schéma de segmentation par criticité", "evidence_type": "document"},
{"label": "Confirmer l''isolation des environnements (prod, dev, DMZ)", "hint": "Firewalls inter-zones avec règles strictes", "evidence_type": "test"},
{"label": "Vérifier la séparation des serveurs sensibles", "hint": "VLAN dédié pour DB, AD, etc.", "evidence_type": "document"},
{"label": "S''assurer de la micro-segmentation pour les workloads critiques", "hint": "Politiques zero trust ou équivalent", "evidence_type": "test"}
]'),
  ('A.8.23', '[
{"label": "Vérifier le déploiement d''un proxy ou filtre web", "hint": "Solution type Zscaler, Forcepoint, McAfee", "evidence_type": "test"},
{"label": "Confirmer les catégories filtrées (malware, phishing, illégal)", "hint": "Politique de filtrage documentée", "evidence_type": "document"},
{"label": "Vérifier l''inspection TLS si applicable", "hint": "MITM autorisé pour sécurité, déclaré aux utilisateurs", "evidence_type": "document"},
{"label": "S''assurer du logging des accès web", "hint": "Logs proxy conservés et exploités", "evidence_type": "test"}
]'),
  ('A.8.24', '[
{"label": "Vérifier la politique de chiffrement (algorithmes, longueurs)", "hint": "Conformité aux recommandations ANSSI/NIST", "evidence_type": "document"},
{"label": "Confirmer le chiffrement des données au repos", "hint": "Disques, bases, sauvegardes chiffrés", "evidence_type": "test"},
{"label": "Vérifier le chiffrement des données en transit", "hint": "TLS 1.2+ obligatoire", "evidence_type": "test"},
{"label": "S''assurer de la gestion sécurisée des clés", "hint": "HSM, KMS, rotation des clés", "evidence_type": "test"}
]'),
  ('A.8.25', '[
{"label": "Vérifier l''existence d''un SDLC sécurisé", "hint": "Méthodologie type DevSecOps documentée", "evidence_type": "document"},
{"label": "Confirmer l''intégration de la sécurité dans chaque phase", "hint": "Threat modeling, code review sécurité, SAST/DAST", "evidence_type": "document"},
{"label": "Vérifier la formation des développeurs a la sécurité", "hint": "Programme OWASP Top 10 / langage spécifique", "evidence_type": "document"},
{"label": "S''assurer de la traçabilité du code en production", "hint": "Versioning, signature de release", "evidence_type": "test"}
]'),
  ('A.8.26', '[
{"label": "Vérifier la définition des exigences sécurité applicatives", "hint": "Spec sécurité dans les exigences fonctionnelles", "evidence_type": "document"},
{"label": "Confirmer la conformité aux standards (OWASP, CWE)", "hint": "Référence a OWASP ASVS dans les specs", "evidence_type": "document"},
{"label": "Vérifier la validation des exigences avant développement", "hint": "Threat modeling valide", "evidence_type": "document"},
{"label": "S''assurer de la traçabilité exigence vers test sécurité", "hint": "Matrice de traçabilité", "evidence_type": "document"}
]'),
  ('A.8.27', '[
{"label": "Vérifier l''existence de principes d''architecture sécurisée", "hint": "Référentiel d''architecture interne", "evidence_type": "document"},
{"label": "Confirmer l''application des principes (défense in depth, fail-safe, least privilege)", "hint": "Documentation d''architecture des projets", "evidence_type": "document"},
{"label": "Vérifier la revue d''architecture sécurité avant projet", "hint": "Validation par RSSI ou architectes sécurité", "evidence_type": "document"},
{"label": "S''assurer de la documentation des choix d''architecture", "hint": "ADR (Architecture Décision Records)", "evidence_type": "document"}
]'),
  ('A.8.28', '[
{"label": "Vérifier l''existence de standards de codage sécurisé", "hint": "Guide de coding interne par langage", "evidence_type": "document"},
{"label": "Confirmer l''utilisation d''outils SAST", "hint": "SonarQube, Checkmarx, Semgrep dans CI", "evidence_type": "test"},
{"label": "Vérifier les revues de code obligatoires", "hint": "Pull request review obligatoire", "evidence_type": "test"},
{"label": "S''assurer du blocage des vulnérabilités critiques en build", "hint": "Quality gate dans CI/CD", "evidence_type": "test"}
]'),
  ('A.8.29', '[
{"label": "Vérifier la réalisation de tests de sécurité avant mise en production", "hint": "DAST, pentest, validation sécurité", "evidence_type": "document"},
{"label": "Confirmer la couverture des tests OWASP Top 10", "hint": "Rapport de pentest applicatif", "evidence_type": "document"},
{"label": "Vérifier la gestion des findings de tests", "hint": "Plan de remediation suivi", "evidence_type": "document"},
{"label": "S''assurer du critère de Go-Live sécurité", "hint": "Checklist de validation avant déploiement prod", "evidence_type": "document"}
]'),
  ('A.8.30', '[
{"label": "Vérifier les exigences sécurité dans les contrats de développement externalisé", "hint": "Annexe sécurité avec exigences OWASP, RGPD", "evidence_type": "document"},
{"label": "Confirmer la maîtrise du code livré (audit, scan)", "hint": "Revue de code et SAST sur les livrables", "evidence_type": "test"},
{"label": "Vérifier les exigences sur le profil des intervenants", "hint": "Background check, NDA", "evidence_type": "document"},
{"label": "S''assurer de la gestion des accès des prestataires", "hint": "Comptes nominatifs, révocation rapide", "evidence_type": "test"}
]'),
  ('A.8.31', '[
{"label": "Vérifier la séparation des environnements (dev/test/prod)", "hint": "Infrastructures distinctes, accès cloisonnés", "evidence_type": "document"},
{"label": "Confirmer l''absence de données prod en environnements inférieurs", "hint": "Anonymisation des données de test", "evidence_type": "test"},
{"label": "Vérifier les processus de promotion entre environnements", "hint": "Pipeline CI/CD avec validations", "evidence_type": "document"},
{"label": "S''assurer de la séparation des rôles entre environnements", "hint": "Pas d''accès dev en prod", "evidence_type": "test"}
]'),
  ('A.8.32', '[
{"label": "Vérifier l''existence d''un processus formel de change management", "hint": "Procédure CAB, classification des changements", "evidence_type": "document"},
{"label": "Confirmer la traçabilité des changements en production", "hint": "Outil ITSM avec historique", "evidence_type": "test"},
{"label": "Vérifier l''évaluation d''impact sécurité avant changement", "hint": "Champ impact sécurité dans formulaire CAB", "evidence_type": "document"},
{"label": "S''assurer du processus de rollback en cas d''échec", "hint": "Plan de rollback documenté", "evidence_type": "document"}
]'),
  ('A.8.33', '[
{"label": "Vérifier la sécurisation des données de test", "hint": "Pas de données réelles en test, anonymisation", "evidence_type": "test"},
{"label": "Confirmer la protection des bases de test", "hint": "Accès restreints, chiffrement", "evidence_type": "test"},
{"label": "Vérifier l''effacement des données de test après usage", "hint": "Procédure de purge en fin de projet", "evidence_type": "document"},
{"label": "S''assurer de la conformité RGPD sur les données de test", "hint": "Validation DPO si données réelles utilisées", "evidence_type": "document"}
]'),
  ('A.8.34', '[
{"label": "Vérifier les précautions prises lors d''audits techniques", "hint": "Périmètre, fenêtre d''intervention, autorisations", "evidence_type": "document"},
{"label": "Confirmer la limitation des outils d''audit aux personnels habilités", "hint": "Accès trace aux outils de pentest", "evidence_type": "test"},
{"label": "Vérifier la protection des résultats d''audit", "hint": "Stockage chiffré, accès restreint", "evidence_type": "test"},
{"label": "S''assurer de la non-perturbation des systèmes pendant l''audit", "hint": "Coordination avec opérations, fenêtre dédiée", "evidence_type": "interview"}
]')
) as m(code, checklist),
public.domains d
where c.domain_id = d.id
  and d.framework_id = '00000000-0000-0000-0000-000000000010'
  and c.code = m.code;
