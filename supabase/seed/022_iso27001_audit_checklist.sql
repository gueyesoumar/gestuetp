-- Seed: audit_checklist pour 93 controles ISO 27001:2022 Annex A
-- Format : single UPDATE avec VALUES list (compatible Studio SQL Editor).
-- Apostrophes echappees ('') et caracteres ASCII pour eviter encoding issues.
-- Idempotent : re-runnable a volonte.

update public.controls c
set audit_checklist = m.checklist::jsonb
from (values
  ('A.5.1', '[
{"label": "Verifier l''existence d''une PSSI documentee et approuvee par la direction", "hint": "Document portant signature ou approbation formelle de la direction", "evidence_type": "document"},
{"label": "Confirmer la date de derniere revue (< 12 mois)", "hint": "Page de garde ou historique de versions", "evidence_type": "document"},
{"label": "Verifier la diffusion aux collaborateurs", "hint": "Email de diffusion, accuse de lecture, ou page intranet dediee", "evidence_type": "interview"},
{"label": "S''assurer que la PSSI couvre tous les perimetres techniques (cloud, on-prem)", "hint": "Section perimetre du document", "evidence_type": "document"},
{"label": "Confirmer la coherence avec les exigences legales et contractuelles", "hint": "Reference aux normes, lois, ou contrats clients applicables", "evidence_type": "document"}
]'),
  ('A.5.2', '[
{"label": "Identifier le responsable de la securite (RSSI ou equivalent)", "hint": "Lettre de mission, organigramme ou fiche de poste", "evidence_type": "document"},
{"label": "Verifier la definition formalisee des roles SI dans l''organisation", "hint": "Matrice RACI ou tableau d''attribution des responsabilites", "evidence_type": "document"},
{"label": "Confirmer que les responsabilites sont documentees et communiquees", "hint": "Diffusion via fiches de poste ou email officiel", "evidence_type": "interview"},
{"label": "Verifier l''adequation des competences avec les roles attribues", "hint": "Certifications, formations, experience documentee", "evidence_type": "document"}
]'),
  ('A.5.3', '[
{"label": "Identifier les fonctions critiques necessitant separation (admin/audit, dev/prod, etc.)", "hint": "Cartographie des processus sensibles", "evidence_type": "document"},
{"label": "Verifier qu''aucune personne ne cumule des roles incompatibles", "hint": "Matrice des incompatibilites RACI", "evidence_type": "document"},
{"label": "Confirmer la mise en place de controles compensatoires si la separation est impossible", "hint": "Logs d''approbation a 4 yeux, double validation", "evidence_type": "test"},
{"label": "Verifier la revue periodique des cumuls de fonctions", "hint": "Compte-rendu de revue annuelle des acces", "evidence_type": "document"}
]'),
  ('A.5.4', '[
{"label": "Verifier l''engagement formel de la direction envers la securite SI", "hint": "Lettre d''engagement, charte, ou declaration de la direction", "evidence_type": "document"},
{"label": "Confirmer l''existence d''un comite de securite et sa frequence de reunion", "hint": "PV ou compte-rendus de COSI/CSSI sur les 12 derniers mois", "evidence_type": "document"},
{"label": "Verifier l''allocation de ressources budgetaires a la securite SI", "hint": "Budget annuel, lignes dediees securite", "evidence_type": "document"},
{"label": "S''assurer du suivi par la direction des indicateurs securite", "hint": "Tableau de bord ou KPI presentes en CODIR", "evidence_type": "document"}
]'),
  ('A.5.5', '[
{"label": "Identifier les autorites pertinentes pour l''organisation (CNIL, ANSSI, police, etc.)", "hint": "Liste des contacts d''urgence", "evidence_type": "document"},
{"label": "Verifier l''existence d''une procedure de signalement aux autorites", "hint": "Procedure de gestion d''incidents avec section autorites", "evidence_type": "document"},
{"label": "Confirmer la documentation des contacts (noms, telephones, emails)", "hint": "Annuaire contacts d''urgence a jour (< 12 mois)", "evidence_type": "document"},
{"label": "Verifier les modalites de notification reglementaires (CNIL 72h, etc.)", "hint": "Reference RGPD article 33 dans la procedure", "evidence_type": "document"}
]'),
  ('A.5.6', '[
{"label": "Identifier les groupes d''interet sectoriels (CERT, CLUSIF, ISACA, etc.)", "hint": "Adhesions ou abonnements documentes", "evidence_type": "document"},
{"label": "Verifier les sources de veille securite utilisees", "hint": "Bulletins ANSSI, CVE feeds, threat intelligence", "evidence_type": "interview"},
{"label": "Confirmer la diffusion de l''information securite en interne", "hint": "Newsletter, mailing-list, alertes diffusees", "evidence_type": "document"}
]'),
  ('A.5.7', '[
{"label": "Verifier l''existence d''une demarche de threat intelligence", "hint": "Sources externes (CERT, vendor feeds), abonnements", "evidence_type": "document"},
{"label": "Confirmer l''analyse reguliere des menaces pertinentes", "hint": "Rapport de threat assessment ou compte-rendu mensuel", "evidence_type": "document"},
{"label": "Verifier l''integration des informations dans les processus securite", "hint": "Liens vers SIEM, gestion des vulnerabilites, IR", "evidence_type": "test"},
{"label": "S''assurer que la threat intel alimente l''analyse de risques", "hint": "Mises a jour de la cartographie des risques", "evidence_type": "document"}
]'),
  ('A.5.8', '[
{"label": "Verifier l''integration de la securite dans les phases projet", "hint": "Methodologie projet (Agile, V) avec checkpoints securite", "evidence_type": "document"},
{"label": "Confirmer la realisation d''analyses de risques en amont des projets", "hint": "Privacy by design, risk assessment initial", "evidence_type": "document"},
{"label": "Verifier la validation securite avant mise en production", "hint": "Go/No-go securite documente dans les comites projet", "evidence_type": "document"},
{"label": "S''assurer de la formation securite des chefs de projet", "hint": "Plan de formation, certifications", "evidence_type": "interview"}
]'),
  ('A.5.9', '[
{"label": "Verifier l''existence d''un inventaire des actifs informationnels", "hint": "Tableau ou base CMDB recensant les actifs", "evidence_type": "document"},
{"label": "Confirmer la mise a jour recente (< 6 mois)", "hint": "Date de derniere mise a jour sur l''inventaire", "evidence_type": "document"},
{"label": "Verifier l''identification d''un proprietaire pour chaque actif", "hint": "Colonne proprietaire/responsable sur l''inventaire", "evidence_type": "document"},
{"label": "S''assurer que l''inventaire couvre les actifs cloud", "hint": "Presence des ressources Azure/AWS/GCP", "evidence_type": "document"},
{"label": "Confirmer la coherence avec la classification des donnees", "hint": "Lien entre actifs et niveaux de classification", "evidence_type": "interview"}
]'),
  ('A.5.10', '[
{"label": "Verifier l''existence d''une charte d''usage acceptable des actifs", "hint": "Document signe a l''embauche ou consultable en interne", "evidence_type": "document"},
{"label": "Confirmer la diffusion et l''acceptation par les utilisateurs", "hint": "Signatures ou validation electronique", "evidence_type": "document"},
{"label": "Verifier les regles specifiques par categorie d''actif (PC, mobile, USB)", "hint": "Sections dediees dans la charte", "evidence_type": "document"},
{"label": "S''assurer du processus de revue reguliere de la charte", "hint": "Date de derniere revue (< 24 mois)", "evidence_type": "document"}
]'),
  ('A.5.11', '[
{"label": "Verifier la procedure de restitution des actifs a la sortie", "hint": "Checklist sortie collaborateur (PC, badge, carte SIM, tokens)", "evidence_type": "document"},
{"label": "Confirmer le suivi formel des restitutions", "hint": "Registre signe par RH et IT", "evidence_type": "document"},
{"label": "Verifier le delai de restitution avant le depart effectif", "hint": "Procedure exigeant restitution avant J-1 ou jour J", "evidence_type": "document"},
{"label": "S''assurer du nettoyage des actifs recuperes (effacement securise)", "hint": "Procedure de wiping documentee", "evidence_type": "test"}
]'),
  ('A.5.12', '[
{"label": "Verifier l''existence d''un schema de classification des informations", "hint": "Niveaux: Public/Interne/Confidentiel/Secret ou equivalent", "evidence_type": "document"},
{"label": "Confirmer la classification effective des actifs critiques", "hint": "Inventaire avec colonne classification", "evidence_type": "document"},
{"label": "Verifier l''adoption par les collaborateurs", "hint": "Tests de classification sur des documents echantillons", "evidence_type": "test"},
{"label": "S''assurer que la classification declenche les mesures de protection adequates", "hint": "Politique de chiffrement liee aux niveaux", "evidence_type": "document"}
]'),
  ('A.5.13', '[
{"label": "Verifier l''existence de regles de marquage des informations", "hint": "Templates de documents avec mention de classification", "evidence_type": "document"},
{"label": "Confirmer le marquage sur des echantillons reels", "hint": "Documents internes (Word, PDF, emails)", "evidence_type": "observation"},
{"label": "Verifier le marquage des supports physiques", "hint": "Etiquettes sur disques, classeurs, dossiers", "evidence_type": "observation"},
{"label": "S''assurer du marquage automatique dans les outils (DLP, IRM)", "hint": "Configuration Microsoft Information Protection ou equivalent", "evidence_type": "test"}
]'),
  ('A.5.14', '[
{"label": "Verifier l''existence de regles de transfert d''information", "hint": "Procedure de transfert externe avec niveaux de protection", "evidence_type": "document"},
{"label": "Confirmer le chiffrement des donnees en transit", "hint": "TLS 1.2+ obligatoire, configuration des serveurs", "evidence_type": "test"},
{"label": "Verifier l''existence d''accords de transfert avec les tiers", "hint": "DPA, NDA, clauses contractuelles types", "evidence_type": "document"},
{"label": "S''assurer de la tracabilite des transferts sensibles", "hint": "Logs de transfert, audit trail", "evidence_type": "document"}
]'),
  ('A.5.15', '[
{"label": "Verifier l''existence d''une politique de controle d''acces", "hint": "Document definissant les regles d''attribution des droits", "evidence_type": "document"},
{"label": "Confirmer le principe du moindre privilege", "hint": "Documentation et application dans l''IAM", "evidence_type": "document"},
{"label": "Verifier la revue periodique des acces", "hint": "Recertification des droits (au moins annuelle)", "evidence_type": "document"},
{"label": "S''assurer du processus formel de demande/validation d''acces", "hint": "Workflow ITSM pour creation/modification d''acces", "evidence_type": "test"}
]'),
  ('A.5.16', '[
{"label": "Verifier l''existence d''un referentiel central des identites (IAM)", "hint": "Active Directory, LDAP, IdP cloud", "evidence_type": "document"},
{"label": "Confirmer le processus formel de creation/suppression d''identites", "hint": "Workflow lie au cycle de vie RH", "evidence_type": "document"},
{"label": "Verifier la suppression effective des identites a la sortie", "hint": "Test sur dossiers de departs recents", "evidence_type": "test"},
{"label": "S''assurer de la prevention des doublons d''identites", "hint": "Regles d''unicite dans l''IAM", "evidence_type": "document"}
]'),
  ('A.5.17', '[
{"label": "Verifier la politique de mots de passe (longueur, complexite, rotation)", "hint": "Conformite aux recommandations ANSSI/NIST", "evidence_type": "document"},
{"label": "Confirmer la mise en place du MFA pour les acces sensibles", "hint": "MFA actif sur admin, distant, cloud", "evidence_type": "test"},
{"label": "Verifier la securisation du stockage des mots de passe", "hint": "Hash bcrypt/argon2, pas de stockage en clair", "evidence_type": "test"},
{"label": "S''assurer du processus de reinitialisation securise", "hint": "Verification d''identite avant reset", "evidence_type": "document"}
]'),
  ('A.5.18', '[
{"label": "Verifier le processus formel d''attribution des droits d''acces", "hint": "Demande, validation hierarchique, tracabilite", "evidence_type": "document"},
{"label": "Confirmer la revue periodique des droits", "hint": "Campagne de recertification documentee", "evidence_type": "document"},
{"label": "Verifier la revocation rapide a la sortie ou changement de poste", "hint": "Delai cible (< 24h) et test sur cas reels", "evidence_type": "test"},
{"label": "S''assurer de la gestion des comptes privilegies", "hint": "Vault, PAM, comptes nominatifs", "evidence_type": "test"}
]'),
  ('A.5.19', '[
{"label": "Verifier l''existence d''une politique de securite fournisseurs", "hint": "Document de reference pour la chaine d''approvisionnement", "evidence_type": "document"},
{"label": "Confirmer la cartographie des fournisseurs SI critiques", "hint": "Liste avec niveau de criticite et risques associes", "evidence_type": "document"},
{"label": "Verifier l''evaluation prealable des fournisseurs", "hint": "Questionnaire securite, due diligence avant contractualisation", "evidence_type": "document"},
{"label": "S''assurer du suivi regulier des fournisseurs en place", "hint": "Compte-rendu d''evaluation annuelle", "evidence_type": "document"}
]'),
  ('A.5.20', '[
{"label": "Verifier la presence de clauses securite dans les contrats fournisseurs", "hint": "Annexe securite, DPA, SLA securite", "evidence_type": "document"},
{"label": "Confirmer la couverture des principaux risques", "hint": "Audit, droit a l''audit, notification d''incident, sous-traitance", "evidence_type": "document"},
{"label": "Verifier les exigences de notification d''incident", "hint": "Delai de notification (24-72h typique)", "evidence_type": "document"},
{"label": "S''assurer de la possibilite d''audit du fournisseur", "hint": "Clause d''audit annuel ou sur incident", "evidence_type": "document"}
]'),
  ('A.5.21', '[
{"label": "Verifier la cartographie de la chaine ICT", "hint": "Schema de la supply chain SI (sous-traitants, hebergeurs, editeurs)", "evidence_type": "document"},
{"label": "Confirmer la gestion des risques fournisseurs en cascade", "hint": "Evaluation des sous-traitants des fournisseurs", "evidence_type": "document"},
{"label": "Verifier les exigences sur la securite des produits/services", "hint": "Standards de codage, certifications produit", "evidence_type": "document"},
{"label": "S''assurer du suivi des vulnerabilites tiers (CVE)", "hint": "Veille sur les composants utilises", "evidence_type": "document"}
]'),
  ('A.5.22', '[
{"label": "Verifier le processus de revue reguliere des prestations fournisseurs", "hint": "Comite de pilotage periodique avec le fournisseur", "evidence_type": "document"},
{"label": "Confirmer la mesure des SLA et indicateurs securite", "hint": "Tableau de bord SLA mensuel/trimestriel", "evidence_type": "document"},
{"label": "Verifier la gestion des changements impactant les services fournisseurs", "hint": "Comite changement avec impact securite evalue", "evidence_type": "document"},
{"label": "S''assurer de la documentation des incidents fournisseurs", "hint": "Registre incidents avec actions correctives", "evidence_type": "document"}
]'),
  ('A.5.23', '[
{"label": "Verifier l''inventaire des services cloud utilises", "hint": "CASB, audit cloud, liste documentee", "evidence_type": "document"},
{"label": "Confirmer l''evaluation securite de chaque fournisseur cloud", "hint": "Certifications (SOC 2, ISO 27001, HDS)", "evidence_type": "document"},
{"label": "Verifier les parametres de securite (chiffrement, MFA, IAM)", "hint": "Configuration baseline appliquee", "evidence_type": "test"},
{"label": "S''assurer de la conformite geographique des donnees", "hint": "Localisation explicite (EU, France, etc.)", "evidence_type": "document"},
{"label": "Verifier la gestion des acces au shadow IT", "hint": "Detection CASB, sensibilisation", "evidence_type": "test"}
]'),
  ('A.5.24', '[
{"label": "Verifier l''existence d''un plan de gestion d''incidents documente", "hint": "Procedure formalisee, processus IR", "evidence_type": "document"},
{"label": "Confirmer la definition des roles et de la cellule de crise", "hint": "Fiche organisationnelle de l''equipe IR", "evidence_type": "document"},
{"label": "Verifier l''existence d''arbres de decision et matrices d''escalade", "hint": "Criteres de classification de gravite, contacts par niveau", "evidence_type": "document"},
{"label": "S''assurer de l''organisation d''exercices reguliers", "hint": "PV d''exercice de simulation (tabletop, red team)", "evidence_type": "document"}
]'),
  ('A.5.25', '[
{"label": "Verifier le processus d''evaluation et de qualification des evenements", "hint": "Criteres pour distinguer evenement vs incident", "evidence_type": "document"},
{"label": "Confirmer le role du SOC ou equipe securite dans la qualification", "hint": "Procedure d''analyse SOC, niveaux N1/N2/N3", "evidence_type": "document"},
{"label": "Verifier les delais de qualification cibles", "hint": "SLA interne pour qualification (< 1h)", "evidence_type": "document"},
{"label": "S''assurer de la documentation des decisions de qualification", "hint": "Ticketing, journal d''analyse", "evidence_type": "test"}
]'),
  ('A.5.26', '[
{"label": "Verifier les procedures de reponse par type d''incident", "hint": "Playbooks (ransomware, data leak, DDoS, etc.)", "evidence_type": "document"},
{"label": "Confirmer la disponibilite 24/7 de l''equipe IR", "hint": "Astreinte, contrat MSSP, contacts joignables", "evidence_type": "interview"},
{"label": "Verifier les outils de reponse (forensic, isolation, communication)", "hint": "EDR avec capacite d''isolation, kit forensic", "evidence_type": "test"},
{"label": "S''assurer de la communication structuree pendant les incidents", "hint": "Templates de communication interne/externe", "evidence_type": "document"}
]'),
  ('A.5.27', '[
{"label": "Verifier l''existence d''un processus de retour d''experience post-incident", "hint": "Reunion REX systematique apres incident majeur", "evidence_type": "document"},
{"label": "Confirmer la documentation des lecons apprises", "hint": "Rapport d''incident final avec recommandations", "evidence_type": "document"},
{"label": "Verifier le suivi de la mise en oeuvre des actions correctives", "hint": "Plan d''action issu du REX, tracking dans outil", "evidence_type": "document"},
{"label": "S''assurer de la diffusion des enseignements aux equipes concernees", "hint": "Mise a jour des procedures, formation ciblee", "evidence_type": "interview"}
]'),
  ('A.5.28', '[
{"label": "Verifier la procedure de collecte de preuves numeriques", "hint": "Methodologie forensic conforme (chain of custody)", "evidence_type": "document"},
{"label": "Confirmer la formation des intervenants a la preservation des preuves", "hint": "Certifications GCFE, GCFA, CHFI ou equivalent", "evidence_type": "document"},
{"label": "Verifier les outils utilises (imagers, write-blockers, hash)", "hint": "Inventaire du kit forensic", "evidence_type": "observation"},
{"label": "S''assurer du stockage securise des preuves", "hint": "Coffre, acces restreint, journalisation", "evidence_type": "observation"}
]'),
  ('A.5.29', '[
{"label": "Verifier l''existence d''un PCA/PRA documente", "hint": "Plan de continuite d''activite formalise", "evidence_type": "document"},
{"label": "Confirmer la couverture des scenarios de disruption", "hint": "Cyberattaque, panne majeure, indisponibilite site", "evidence_type": "document"},
{"label": "Verifier l''identification des activites essentielles et RTO/RPO", "hint": "BIA - Business Impact Analysis avec objectifs de reprise", "evidence_type": "document"},
{"label": "S''assurer de la realisation d''exercices de continuite", "hint": "PV de test annuel du PCA/PRA", "evidence_type": "document"}
]'),
  ('A.5.30', '[
{"label": "Verifier la strategie de continuite ICT", "hint": "Architecture redondante, sites de secours, cloud DR", "evidence_type": "document"},
{"label": "Confirmer la sauvegarde reguliere des donnees critiques", "hint": "Politique de backup, frequence, retention", "evidence_type": "document"},
{"label": "Verifier la testabilite de la restauration", "hint": "Tests de restauration documentes (au moins annuels)", "evidence_type": "test"},
{"label": "S''assurer de l''alignement avec les RTO/RPO du PCA", "hint": "Mise en coherence avec le BIA", "evidence_type": "document"}
]'),
  ('A.5.31', '[
{"label": "Verifier l''identification des exigences legales applicables", "hint": "Registre de conformite (RGPD, secteur, PCI-DSS, etc.)", "evidence_type": "document"},
{"label": "Confirmer la mise a jour reguliere du registre", "hint": "Date de derniere revue (< 12 mois)", "evidence_type": "document"},
{"label": "Verifier la traduction en politiques et procedures internes", "hint": "Liens registre vers PSSI, charte, procedures", "evidence_type": "document"},
{"label": "S''assurer de la veille reglementaire", "hint": "Source officielle (ANSSI, CNIL, ENISA)", "evidence_type": "interview"}
]'),
  ('A.5.32', '[
{"label": "Verifier l''inventaire des logiciels et licences", "hint": "Outil de software asset management (SAM)", "evidence_type": "document"},
{"label": "Confirmer la conformite licences (nb d''installations vs licences acquises)", "hint": "Audit interne SAM annuel", "evidence_type": "document"},
{"label": "Verifier les processus de protection de la PI interne", "hint": "Marquage des documents proprietaires, NDA", "evidence_type": "document"},
{"label": "S''assurer du respect des licences open-source", "hint": "Inventaire des composants OSS et licences", "evidence_type": "document"}
]'),
  ('A.5.33', '[
{"label": "Verifier l''identification des enregistrements a proteger legalement", "hint": "Liste des documents soumis a conservation (compta, RH, etc.)", "evidence_type": "document"},
{"label": "Confirmer les durees de conservation par categorie", "hint": "Politique de retention conforme aux obligations", "evidence_type": "document"},
{"label": "Verifier la protection contre l''alteration et la perte", "hint": "Stockage securise, integrite controlee", "evidence_type": "test"},
{"label": "S''assurer de la suppression securisee a l''issue de la retention", "hint": "Procedure de purge documentee", "evidence_type": "document"}
]'),
  ('A.5.34', '[
{"label": "Verifier la conformite RGPD (registre des traitements, DPO si applicable)", "hint": "Registre conforme article 30 RGPD", "evidence_type": "document"},
{"label": "Confirmer l''existence d''analyses d''impact (AIPD/PIA)", "hint": "PIA documentee pour traitements sensibles", "evidence_type": "document"},
{"label": "Verifier la gestion des droits des personnes", "hint": "Procedure et delais de reponse (1 mois)", "evidence_type": "document"},
{"label": "S''assurer de la sensibilisation des collaborateurs sur la PII", "hint": "Module RGPD dans le plan de formation", "evidence_type": "document"}
]'),
  ('A.5.35', '[
{"label": "Verifier la planification d''audits internes/externes de securite", "hint": "Plan d''audit pluriannuel", "evidence_type": "document"},
{"label": "Confirmer l''independance des auditeurs", "hint": "Auditeur tiers ou audit interne hors hierarchie SI", "evidence_type": "document"},
{"label": "Verifier le traitement des recommandations d''audits precedents", "hint": "Plan d''action audit avec suivi", "evidence_type": "document"},
{"label": "S''assurer de la communication des resultats a la direction", "hint": "Presentation du rapport d''audit en COSI", "evidence_type": "document"}
]'),
  ('A.5.36', '[
{"label": "Verifier le controle regulier de l''application des politiques SI", "hint": "Audits de conformite internes", "evidence_type": "document"},
{"label": "Confirmer la mesure d''indicateurs de conformite", "hint": "KPI de conformite, % de couverture des controles", "evidence_type": "document"},
{"label": "Verifier le traitement des ecarts detectes", "hint": "Plan d''action correctif", "evidence_type": "document"},
{"label": "S''assurer de la prise en compte par les responsables d''unites", "hint": "Reporting de conformite aux responsables", "evidence_type": "interview"}
]'),
  ('A.5.37', '[
{"label": "Verifier l''existence de procedures operationnelles documentees", "hint": "Documentation accessible aux operateurs", "evidence_type": "document"},
{"label": "Confirmer la couverture des operations critiques", "hint": "Sauvegarde, restauration, gestion des comptes admin", "evidence_type": "document"},
{"label": "Verifier la mise a jour reguliere des procedures", "hint": "Date de revue (< 24 mois)", "evidence_type": "document"},
{"label": "S''assurer de l''adoption effective par les equipes", "hint": "Test sur procedure d''astreinte", "evidence_type": "test"}
]'),
  ('A.6.1', '[
{"label": "Verifier l''existence d''une procedure de screening pre-embauche", "hint": "Politique RH avec etapes de verification", "evidence_type": "document"},
{"label": "Confirmer la verification d''identite et de references", "hint": "Trace dans dossier RH des references contactees", "evidence_type": "document"},
{"label": "Verifier les controles specifiques pour postes sensibles", "hint": "Extrait casier judiciaire, due diligence renforcee", "evidence_type": "document"},
{"label": "S''assurer de la conformite du processus avec la legislation", "hint": "Respect du droit du travail et RGPD sur les donnees candidat", "evidence_type": "document"}
]'),
  ('A.6.2', '[
{"label": "Verifier les clauses de confidentialite dans les contrats de travail", "hint": "Article confidentialite, NDA dans le contrat", "evidence_type": "document"},
{"label": "Confirmer l''engagement formel sur les politiques securite", "hint": "Signature de la charte SI a l''embauche", "evidence_type": "document"},
{"label": "Verifier l''information sur les sanctions disciplinaires", "hint": "Reference au reglement interieur dans le contrat", "evidence_type": "document"},
{"label": "S''assurer de la couverture des obligations post-contrat", "hint": "Clauses de non-divulgation post-emploi", "evidence_type": "document"}
]'),
  ('A.6.3', '[
{"label": "Verifier l''existence d''un plan de sensibilisation annuel", "hint": "Programme de formation SI avec calendrier", "evidence_type": "document"},
{"label": "Confirmer la realisation de campagnes (phishing, ransomware, RGPD)", "hint": "Campagnes simulees, taux de clic mesure", "evidence_type": "document"},
{"label": "Verifier le taux de completion par les collaborateurs", "hint": "Reporting LMS avec % de completion", "evidence_type": "document"},
{"label": "S''assurer de la formation specifique pour les roles a risque", "hint": "Modules dedies admins, dev, juridique", "evidence_type": "document"}
]'),
  ('A.6.4', '[
{"label": "Verifier l''existence d''un processus disciplinaire documente", "hint": "Procedure RH referencee au reglement interieur", "evidence_type": "document"},
{"label": "Confirmer la definition des sanctions par type de violation", "hint": "Echelle de sanctions proportionnee", "evidence_type": "document"},
{"label": "Verifier l''application effective sur des cas passes", "hint": "Anonymisation: revue de cas traites", "evidence_type": "interview"},
{"label": "S''assurer du respect des droits du salarie dans la procedure", "hint": "Convocation prealable, droit a se faire assister", "evidence_type": "document"}
]'),
  ('A.6.5', '[
{"label": "Verifier la procedure de fin de contrat ou changement de poste", "hint": "Checklist de sortie / mobilite", "evidence_type": "document"},
{"label": "Confirmer la revocation des acces dans les delais", "hint": "Delai cible (< 24h) + test sur cas reels", "evidence_type": "test"},
{"label": "Verifier la restitution des actifs et badges", "hint": "Registre signe par RH et IT", "evidence_type": "document"},
{"label": "S''assurer du rappel des obligations post-emploi", "hint": "Lettre de rappel des clauses de confidentialite", "evidence_type": "document"}
]'),
  ('A.6.6', '[
{"label": "Verifier l''utilisation systematique de NDA pour les tiers", "hint": "Modele NDA officiel utilise", "evidence_type": "document"},
{"label": "Confirmer la signature des NDA avant tout echange sensible", "hint": "Process commercial integrant NDA", "evidence_type": "document"},
{"label": "Verifier la couverture des collaborateurs internes via charte/contrat", "hint": "Clause de confidentialite dans contrat de travail", "evidence_type": "document"},
{"label": "S''assurer de la duree et portee des NDA", "hint": "Duree post-contrat suffisante (5+ ans)", "evidence_type": "document"}
]'),
  ('A.6.7', '[
{"label": "Verifier la politique de teletravail incluant les regles securite", "hint": "Charte teletravail avec section securite", "evidence_type": "document"},
{"label": "Confirmer la mise a disposition d''equipements securises", "hint": "PC chiffres, VPN obligatoire", "evidence_type": "test"},
{"label": "Verifier les regles d''usage en environnement personnel", "hint": "Regles WiFi domestique, espace de travail", "evidence_type": "document"},
{"label": "S''assurer du controle d''acces distant fort", "hint": "MFA obligatoire pour le VPN", "evidence_type": "test"}
]'),
  ('A.6.8', '[
{"label": "Verifier l''existence d''un canal de signalement d''evenements securite", "hint": "Email dedie, hotline, ticketing", "evidence_type": "document"},
{"label": "Confirmer la sensibilisation des collaborateurs a signaler", "hint": "Module dedie dans la formation SI", "evidence_type": "document"},
{"label": "Verifier la prise en charge rapide des signalements", "hint": "SLA de qualification (< 1 jour)", "evidence_type": "document"},
{"label": "S''assurer de la culture de non-repression du signalement", "hint": "Communication sur la valorisation des signalements", "evidence_type": "interview"}
]'),
  ('A.7.1', '[
{"label": "Verifier l''existence de perimetres physiques securises", "hint": "Plan des batiments avec zones de securite", "evidence_type": "document"},
{"label": "Confirmer le controle d''acces aux perimetres (badges, biometrie)", "hint": "Systeme de controle d''acces fonctionnel", "evidence_type": "observation"},
{"label": "Verifier la robustesse physique (murs, portes, fenetres)", "hint": "Inspection visuelle des points d''acces", "evidence_type": "observation"},
{"label": "S''assurer de la separation entre zones publiques et securisees", "hint": "Zones d''accueil distinctes des zones IT/admin", "evidence_type": "observation"}
]'),
  ('A.7.2', '[
{"label": "Verifier la procedure de gestion des badges et acces physiques", "hint": "Workflow d''attribution/restitution", "evidence_type": "document"},
{"label": "Confirmer la tracabilite des entrees/sorties", "hint": "Logs d''acces consultables", "evidence_type": "test"},
{"label": "Verifier la gestion des visiteurs", "hint": "Registre, accompagnement, badge visiteur", "evidence_type": "observation"},
{"label": "S''assurer du retrait rapide des badges a la sortie", "hint": "Procedure de desactivation immediate", "evidence_type": "test"}
]'),
  ('A.7.3', '[
{"label": "Verifier la securisation des bureaux et salles sensibles", "hint": "Salles informatiques fermees a cle, badges restreints", "evidence_type": "observation"},
{"label": "Confirmer la protection des zones avec donnees sensibles", "hint": "Zones dediees, controle d''acces renforce", "evidence_type": "observation"},
{"label": "Verifier les regles d''occupation des locaux", "hint": "Politique d''acces par zone", "evidence_type": "document"},
{"label": "S''assurer de la fermeture en dehors des heures ouvrees", "hint": "Procedure de fermeture, alarme", "evidence_type": "observation"}
]'),
  ('A.7.4', '[
{"label": "Verifier le systeme de surveillance video (cameras, enregistrement)", "hint": "Cameras aux points strategiques", "evidence_type": "observation"},
{"label": "Confirmer la duree de conservation des enregistrements", "hint": "Politique de retention conforme RGPD (typique 30j)", "evidence_type": "document"},
{"label": "Verifier la declaration CNIL/affichage", "hint": "Information visible des personnes filmees", "evidence_type": "observation"},
{"label": "S''assurer de la couverture des acces et zones sensibles", "hint": "Plan de couverture cameras", "evidence_type": "document"}
]'),
  ('A.7.5', '[
{"label": "Verifier la protection contre incendie (detection, extinction)", "hint": "Systeme de detection automatique, extincteurs", "evidence_type": "observation"},
{"label": "Confirmer la protection contre degat des eaux", "hint": "Detecteurs de fuite, surelevation des equipements", "evidence_type": "observation"},
{"label": "Verifier la protection contre coupure electrique", "hint": "Onduleurs, groupe electrogene", "evidence_type": "observation"},
{"label": "S''assurer du controle de temperature et humidite en salle serveur", "hint": "Climatisation redondante, sondes", "evidence_type": "observation"}
]'),
  ('A.7.6', '[
{"label": "Verifier les regles specifiques pour les zones securisees", "hint": "Politique de comportement en salle serveur", "evidence_type": "document"},
{"label": "Confirmer l''interdiction d''equipements personnels (telephones, USB)", "hint": "Affichage et controle a l''entree", "evidence_type": "observation"},
{"label": "Verifier l''accompagnement des intervenants externes", "hint": "Escorte par personnel autorise", "evidence_type": "interview"},
{"label": "S''assurer de l''enregistrement des activites en zone securisee", "hint": "Registre des interventions", "evidence_type": "document"}
]'),
  ('A.7.7', '[
{"label": "Verifier la politique clean desk et clean screen", "hint": "Document de reference", "evidence_type": "document"},
{"label": "Confirmer le verrouillage automatique des sessions", "hint": "Configuration GPO < 15 min", "evidence_type": "test"},
{"label": "Verifier l''application sur le terrain", "hint": "Inspection apres les heures ouvrees", "evidence_type": "observation"},
{"label": "S''assurer du rangement des documents sensibles", "hint": "Armoires fermees a cle en fin de journee", "evidence_type": "observation"}
]'),
  ('A.7.8', '[
{"label": "Verifier la disposition securisee des equipements", "hint": "Ecrans non visibles depuis l''exterieur, racks fermes", "evidence_type": "observation"},
{"label": "Confirmer la protection contre les nuisances environnementales", "hint": "Position eloignee des fenetres, sources de chaleur", "evidence_type": "observation"},
{"label": "Verifier la protection des cables et connexions", "hint": "Goulottes, racks fermes", "evidence_type": "observation"},
{"label": "S''assurer de la stabilite physique des installations", "hint": "Racks fixes, equipements stables", "evidence_type": "observation"}
]'),
  ('A.7.9', '[
{"label": "Verifier la politique de securisation des actifs hors site", "hint": "Charte teletravail, deplacement professionnel", "evidence_type": "document"},
{"label": "Confirmer le chiffrement des PC portables", "hint": "BitLocker / FileVault active", "evidence_type": "test"},
{"label": "Verifier la protection physique en deplacement", "hint": "Cables antivol, ne pas laisser sans surveillance", "evidence_type": "interview"},
{"label": "S''assurer du processus de declaration de perte/vol", "hint": "Procedure de signalement immediat", "evidence_type": "document"}
]'),
  ('A.7.10', '[
{"label": "Verifier la gestion des supports de stockage (USB, disques)", "hint": "Inventaire des supports, marquage", "evidence_type": "document"},
{"label": "Confirmer le chiffrement des supports amovibles sensibles", "hint": "Politique BitLocker To Go ou equivalent", "evidence_type": "test"},
{"label": "Verifier les regles de transport des supports", "hint": "Mallette securisee, transport trace", "evidence_type": "document"},
{"label": "S''assurer de la destruction securisee des supports en fin de vie", "hint": "Procedure de wiping ou destruction physique", "evidence_type": "document"}
]'),
  ('A.7.11', '[
{"label": "Verifier la disponibilite des utilites essentielles (elec, eau, climatisation)", "hint": "Schema des utilites, redondances", "evidence_type": "document"},
{"label": "Confirmer la protection contre les coupures (UPS, groupe)", "hint": "Test mensuel des UPS, groupe electrogene", "evidence_type": "test"},
{"label": "Verifier la maintenance preventive des utilites", "hint": "Contrats de maintenance, historique interventions", "evidence_type": "document"},
{"label": "S''assurer du monitoring continu des parametres", "hint": "Sondes raccordees au SOC/NOC", "evidence_type": "test"}
]'),
  ('A.7.12', '[
{"label": "Verifier la securisation physique du cablage reseau", "hint": "Goulottes verrouillees, salles techniques fermees", "evidence_type": "observation"},
{"label": "Confirmer la separation des cables courant fort/faible", "hint": "Schema de cablage", "evidence_type": "document"},
{"label": "Verifier l''identification des cables", "hint": "Etiquetage clair", "evidence_type": "observation"},
{"label": "S''assurer de la protection contre les ecoutes", "hint": "Pas de cable accessible au public", "evidence_type": "observation"}
]'),
  ('A.7.13', '[
{"label": "Verifier le programme de maintenance des equipements", "hint": "Contrats, planning preventif", "evidence_type": "document"},
{"label": "Confirmer la tracabilite des interventions", "hint": "Logs et registres de maintenance", "evidence_type": "document"},
{"label": "Verifier l''autorisation des intervenants", "hint": "Liste des prestataires habilites", "evidence_type": "document"},
{"label": "S''assurer du retrait des donnees avant intervention sur disque", "hint": "Procedure d''effacement avant remise en reparation", "evidence_type": "document"}
]'),
  ('A.7.14', '[
{"label": "Verifier la procedure de mise au rebut des equipements", "hint": "Procedure DEEE avec etape de wiping", "evidence_type": "document"},
{"label": "Confirmer l''effacement securise avant cession", "hint": "Outil DBAN, certificate de destruction", "evidence_type": "test"},
{"label": "Verifier la tracabilite (numero serie, certificat de destruction)", "hint": "Registre de destruction", "evidence_type": "document"},
{"label": "S''assurer du recours a un prestataire qualifie pour la destruction physique", "hint": "Certification du prestataire DEEE", "evidence_type": "document"}
]'),
  ('A.8.1', '[
{"label": "Verifier l''existence d''une politique de securisation des postes utilisateurs", "hint": "Configuration de reference (hardening baseline)", "evidence_type": "document"},
{"label": "Confirmer le chiffrement disque obligatoire", "hint": "BitLocker / FileVault sur 100% du parc", "evidence_type": "test"},
{"label": "Verifier le deploiement antivirus et EDR", "hint": "Console centralisee avec couverture complete", "evidence_type": "test"},
{"label": "S''assurer du verrouillage automatique des sessions", "hint": "GPO de timeout < 15 min", "evidence_type": "test"}
]'),
  ('A.8.2', '[
{"label": "Verifier l''inventaire des comptes a privileges", "hint": "Liste exhaustive des admins, root, super-users", "evidence_type": "document"},
{"label": "Confirmer l''utilisation d''une solution PAM", "hint": "CyberArk, Delinea, BeyondTrust", "evidence_type": "test"},
{"label": "Verifier la separation comptes utilisateur / comptes admin", "hint": "Comptes nominatifs distincts", "evidence_type": "test"},
{"label": "S''assurer du logging et de la revue des actions privilegiees", "hint": "Session recording, audit trail", "evidence_type": "test"}
]'),
  ('A.8.3', '[
{"label": "Verifier la mise en oeuvre du moindre privilege applicatif", "hint": "Roles et permissions definis dans les apps", "evidence_type": "document"},
{"label": "Confirmer la restriction d''acces aux informations sensibles", "hint": "Filtres, masquage, pas d''acces en lecture par defaut", "evidence_type": "test"},
{"label": "Verifier la tracabilite des acces aux donnees sensibles", "hint": "Logs d''acces actives et conserves", "evidence_type": "test"},
{"label": "S''assurer de la revue periodique des autorisations applicatives", "hint": "Recertification annuelle minimum", "evidence_type": "document"}
]'),
  ('A.8.4', '[
{"label": "Verifier la restriction d''acces aux depots de code source", "hint": "Configuration GitHub/GitLab avec ACL", "evidence_type": "test"},
{"label": "Confirmer la separation des acces par projet/environnement", "hint": "Permissions granulaires par repo", "evidence_type": "test"},
{"label": "Verifier le MFA pour les acces aux depots", "hint": "Enforce MFA au niveau organisation", "evidence_type": "test"},
{"label": "S''assurer de l''absence de secrets dans le code", "hint": "Outil de scan secrets (gitleaks, trufflehog)", "evidence_type": "test"}
]'),
  ('A.8.5', '[
{"label": "Verifier le deploiement du MFA sur les services critiques", "hint": "VPN, admin, mail, cloud avec MFA obligatoire", "evidence_type": "test"},
{"label": "Confirmer la robustesse de la politique de mots de passe", "hint": "Min 12 caracteres, complexite, anti-reutilisation", "evidence_type": "document"},
{"label": "Verifier les protections anti-brute-force", "hint": "Verrouillage compte apres N tentatives", "evidence_type": "test"},
{"label": "S''assurer du deploiement SSO centralise", "hint": "IdP type Okta, Azure AD, Keycloak", "evidence_type": "test"}
]'),
  ('A.8.6', '[
{"label": "Verifier le monitoring des capacites (CPU, RAM, disque, reseau)", "hint": "Tableau de bord de capacite", "evidence_type": "test"},
{"label": "Confirmer les seuils d''alerte et procedures d''escalade", "hint": "Alertes configurees avec seuils", "evidence_type": "document"},
{"label": "Verifier la planification capacitaire a moyen terme", "hint": "Forecast de capacite annuel", "evidence_type": "document"},
{"label": "S''assurer de la prevention des saturations DOS", "hint": "Limites de rate-limiting, scaling automatique", "evidence_type": "test"}
]'),
  ('A.8.7', '[
{"label": "Verifier le deploiement antivirus sur 100% des endpoints et serveurs", "hint": "Console EDR/AV avec inventaire", "evidence_type": "test"},
{"label": "Confirmer la mise a jour des signatures et moteurs", "hint": "Mise a jour automatique active", "evidence_type": "test"},
{"label": "Verifier la protection des serveurs mail et web (filtrage)", "hint": "Anti-spam, sandbox, reputation filtering", "evidence_type": "test"},
{"label": "S''assurer de la sensibilisation utilisateur (phishing)", "hint": "Campagnes de simulation phishing", "evidence_type": "document"}
]'),
  ('A.8.8', '[
{"label": "Verifier l''existence d''un programme de gestion des vulnerabilites", "hint": "Politique de scanning et remediation", "evidence_type": "document"},
{"label": "Confirmer le scanning regulier des assets", "hint": "Outil type Nessus, Qualys avec rapports", "evidence_type": "test"},
{"label": "Verifier les delais de remediation par criticite", "hint": "SLA: critique 7j, haut 30j, moyen 90j", "evidence_type": "document"},
{"label": "S''assurer du suivi des vulnerabilites a risque", "hint": "Tableau de bord de remediation", "evidence_type": "document"}
]'),
  ('A.8.9', '[
{"label": "Verifier l''existence de configurations de reference (hardening)", "hint": "Baseline CIS, ANSSI ou interne", "evidence_type": "document"},
{"label": "Confirmer le deploiement automatise des configurations", "hint": "Outil IaC (Ansible, Terraform, Puppet)", "evidence_type": "test"},
{"label": "Verifier la detection des derives de configuration", "hint": "Compliance scan regulier", "evidence_type": "test"},
{"label": "S''assurer du processus de mise a jour des baselines", "hint": "Revue annuelle des standards", "evidence_type": "document"}
]'),
  ('A.8.10', '[
{"label": "Verifier la procedure de suppression securisee des donnees", "hint": "Politique de suppression conforme a la retention", "evidence_type": "document"},
{"label": "Confirmer le wiping en fin de vie des supports", "hint": "Outil de wiping certifie, certificate", "evidence_type": "test"},
{"label": "Verifier la suppression effective sur backups expires", "hint": "Politique de purge des sauvegardes anciennes", "evidence_type": "document"},
{"label": "S''assurer du droit a l''effacement RGPD", "hint": "Procedure de reponse aux demandes d''effacement", "evidence_type": "document"}
]'),
  ('A.8.11', '[
{"label": "Verifier l''application du masquage en environnements non-prod", "hint": "Anonymisation/pseudonymisation des donnees de test", "evidence_type": "test"},
{"label": "Confirmer l''absence de PII en environnement de developpement", "hint": "Audit des bases dev/test", "evidence_type": "test"},
{"label": "Verifier la qualite du masquage (irreversibilite)", "hint": "Methode utilisee (hash, randomisation)", "evidence_type": "document"},
{"label": "S''assurer de la coherence referentielle apres masquage", "hint": "Tests fonctionnels avec donnees masquees", "evidence_type": "test"}
]'),
  ('A.8.12', '[
{"label": "Verifier le deploiement d''une solution DLP", "hint": "Outil DLP type Microsoft Purview, Forcepoint", "evidence_type": "test"},
{"label": "Confirmer les regles de detection des donnees sensibles", "hint": "Patterns PII, PCI, classifications", "evidence_type": "document"},
{"label": "Verifier les canaux couverts (email, web, USB, cloud)", "hint": "Liste des canaux proteges", "evidence_type": "test"},
{"label": "S''assurer du traitement des alertes DLP", "hint": "Workflow d''investigation et remediation", "evidence_type": "document"}
]'),
  ('A.8.13', '[
{"label": "Verifier l''existence d''une politique de sauvegarde", "hint": "Politique RTO/RPO documentee", "evidence_type": "document"},
{"label": "Confirmer la frequence et la retention des sauvegardes", "hint": "Schema 3-2-1 (3 copies, 2 supports, 1 hors-site)", "evidence_type": "document"},
{"label": "Verifier le chiffrement des sauvegardes", "hint": "Sauvegardes chiffrees au repos", "evidence_type": "test"},
{"label": "S''assurer des tests de restauration reguliers", "hint": "Tests documentes (au moins trimestriels)", "evidence_type": "test"},
{"label": "Verifier la protection des sauvegardes contre ransomware", "hint": "Sauvegardes immutables ou air-gapped", "evidence_type": "test"}
]'),
  ('A.8.14', '[
{"label": "Verifier la redondance des composants critiques", "hint": "Schema d''architecture haute disponibilite", "evidence_type": "document"},
{"label": "Confirmer le test des bascules (failover)", "hint": "Tests documentes annuels", "evidence_type": "test"},
{"label": "Verifier la redondance geographique pour les services critiques", "hint": "Multi-site ou multi-region cloud", "evidence_type": "document"},
{"label": "S''assurer du monitoring de la disponibilite", "hint": "SLO mesures et reportes", "evidence_type": "test"}
]'),
  ('A.8.15', '[
{"label": "Verifier la politique de logging des systemes critiques", "hint": "Politique avec liste des evenements a logger", "evidence_type": "document"},
{"label": "Confirmer la centralisation des logs (SIEM)", "hint": "SIEM type Splunk, Sentinel, Elastic", "evidence_type": "test"},
{"label": "Verifier la duree de conservation conforme aux exigences", "hint": "Retention 1 an minimum (12 mois standard)", "evidence_type": "document"},
{"label": "S''assurer de la protection de l''integrite des logs", "hint": "Append-only, immutabilite", "evidence_type": "test"}
]'),
  ('A.8.16', '[
{"label": "Verifier le monitoring securite 24/7 ou heures etendues", "hint": "SOC interne ou MSSP avec SLA", "evidence_type": "document"},
{"label": "Confirmer les regles de detection (use cases, scenarios)", "hint": "Catalogue de use cases SIEM documente", "evidence_type": "document"},
{"label": "Verifier le tuning regulier pour reduire les faux positifs", "hint": "Compte-rendu de tuning mensuel", "evidence_type": "document"},
{"label": "S''assurer de l''integration avec la threat intelligence", "hint": "IoC feeds connectes au SIEM", "evidence_type": "test"}
]'),
  ('A.8.17', '[
{"label": "Verifier la synchronisation NTP de tous les systemes", "hint": "Configuration NTP avec source unique", "evidence_type": "test"},
{"label": "Confirmer la fiabilite de la source NTP", "hint": "Source officielle (gouvernementale, fournisseur)", "evidence_type": "document"},
{"label": "Verifier la coherence des timestamps dans les logs", "hint": "Comparaison logs entre systemes", "evidence_type": "test"},
{"label": "S''assurer de l''alerte en cas de desynchronisation", "hint": "Monitoring de l''ecart NTP", "evidence_type": "test"}
]'),
  ('A.8.18', '[
{"label": "Verifier le controle des outils utilitaires privilegies", "hint": "Liste des outils admin (Sysinternals, scripts)", "evidence_type": "document"},
{"label": "Confirmer la restriction d''acces aux utilitaires", "hint": "AppLocker / WDAC, restrictions par groupe", "evidence_type": "test"},
{"label": "Verifier le logging de l''usage des utilitaires sensibles", "hint": "Logs PowerShell, command line auditing", "evidence_type": "test"},
{"label": "S''assurer de l''autorisation prealable pour l''usage d''outils sensibles", "hint": "Process d''approbation pour les outils risques", "evidence_type": "document"}
]'),
  ('A.8.19', '[
{"label": "Verifier la gestion des installations sur systemes operationnels", "hint": "Procedure de change management", "evidence_type": "document"},
{"label": "Confirmer la restriction des droits d''installation", "hint": "Utilisateurs non admin sur leur poste", "evidence_type": "test"},
{"label": "Verifier la validation des logiciels avant deploiement", "hint": "Allowlist d''applications validees", "evidence_type": "document"},
{"label": "S''assurer de la mise a jour reguliere des logiciels", "hint": "Politique de patching", "evidence_type": "test"}
]'),
  ('A.8.20', '[
{"label": "Verifier l''architecture reseau securisee (segmentation, firewalls)", "hint": "Schema reseau avec zones de securite", "evidence_type": "document"},
{"label": "Confirmer la configuration des firewalls (regles documentees)", "hint": "Revue des ACL firewall", "evidence_type": "document"},
{"label": "Verifier la protection contre les intrusions (IDS/IPS)", "hint": "IDS/IPS operationnel avec signatures a jour", "evidence_type": "test"},
{"label": "S''assurer du monitoring du trafic reseau", "hint": "NDR, NetFlow analysis", "evidence_type": "test"}
]'),
  ('A.8.21', '[
{"label": "Verifier l''inventaire des services reseau exposes", "hint": "Cartographie des services et ports", "evidence_type": "document"},
{"label": "Confirmer la securisation des services critiques (TLS, MFA)", "hint": "Pas de protocoles non chiffres en prod", "evidence_type": "test"},
{"label": "Verifier les accords de service avec fournisseurs reseau", "hint": "Contrat ISP/MPLS avec SLA securite", "evidence_type": "document"},
{"label": "S''assurer du monitoring des services reseau", "hint": "Disponibilite monitoree", "evidence_type": "test"}
]'),
  ('A.8.22', '[
{"label": "Verifier la segmentation reseau (VLAN, sous-reseaux)", "hint": "Schema de segmentation par criticite", "evidence_type": "document"},
{"label": "Confirmer l''isolation des environnements (prod, dev, DMZ)", "hint": "Firewalls inter-zones avec regles strictes", "evidence_type": "test"},
{"label": "Verifier la separation des serveurs sensibles", "hint": "VLAN dedie pour DB, AD, etc.", "evidence_type": "document"},
{"label": "S''assurer de la micro-segmentation pour les workloads critiques", "hint": "Politiques zero trust ou equivalent", "evidence_type": "test"}
]'),
  ('A.8.23', '[
{"label": "Verifier le deploiement d''un proxy ou filtre web", "hint": "Solution type Zscaler, Forcepoint, McAfee", "evidence_type": "test"},
{"label": "Confirmer les categories filtrees (malware, phishing, illegal)", "hint": "Politique de filtrage documentee", "evidence_type": "document"},
{"label": "Verifier l''inspection TLS si applicable", "hint": "MITM autorise pour securite, declare aux utilisateurs", "evidence_type": "document"},
{"label": "S''assurer du logging des acces web", "hint": "Logs proxy conserves et exploites", "evidence_type": "test"}
]'),
  ('A.8.24', '[
{"label": "Verifier la politique de chiffrement (algorithmes, longueurs)", "hint": "Conformite aux recommandations ANSSI/NIST", "evidence_type": "document"},
{"label": "Confirmer le chiffrement des donnees au repos", "hint": "Disques, bases, sauvegardes chiffres", "evidence_type": "test"},
{"label": "Verifier le chiffrement des donnees en transit", "hint": "TLS 1.2+ obligatoire", "evidence_type": "test"},
{"label": "S''assurer de la gestion securisee des cles", "hint": "HSM, KMS, rotation des cles", "evidence_type": "test"}
]'),
  ('A.8.25', '[
{"label": "Verifier l''existence d''un SDLC securise", "hint": "Methodologie type DevSecOps documentee", "evidence_type": "document"},
{"label": "Confirmer l''integration de la securite dans chaque phase", "hint": "Threat modeling, code review securite, SAST/DAST", "evidence_type": "document"},
{"label": "Verifier la formation des developpeurs a la securite", "hint": "Programme OWASP Top 10 / langage specifique", "evidence_type": "document"},
{"label": "S''assurer de la tracabilite du code en production", "hint": "Versioning, signature de release", "evidence_type": "test"}
]'),
  ('A.8.26', '[
{"label": "Verifier la definition des exigences securite applicatives", "hint": "Spec securite dans les exigences fonctionnelles", "evidence_type": "document"},
{"label": "Confirmer la conformite aux standards (OWASP, CWE)", "hint": "Reference a OWASP ASVS dans les specs", "evidence_type": "document"},
{"label": "Verifier la validation des exigences avant developpement", "hint": "Threat modeling valide", "evidence_type": "document"},
{"label": "S''assurer de la tracabilite exigence vers test securite", "hint": "Matrice de tracabilite", "evidence_type": "document"}
]'),
  ('A.8.27', '[
{"label": "Verifier l''existence de principes d''architecture securisee", "hint": "Referentiel d''architecture interne", "evidence_type": "document"},
{"label": "Confirmer l''application des principes (defense in depth, fail-safe, least privilege)", "hint": "Documentation d''architecture des projets", "evidence_type": "document"},
{"label": "Verifier la revue d''architecture securite avant projet", "hint": "Validation par RSSI ou architectes securite", "evidence_type": "document"},
{"label": "S''assurer de la documentation des choix d''architecture", "hint": "ADR (Architecture Decision Records)", "evidence_type": "document"}
]'),
  ('A.8.28', '[
{"label": "Verifier l''existence de standards de codage securise", "hint": "Guide de coding interne par langage", "evidence_type": "document"},
{"label": "Confirmer l''utilisation d''outils SAST", "hint": "SonarQube, Checkmarx, Semgrep dans CI", "evidence_type": "test"},
{"label": "Verifier les revues de code obligatoires", "hint": "Pull request review obligatoire", "evidence_type": "test"},
{"label": "S''assurer du blocage des vulnerabilites critiques en build", "hint": "Quality gate dans CI/CD", "evidence_type": "test"}
]'),
  ('A.8.29', '[
{"label": "Verifier la realisation de tests de securite avant mise en production", "hint": "DAST, pentest, validation securite", "evidence_type": "document"},
{"label": "Confirmer la couverture des tests OWASP Top 10", "hint": "Rapport de pentest applicatif", "evidence_type": "document"},
{"label": "Verifier la gestion des findings de tests", "hint": "Plan de remediation suivi", "evidence_type": "document"},
{"label": "S''assurer du critere de Go-Live securite", "hint": "Checklist de validation avant deploiement prod", "evidence_type": "document"}
]'),
  ('A.8.30', '[
{"label": "Verifier les exigences securite dans les contrats de developpement externalise", "hint": "Annexe securite avec exigences OWASP, RGPD", "evidence_type": "document"},
{"label": "Confirmer la maitrise du code livre (audit, scan)", "hint": "Revue de code et SAST sur les livrables", "evidence_type": "test"},
{"label": "Verifier les exigences sur le profil des intervenants", "hint": "Background check, NDA", "evidence_type": "document"},
{"label": "S''assurer de la gestion des acces des prestataires", "hint": "Comptes nominatifs, revocation rapide", "evidence_type": "test"}
]'),
  ('A.8.31', '[
{"label": "Verifier la separation des environnements (dev/test/prod)", "hint": "Infrastructures distinctes, acces cloisonnes", "evidence_type": "document"},
{"label": "Confirmer l''absence de donnees prod en environnements inferieurs", "hint": "Anonymisation des donnees de test", "evidence_type": "test"},
{"label": "Verifier les processus de promotion entre environnements", "hint": "Pipeline CI/CD avec validations", "evidence_type": "document"},
{"label": "S''assurer de la separation des roles entre environnements", "hint": "Pas d''acces dev en prod", "evidence_type": "test"}
]'),
  ('A.8.32', '[
{"label": "Verifier l''existence d''un processus formel de change management", "hint": "Procedure CAB, classification des changements", "evidence_type": "document"},
{"label": "Confirmer la tracabilite des changements en production", "hint": "Outil ITSM avec historique", "evidence_type": "test"},
{"label": "Verifier l''evaluation d''impact securite avant changement", "hint": "Champ impact securite dans formulaire CAB", "evidence_type": "document"},
{"label": "S''assurer du processus de rollback en cas d''echec", "hint": "Plan de rollback documente", "evidence_type": "document"}
]'),
  ('A.8.33', '[
{"label": "Verifier la securisation des donnees de test", "hint": "Pas de donnees reelles en test, anonymisation", "evidence_type": "test"},
{"label": "Confirmer la protection des bases de test", "hint": "Acces restreints, chiffrement", "evidence_type": "test"},
{"label": "Verifier l''effacement des donnees de test apres usage", "hint": "Procedure de purge en fin de projet", "evidence_type": "document"},
{"label": "S''assurer de la conformite RGPD sur les donnees de test", "hint": "Validation DPO si donnees reelles utilisees", "evidence_type": "document"}
]'),
  ('A.8.34', '[
{"label": "Verifier les precautions prises lors d''audits techniques", "hint": "Perimetre, fenetre d''intervention, autorisations", "evidence_type": "document"},
{"label": "Confirmer la limitation des outils d''audit aux personnels habilites", "hint": "Acces trace aux outils de pentest", "evidence_type": "test"},
{"label": "Verifier la protection des resultats d''audit", "hint": "Stockage chiffre, acces restreint", "evidence_type": "test"},
{"label": "S''assurer de la non-perturbation des systemes pendant l''audit", "hint": "Coordination avec operations, fenetre dediee", "evidence_type": "interview"}
]')
) as m(code, checklist),
public.domains d
where c.domain_id = d.id
  and d.framework_id = '00000000-0000-0000-0000-000000000010'
  and c.code = m.code;
