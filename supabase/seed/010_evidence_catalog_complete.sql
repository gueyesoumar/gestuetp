-- Seed: Catalogue complet des preuves ISO 27001:2022 — tous les 93 contrôles
-- Exécuter APRÈS 009_fix (qui supprime les anciennes entrées)

delete from public.evidence_catalog;

-- ============================================================
-- A.5 Mesures organisationnelles (37 contrôles)
-- ============================================================

-- A.5.1
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de sécurité de l''information approuvée', 'Document signé par la direction', true, 1),
  ('Preuve de diffusion aux collaborateurs', 'Email, accusé de réception ou PV', true, 2),
  ('PV de revue périodique de la politique', 'Compte-rendu de la dernière revue', false, 3)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.1' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.2
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Organigramme avec rôles sécurité', 'Organigramme identifiant le RSSI et responsables', true, 1),
  ('Fiches de poste sécurité', 'Fiches incluant les responsabilités sécurité', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.2' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.3
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Matrice de séparation des tâches', 'Incompatibilités de fonctions documentées', true, 1),
  ('Liste des accès par profil', 'Extraction des droits par rôle', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.3' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.4
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Lettre d''engagement de la direction', 'Engagement formel envers la sécurité', true, 1),
  ('PV de comité de direction traitant de la sécurité', 'Ordre du jour et décisions', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.4' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.5
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Liste des contacts avec les autorités', 'ANSSI, CNIL, forces de l''ordre, CERT', true, 1),
  ('Procédure de notification aux autorités', 'Processus en cas d''incident majeur', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.5' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.6
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Liste des groupes et forums spécialisés', 'CLUSIF, CESIN, ISACA, forums sectoriels', true, 1),
  ('Preuve de participation', 'Inscriptions, échanges ou comptes-rendus', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.6' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.7
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Sources de threat intelligence utilisées', 'Flux CTI, bulletins CERT, abonnements', true, 1),
  ('Rapport d''analyse des menaces récent', 'Synthèse des menaces identifiées', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.7' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.8
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure d''intégration sécurité dans les projets', 'Checklist ou gate review sécurité', true, 1),
  ('Exemple de projet avec analyse sécurité', 'Dossier projet incluant les exigences sécurité', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.8' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.9
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Inventaire des actifs informationnels', 'Liste des actifs matériels, logiciels et données', true, 1),
  ('Procédure de mise à jour de l''inventaire', 'Processus de tenue à jour', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.9' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.10
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Charte d''utilisation des SI', 'Règles d''utilisation acceptable signée', true, 1),
  ('Preuve de diffusion de la charte', 'Signature ou accusé de réception', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.10' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.11
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de restitution des actifs', 'Checklist de départ/changement de poste', true, 1),
  ('Exemple de formulaire de restitution', 'Formulaire complété', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.11' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.12
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de classification', 'Niveaux de classification définis', true, 1),
  ('Exemples de documents classifiés', 'Marquage appliqué sur des documents', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.12' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.13
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de marquage des informations', 'Règles d''étiquetage par niveau', true, 1),
  ('Exemples de marquage appliqué', 'Captures d''écran ou documents marqués', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.13' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.14
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de transfert d''informations', 'Règles de transfert sécurisé', true, 1),
  ('Outils de transfert sécurisé utilisés', 'Liste des outils approuvés (SFTP, chiffrement)', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.14' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.15
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de contrôle d''accès', 'Règles d''accès logiques et physiques', true, 1),
  ('Procédure de gestion des habilitations', 'Création, modification, révocation', true, 2),
  ('Revue périodique des accès', 'Dernier rapport de revue des droits', true, 3)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.15' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.16
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de gestion des identités', 'Cycle de vie des comptes utilisateurs', true, 1),
  ('Liste des comptes actifs', 'Extraction des comptes avec date de création', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.16' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.17
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de mots de passe', 'Complexité, expiration, historique', true, 1),
  ('Configuration technique des mots de passe', 'Paramètres AD/LDAP/IAM', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.17' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.18
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de provisioning/deprovisioning', 'Workflow de demande et validation d''accès', true, 1),
  ('Logs de provisioning récents', 'Traces des dernières créations/suppressions', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.18' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.19
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de gestion des fournisseurs', 'Exigences sécurité envers les tiers', true, 1),
  ('Registre des fournisseurs critiques', 'Liste avec niveau de criticité', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.19' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.20
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Clauses de sécurité dans les contrats', 'Exemples de clauses types', true, 1),
  ('Exemple de contrat avec annexe sécurité', 'Contrat fournisseur avec exigences', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.20' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.21
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Évaluation des risques supply chain', 'Analyse des risques liés aux fournisseurs IT', true, 1),
  ('Plan de mitigation supply chain', 'Actions de réduction des risques', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.21' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.22
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Rapports de suivi fournisseurs', 'Comités de pilotage, revues de performance', true, 1),
  ('Tableau de bord fournisseurs', 'KPIs et SLAs suivis', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.22' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.23
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique d''utilisation du cloud', 'Règles de sécurité pour les services cloud', true, 1),
  ('Inventaire des services cloud', 'Liste des services SaaS/IaaS/PaaS utilisés', true, 2),
  ('Évaluation sécurité des fournisseurs cloud', 'Certifications SOC2, ISO 27001 des providers', false, 3)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.23' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.24
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de gestion des incidents', 'Détection, escalade et résolution', true, 1),
  ('Registre des incidents', 'Journal des 12 derniers mois', true, 2),
  ('Rapport post-incident', 'Retour d''expérience', false, 3)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.24' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.25
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Critères de classification des événements', 'Grille de sévérité et catégorisation', true, 1),
  ('Exemples d''événements catégorisés', 'Tickets avec classification appliquée', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.25' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.26
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de réponse aux incidents', 'Playbooks par type d''incident', true, 1),
  ('Exemple de réponse à incident', 'Chronologie et actions menées', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.26' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.27
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Rapport de retour d''expérience', 'Leçons tirées et actions correctives', true, 1),
  ('Plan d''amélioration post-incident', 'Actions mises en œuvre suite aux enseignements', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.27' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.28
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de collecte de preuves numériques', 'Processus forensique documenté', true, 1),
  ('Outils de forensique utilisés', 'Liste des outils et procédures', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.28' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.29
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Plan de continuité d''activité (PCA)', 'Document PCA/PRA formalisé', true, 1),
  ('Rapport de test du PCA', 'Résultats du dernier exercice', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.29' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.30
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Plan de reprise IT (PRA)', 'Procédures de reprise des systèmes critiques', true, 1),
  ('Test de reprise IT', 'Résultats du dernier test de bascule', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.30' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.31
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Registre des exigences légales applicables', 'RGPD, LPM, NIS2, réglementations sectorielles', true, 1),
  ('Revue de conformité réglementaire', 'Dernier audit de conformité', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.31' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.32
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Registre des licences logicielles', 'Suivi des licences et conformité', true, 1),
  ('Politique de propriété intellectuelle', 'Règles de protection PI', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.32' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.33
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de conservation des enregistrements', 'Durées de rétention par type', true, 1),
  ('Inventaire des enregistrements réglementaires', 'Liste et localisation des enregistrements', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.33' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.34
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Registre des traitements (RGPD)', 'Registre Article 30 RGPD', true, 1),
  ('Analyse d''impact (AIPD/DPIA)', 'Dernière AIPD réalisée', false, 2),
  ('Politique de protection des données personnelles', 'Document formalisant les engagements', true, 3)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.34' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.35
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Rapport d''audit indépendant', 'Dernier rapport d''audit sécurité', true, 1),
  ('Plan d''action suite à l''audit', 'Suivi des recommandations', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.35' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.36
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Rapport de vérification de conformité interne', 'Auto-évaluation ou contrôle interne', true, 1),
  ('Tableau de suivi des non-conformités', 'Actions correctives en cours', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.36' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.37
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédures d''exploitation documentées', 'Procédures opérationnelles clés', true, 1),
  ('Preuve de mise à jour des procédures', 'Historique des révisions', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.37' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- ============================================================
-- A.6 Mesures liées aux personnes (8 contrôles)
-- ============================================================

-- A.6.1
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de vérification des antécédents', 'Processus de screening avant embauche', true, 1),
  ('Exemple de vérification réalisée', 'Formulaire ou rapport de vérification', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.6.1' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.6.2
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Clauses de sécurité dans les contrats de travail', 'Clause type intégrée aux contrats', true, 1),
  ('Exemple de contrat avec clauses sécurité', 'Extrait anonymisé', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.6.2' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.6.3
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Plan de sensibilisation annuel', 'Programme de sensibilisation sécurité', true, 1),
  ('Supports de formation', 'Présentations, e-learning, quiz', false, 2),
  ('Attestations de participation', 'Preuves de suivi des formations', true, 3)
) as e(name, description, is_required, sort_order)
where c.code = 'A.6.3' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.6.4
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure disciplinaire sécurité', 'Sanctions en cas de violation', true, 1),
  ('Communication de la procédure aux employés', 'Preuve de diffusion', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.6.4' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.6.5
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de départ/mutation', 'Checklist de départ incluant la sécurité', true, 1),
  ('Preuve de révocation d''accès au départ', 'Logs de désactivation de comptes', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.6.5' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.6.6
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Modèle d''accord de confidentialité (NDA)', 'Template NDA utilisé', true, 1),
  ('Registre des NDA signés', 'Suivi des accords en vigueur', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.6.6' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.6.7
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de télétravail', 'Règles de sécurité en télétravail', true, 1),
  ('Mesures techniques pour le télétravail', 'VPN, MDM, chiffrement des postes', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.6.7' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.6.8
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de signalement des incidents', 'Canal et processus de signalement', true, 1),
  ('Preuve de communication du processus', 'Email, affichage, intranet', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.6.8' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- ============================================================
-- A.7 Mesures physiques (14 contrôles)
-- ============================================================

-- A.7.1
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Plan des zones sécurisées', 'Cartographie des périmètres de sécurité', true, 1),
  ('Description des mesures de protection périmétrique', 'Clôtures, murs, barrières', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.7.1' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.7.2
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de contrôle d''accès physique', 'Badges, biométrie, registre visiteurs', true, 1),
  ('Logs d''accès physique', 'Extraction récente des accès', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.7.2' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.7.3
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Mesures de sécurisation des bureaux', 'Fermeture à clé, armoires sécurisées', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'A.7.3' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.7.4
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Système de vidéosurveillance', 'Plan de couverture et durée de rétention', true, 1),
  ('Procédure de surveillance', 'Monitoring et alertes', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.7.4' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.7.5
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Dispositifs de protection incendie', 'Détection, extinction, alarmes', true, 1),
  ('Rapports de vérification des dispositifs', 'Dernier contrôle périodique', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.7.5' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.7.6
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Règles de travail en zone sécurisée', 'Restrictions d''accès et d''usage', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'A.7.6' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.7.7
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique bureau propre / écran vide', 'Règles clean desk / clear screen', true, 1),
  ('Preuve de sensibilisation', 'Affichage, rappels, audits flash', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.7.7' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.7.8 à A.7.14
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Plan d''implantation des équipements', 'Positionnement sécurisé des serveurs et équipements', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'A.7.8' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de sécurité des équipements mobiles', 'Règles pour les appareils hors site', true, 1),
  ('Solution MDM déployée', 'Configuration et couverture', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.7.9' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de gestion des supports amovibles', 'Chiffrement, destruction, suivi', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'A.7.10' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Dispositifs d''alimentation secourue', 'Onduleurs, groupe électrogène, redondance', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'A.7.11' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Plan de câblage réseau', 'Documentation du câblage et protection', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'A.7.12' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Contrats de maintenance', 'Contrats préventifs et correctifs', true, 1),
  ('Registre de maintenance', 'Historique des interventions', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.7.13' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure d''effacement sécurisé', 'Processus de destruction des données avant mise au rebut', true, 1),
  ('Certificats de destruction', 'PV de destruction par prestataire', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.7.14' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- ============================================================
-- A.8 Mesures technologiques (34 contrôles)
-- ============================================================

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de sécurité des postes de travail', 'Durcissement, chiffrement, antivirus', true, 1),
  ('Standard de configuration des postes', 'Image master ou GPO appliquées', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.1' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Liste des comptes à privilèges', 'Inventaire des comptes admin/root', true, 1),
  ('Procédure de gestion des comptes à privilèges', 'PAM, rotation, monitoring', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.2' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Matrice d''accès aux informations', 'Qui accède à quoi, selon le besoin d''en connaître', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.3' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique d''accès au code source', 'Restrictions d''accès aux dépôts', true, 1),
  ('Configuration des droits sur les dépôts', 'Capture GitLab/GitHub avec les rôles', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.4' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique d''authentification', 'MFA, complexité, expiration', true, 1),
  ('Configuration technique d''authentification', 'Config AD/SSO/MFA', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.5' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Rapport de capacité', 'Supervision des ressources CPU, RAM, stockage', true, 1),
  ('Plan de dimensionnement', 'Prévisions de croissance et seuils d''alerte', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.6' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Solution antivirus/EDR déployée', 'Couverture du parc', true, 1),
  ('Rapport de détection récent', 'Dashboard des 30 derniers jours', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.7' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Processus de gestion des vulnérabilités', 'Scan, priorisation, remédiation', true, 1),
  ('Rapport de scan de vulnérabilités', 'Dernier rapport avec plan de remédiation', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.8' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Standards de configuration (hardening)', 'Guides CIS, ANSSI appliqués', true, 1),
  ('Rapport de conformité des configurations', 'Écarts par rapport au standard', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.9' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de suppression sécurisée des données', 'Effacement logique et physique', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.10' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de masquage/anonymisation', 'Règles de pseudonymisation des données', true, 1),
  ('Exemples de données masquées', 'Captures montrant le masquage appliqué', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.11' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Solution DLP déployée', 'Outil et périmètre de couverture', true, 1),
  ('Politique de prévention de fuite de données', 'Règles et canaux surveillés', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.12' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de sauvegarde', 'Fréquence, rétention, périmètre', true, 1),
  ('Rapports de tests de restauration', 'Résultats du dernier test', true, 2),
  ('Logs de sauvegarde récents', 'Preuves d''exécution correcte', false, 3)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.13' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Architecture haute disponibilité', 'Schéma de redondance des systèmes critiques', true, 1),
  ('Tests de bascule', 'Résultats des tests de failover', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.14' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de journalisation', 'Types d''événements, durée de rétention', true, 1),
  ('Architecture SIEM/collecte de logs', 'Infrastructure de centralisation', true, 2),
  ('Exemple d''alertes générées', 'Captures d''alertes traitées', false, 3)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.15' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Tableau de bord de surveillance', 'Dashboard de monitoring en temps réel', true, 1),
  ('Procédure de traitement des anomalies', 'Processus d''investigation', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.16' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Configuration NTP', 'Serveurs de temps utilisés et synchronisation', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.17' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Liste des utilitaires privilégiés autorisés', 'Outils système approuvés', true, 1),
  ('Restrictions d''accès aux utilitaires', 'Configuration des restrictions', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.18' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique d''installation logicielle', 'Logiciels autorisés et processus d''approbation', true, 1),
  ('Whitelist/blacklist logicielle', 'Liste des logiciels approuvés/interdits', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.19' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Architecture réseau', 'Schéma réseau avec zones de sécurité', true, 1),
  ('Règles de firewall', 'Extraction des règles principales', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.20' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Contrats de services réseau (SLA)', 'Accords avec les opérateurs', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.21' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Plan de segmentation réseau', 'VLANs, DMZ, zones de confiance', true, 1),
  ('Configuration de segmentation', 'Extractions switch/firewall', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.22' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Solution de filtrage web', 'Proxy, catégories bloquées', true, 1),
  ('Politique de filtrage web', 'Règles d''accès internet', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.23' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de chiffrement', 'Algorithmes, gestion des clés, périmètre', true, 1),
  ('Inventaire des flux chiffrés', 'TLS, VPN, chiffrement au repos', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.24' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de développement sécurisé (SDLC)', 'Intégration sécurité dans le cycle de dev', true, 1),
  ('Checklist de sécurité par phase', 'Exigences par étape du SDLC', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.25' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Spécifications de sécurité applicative', 'Exigences sécurité par application', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.26' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Principes d''architecture sécurisée', 'Security by design, défense en profondeur', true, 1),
  ('Dossier d''architecture sécurité', 'Exemple de dossier d''architecture', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.27' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Standards de codage sécurisé', 'OWASP, règles de code review', true, 1),
  ('Rapport d''analyse statique de code', 'Résultats SAST récents', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.28' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Rapport de test d''intrusion', 'Dernier pentest avec remédiation', true, 1),
  ('Plan de test de sécurité', 'Stratégie de test (DAST, SAST, pentest)', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.29' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Exigences sécurité pour le développement externalisé', 'Clauses sécurité dans les contrats de dev', true, 1),
  ('Audit de code du prestataire', 'Revue de sécurité du code livré', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.30' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Documentation de séparation des environnements', 'Dev, test, prod isolés', true, 1),
  ('Preuves d''isolation', 'Captures réseau ou configuration montrant la séparation', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.31' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de gestion des changements', 'Demande, validation et déploiement', true, 1),
  ('Registre des changements', 'Historique récent avec approbations', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.32' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de gestion des données de test', 'Anonymisation, pas de données prod en test', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.33' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de protection des SI durant les audits', 'Mesures pour limiter l''impact des tests d''audit', true, 1),
  ('Accord préalable pour les tests techniques', 'Autorisation formelle de pentest/audit', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.34' and d.framework_id = '00000000-0000-0000-0000-000000000010';
