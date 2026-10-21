-- 00346 (UP) - Referentiel PASI : Accreditation des Prestataires d'Audit des SI.
-- Source : Note N 1257/PR/SG/CNC/DCSSI/DIE/DPSSAN du 30 octobre 2023 (Commission
-- Nationale de Cryptologie / DCSSI - Presidence de la Republique du Senegal),
-- prise en application de la Circulaire Presidentielle N 098/PR du 01 juillet 2021
-- et du decret N 2021-35. Natures d'audit : referentiel N 1055/PR/SG/CNC/DCSSI
-- de juillet 2021. Livre comme MIGRATION (et non seed) pour atterrir via Deploy,
-- comme PSSI-ES - cf. scripts/seed-referentiels.sh.
--
-- Structure : 8 domaines, 49 controles. Chaque controle = un critere auditable du
-- document (criteres section IV, dossier section V, natures section II, procedure section III, classes Annexe 2).
-- Reutilise par Gestu Vendor (evaluation fournisseur) via le picker de referentiels.

insert into public.frameworks (id, name, slug, description, version, publisher, category)
values (
  '00000000-0000-0000-00a5-000000000000',
  'PASI - Accréditation des prestataires d''audit SI (Sénégal)',
  'pasi',
  'Référentiel officiel d''accréditation des Prestataires d''Audit des Systèmes d''Information (PASI), établi par la Commission Nationale de Cryptologie et la Direction générale du Chiffre et de la Sécurité des Systèmes d''Information (DCSSI). Note N 1257/PR/SG/CNC/DCSSI/DIE/DPSSAN du 30 octobre 2023, prise en application de la Circulaire Présidentielle N 098/PR du 01 juillet 2021 et du décret N 2021-35. Fixe les critères, le dossier et la procédure de qualification des cabinets autorisés à conduire l''audit des systèmes d''information des entités de l''État du Sénégal, sur les six natures d''audit du référentiel N 1055/PR/SG/CNC/DCSSI de juillet 2021. Qualification accordée pour une durée maximale de trois (03) ans, publiée au Journal Officiel et sur le site de la DCSSI.',
  '1.0',
  'Commission Nationale de Cryptologie / DCSSI - Présidence de la République du Sénégal',
  'evaluation'
)
on conflict (id) do nothing;

-- Nettoyage preventif (idempotent)
delete from public.controls where domain_id in (
  select id from public.domains where framework_id = '00000000-0000-0000-00a5-000000000000'
);
delete from public.domains where framework_id = '00000000-0000-0000-00a5-000000000000';

-- ============================================================
-- Domaines (8)
-- ============================================================
insert into public.domains (id, framework_id, code, name, description, sort_order) values
('00000000-0000-0000-00a5-0000000000d1', '00000000-0000-0000-00a5-000000000000', 'ELIG', 'Éligibilité juridique et administrative', 'Conditions de forme juridique, de nationalité du capital, de régularité fiscale et sociale, de moralité et d''identité exigées du prestataire candidat (critères section IV, dossier section V).', 1),
('00000000-0000-0000-00a5-0000000000d2', '00000000-0000-0000-00a5-000000000000', 'RHA', 'Qualification des ressources humaines d''audit', 'Expertise avérée, couverture des natures d''audit et certifications professionnelles reconnues du personnel d''audit (critères section IV, dossier section V).', 2),
('00000000-0000-0000-00a5-0000000000d3', '00000000-0000-0000-00a5-000000000000', 'DEO', 'Déontologie, indépendance et confidentialité', 'Indépendance, impartialité, politiques et procédures internes, confidentialité et protection des informations sensibles (critères section IV, candidature section III).', 3),
('00000000-0000-0000-00a5-0000000000d4', '00000000-0000-0000-00a5-000000000000', 'MET', 'Méthodologie et outils d''audit', 'Méthodologie d''audit claire et documentée, adéquation des outils et conformité au référentiel d''audit N 1055/PR/SG/CNC/DCSSI (critères section IV, objectifs section I).', 4),
('00000000-0000-0000-00a5-0000000000d5', '00000000-0000-0000-00a5-000000000000', 'NAT', 'Couverture des natures d''audit', 'Compétence attestée sur les six natures d''audit du référentiel N 1055/PR/SG/CNC/DCSSI de juillet 2021 (section II). Qualification exigée dans au moins deux natures.', 5),
('00000000-0000-0000-00a5-0000000000d6', '00000000-0000-0000-00a5-000000000000', 'REF', 'Références, expérience et marchés publics', 'Preuves d''audits réalisés, attestations des maîtres d''ouvrage, respect des délais de dépôt et des procédures de marchés publics (objectifs section I, dossier section V).', 6),
('00000000-0000-0000-00a5-0000000000d7', '00000000-0000-0000-00a5-000000000000', 'LIV', 'Qualité des livrables et reporting', 'Capacité à produire des rapports d''audit complets, précis, pertinents et dans les délais, mettant en évidence les faiblesses et formulant des recommandations (critères section IV).', 7),
('00000000-0000-0000-00a5-0000000000d8', '00000000-0000-0000-00a5-000000000000', 'DOS', 'Dossier, procédure et suivi', 'Complétude et dépôt du dossier, déclaration des SI cibles par classe, notification des modifications, renouvellement anticipé et acceptation du suivi (section III, section V, section VII, Annexe 1 et 2).', 8);

-- ============================================================
-- ELIG - Éligibilité juridique et administrative (8)
-- ============================================================
insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-00a5-0000000000d1', 'ELIG-01', 'Société de droit sénégalais', 'Le prestataire est constitué sous forme de société de droit sénégalais, avec un statut juridique reconnu et approuvé.', 'Critère section IV. Un prestataire basé à l''étranger reste admissible sous réserve de régularité vis-à-vis de l''Administration de son pays.', 1),
('00000000-0000-0000-00a5-0000000000d1', 'ELIG-02', 'Capital majoritairement national', 'Plus de 50 % du capital de la société est détenu par des personnes de nationalité sénégalaise.', 'Critère section IV. Justifié par la liste des associés et la répartition du capital (Annexe 1, section Capital et associés).', 2),
('00000000-0000-0000-00a5-0000000000d1', 'ELIG-03', 'Régularité fiscale', 'Le prestataire est en règle vis-à-vis de l''Administration fiscale du Sénégal, ou de celle de son pays s''il est basé à l''étranger.', 'Critère section IV. Attestation de régularité fiscale à jour.', 3),
('00000000-0000-0000-00a5-0000000000d1', 'ELIG-04', 'Régularité sociale', 'Le prestataire est en règle en matière de sécurité sociale auprès de l''Inspection du Travail, de la Caisse de sécurité sociale et de l''IPRES (ou des organismes équivalents de son pays d''immatriculation).', 'Critère section IV. Références : IPRES, Caisse de sécurité sociale, Inspection du Travail.', 4),
('00000000-0000-0000-00a5-0000000000d1', 'ELIG-05', 'Inscription au registre de commerce', 'Attestation d''inscription au registre de commerce (RCCM) et copie des statuts de la structure fournies.', 'Dossier section V. Pièces exigées : copie des statuts, attestation RCCM.', 5),
('00000000-0000-0000-00a5-0000000000d1', 'ELIG-06', 'Bonne moralité', 'Le prestataire et ses dirigeants jouissent d''une bonne moralité, établie par les enquêtes de sécurité et de moralité menées par les services compétents de l''État.', 'Critère section IV.', 6),
('00000000-0000-0000-00a5-0000000000d1', 'ELIG-07', 'Casiers judiciaires et pièces d''identité', 'Casiers judiciaires des auditeurs proposés fournis, ainsi que les copies légalisées des pièces d''identité des dirigeants, des organes d''administration et des auditeurs.', 'Dossier section V.', 7),
('00000000-0000-0000-00a5-0000000000d1', 'ELIG-08', 'Identification du siège social', 'La dénomination et l''adresse du siège social du prestataire sont déclarées et exactes ; elles figureront dans la décision de qualification.', 'section VI. Éléments repris dans la décision d''accréditation.', 8);

-- ============================================================
-- RHA - Qualification des ressources humaines d'audit (9)
-- ============================================================
insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-00a5-0000000000d2', 'RHA-01', 'Expertise avérée en audit SI', 'Le prestataire justifie d''une expertise avérée dans l''audit des systèmes d''information, en fournissant des résultats d''audits effectués.', 'Critère section IV ; candidature section III (références et expériences passées).', 1),
('00000000-0000-0000-00a5-0000000000d2', 'RHA-02', 'Qualification dans au moins deux natures', 'Le prestataire est qualifié au minimum dans deux (02) des six natures d''audit définies au référentiel N 1055/PR/SG/CNC/DCSSI.', 'Critère section IV ; section II.', 2),
('00000000-0000-0000-00a5-0000000000d2', 'RHA-03', 'Au moins un auditeur par domaine demandé', 'Le prestataire dispose d''au moins un auditeur dans chaque domaine (nature d''audit) de qualification demandé.', 'Critère section IV.', 3),
('00000000-0000-0000-00a5-0000000000d2', 'RHA-04', 'Certification d''audit SI (CISA)', 'Au moins un auditeur est titulaire de la certification CISA (Certified Information Systems Auditor).', 'Critère section IV : certifications professionnelles reconnues.', 4),
('00000000-0000-0000-00a5-0000000000d2', 'RHA-05', 'Certifications en sécurité SI (CISSP, CISM)', 'Le personnel dispose de certifications de sécurité et de gestion de la sécurité : CISSP (sécurité des SI) et CISM (gouvernance, gestion des risques et conformité).', 'Critère section IV.', 5),
('00000000-0000-0000-00a5-0000000000d2', 'RHA-06', 'Certifications SMSI et sécurité applicative', 'Compétences attestées par ISO 27001 Lead Auditor / Lead Implementor (SMSI) et ISO 27034 (sécurité des applications).', 'Critère section IV.', 6),
('00000000-0000-0000-00a5-0000000000d2', 'RHA-07', 'Certifications offensives (OSCP, CEH)', 'Compétences en tests d''intrusion attestées par OSCP (Offensive Security Certified Professional) et/ou CEH (Certified Ethical Hacker).', 'Critère section IV.', 7),
('00000000-0000-0000-00a5-0000000000d2', 'RHA-08', 'Certifications complémentaires', 'Certifications de gouvernance et de services (COBIT, ITIL), de continuité d''activité (ISO 22301) et de gestion de projet (PMP) ; spécialistes confirmés en gestion de l''énergie le cas échéant.', 'Critère section IV.', 8),
('00000000-0000-0000-00a5-0000000000d2', 'RHA-09', 'Dossier RH et formation continue', 'CV, diplômes, certificats de formation et contrats de travail des auditeurs fournis ; engagement de maintien à jour des compétences par la formation continue et la veille sur les menaces et technologies.', 'Critère section IV ; dossier section V.', 9);

-- ============================================================
-- DEO - Déontologie, indépendance et confidentialité (5)
-- ============================================================
insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-00a5-0000000000d3', 'DEO-01', 'Indépendance et impartialité', 'Les auditeurs sont indépendants et impartiaux, afin d''éviter tout conflit d''intérêts susceptible de compromettre l''objectivité de l''évaluation.', 'Critère section IV.', 1),
('00000000-0000-0000-00a5-0000000000d3', 'DEO-02', 'Politiques et procédures internes', 'Le prestataire dispose de politiques et de procédures d''audit internes formalisées.', 'Candidature section III.c ; critère section IV.', 2),
('00000000-0000-0000-00a5-0000000000d3', 'DEO-03', 'Confidentialité des informations sensibles', 'Les politiques et procédures garantissent la confidentialité et la protection des informations sensibles auxquelles les auditeurs peuvent accéder pendant l''audit.', 'Critère section IV.', 3),
('00000000-0000-0000-00a5-0000000000d3', 'DEO-04', 'Respect des règles déontologiques et de sécurité', 'L''organisation du travail respecte les règles déontologiques et de sécurité.', 'Objectifs section I.', 4),
('00000000-0000-0000-00a5-0000000000d3', 'DEO-05', 'Engagement de confidentialité des auditeurs', 'Chaque auditeur signe un engagement de confidentialité et de non-divulgation.', 'Critère section IV. Aligné sur la PSSI-ES (habilitation et charte de confidentialité).', 5);

-- ============================================================
-- MET - Méthodologie et outils d'audit (6)
-- ============================================================
insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-00a5-0000000000d4', 'MET-01', 'Méthodologie d''audit documentée', 'Le prestataire dispose d''une méthodologie d''audit claire et bien définie, décrite dans un document du dossier de demande.', 'Critère section IV ; dossier section V (document décrivant la méthodologie).', 1),
('00000000-0000-0000-00a5-0000000000d4', 'MET-02', 'Collecte d''informations', 'La méthodologie couvre la collecte structurée des informations nécessaires à l''audit.', 'Critère section IV.', 2),
('00000000-0000-0000-00a5-0000000000d4', 'MET-03', 'Analyse des risques', 'La méthodologie comprend une étape explicite d''analyse des risques.', 'Critère section IV.', 3),
('00000000-0000-0000-00a5-0000000000d4', 'MET-04', 'Évaluation des contrôles de sécurité', 'La méthodologie prévoit l''évaluation des contrôles de sécurité en place.', 'Critère section IV.', 4),
('00000000-0000-0000-00a5-0000000000d4', 'MET-05', 'Documentation et recommandations', 'La méthodologie prévoit la documentation des résultats et la formulation de recommandations exploitables.', 'Critère section IV.', 5),
('00000000-0000-0000-00a5-0000000000d4', 'MET-06', 'Adéquation des outils et conformité au référentiel d''audit', 'Les outils d''audit sont efficaces et adéquats ; la démarche est conforme au référentiel d''audit N 1055/PR/SG/CNC/DCSSI de juillet 2021.', 'Objectifs section I ; critère section IV.', 6);

-- ============================================================
-- NAT - Couverture des natures d'audit (6)
-- ============================================================
insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-00a5-0000000000d5', 'NAT-01', 'Audit de l''infrastructure physique', 'Compétence attestée pour la nature d''audit de l''infrastructure physique.', 'section II, nature 1. Au moins un auditeur dédié si cette nature est demandée.', 1),
('00000000-0000-0000-00a5-0000000000d5', 'NAT-02', 'Audit organisationnel et logique', 'Compétence attestée pour la nature d''audit organisationnel et logique.', 'section II, nature 2.', 2),
('00000000-0000-0000-00a5-0000000000d5', 'NAT-03', 'Audit communicationnel', 'Compétence attestée pour la nature d''audit communicationnel.', 'section II, nature 3.', 3),
('00000000-0000-0000-00a5-0000000000d5', 'NAT-04', 'Audit de la sécurité des SI', 'Compétence attestée pour la nature d''audit de la sécurité des systèmes d''information.', 'section II, nature 4.', 4),
('00000000-0000-0000-00a5-0000000000d5', 'NAT-05', 'Audit des projets et des marchés liés aux SI', 'Compétence attestée pour la nature d''audit des projets et des marchés liés aux systèmes d''information.', 'section II, nature 5.', 5),
('00000000-0000-0000-00a5-0000000000d5', 'NAT-06', 'Audit de la conformité et de la réglementation', 'Compétence attestée pour la nature d''audit de la conformité et de la réglementation.', 'section II, nature 6.', 6);

-- ============================================================
-- REF - Références, expérience et marchés publics (5)
-- ============================================================
insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-00a5-0000000000d6', 'REF-01', 'Résultats d''audits effectués', 'Le prestataire fournit des preuves de résultats d''audits SI réalisés.', 'Critère section IV ; candidature section III.e.', 1),
('00000000-0000-0000-00a5-0000000000d6', 'REF-02', 'Attestations des maîtres d''ouvrage', 'Attestations délivrées par les maîtres d''ouvrage au profit desquels des prestations d''audit ont été exécutées, précisant la nature de la prestation et sa date.', 'Dossier section V.', 2),
('00000000-0000-0000-00a5-0000000000d6', 'REF-03', 'Échantillons d''audits précédents', 'Le prestataire met à disposition des échantillons d''audits précédents pour l''évaluation approfondie.', 'Procédure section III.3 (évaluation approfondie).', 3),
('00000000-0000-0000-00a5-0000000000d6', 'REF-04', 'Respect des délais de dépôt des rapports', 'Historique de respect des délais arrêtés pour le dépôt des rapports après audit.', 'Objectifs section I.', 4),
('00000000-0000-0000-00a5-0000000000d6', 'REF-05', 'Respect des procédures de marchés publics', 'Respect des procédures de passation des marchés publics.', 'Objectifs section I.', 5);

-- ============================================================
-- LIV - Qualité des livrables et reporting (4)
-- ============================================================
insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-00a5-0000000000d7', 'LIV-01', 'Rapports complets, précis et pertinents', 'Le prestataire est en mesure de produire des rapports d''audit complets, précis et pertinents.', 'Critère section IV.', 1),
('00000000-0000-0000-00a5-0000000000d7', 'LIV-02', 'Respect des délais de production', 'Les rapports sont produits dans des délais raisonnables.', 'Critère section IV.', 2),
('00000000-0000-0000-00a5-0000000000d7', 'LIV-03', 'Mise en évidence des faiblesses de sécurité', 'Les rapports mettent clairement en évidence les faiblesses de sécurité identifiées.', 'Critère section IV.', 3),
('00000000-0000-0000-00a5-0000000000d7', 'LIV-04', 'Recommandations claires', 'Les rapports formulent des recommandations claires pour améliorer la sécurité des systèmes d''information.', 'Critère section IV.', 4);

-- ============================================================
-- DOS - Dossier, procédure et suivi (6)
-- ============================================================
insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-00a5-0000000000d8', 'DOS-01', 'Complétude du dossier de demande', 'Le dossier de qualification est complet et conforme au formulaire : statuts, RCCM, associés et nationalités, pièces d''identité, moyens humains et techniques, casiers, CV, contrats, attestations et méthodologie.', 'Dossier section V ; Annexe 1.', 1),
('00000000-0000-0000-00a5-0000000000d8', 'DOS-02', 'Dépôt conforme de la demande', 'Le dossier est déposé en trois (03) exemplaires au Secrétariat général de la Présidence de la République, avec la mention "DEMANDE D''ACCREDITATION POUR L''AUDIT DES SYSTEMES D''INFORMATION".', 'section V.', 2),
('00000000-0000-0000-00a5-0000000000d8', 'DOS-03', 'Déclaration des SI cibles par classe', 'Les systèmes d''information cibles sont déclarés par classe (A, B, C ou D) selon l''échelle d''impact (très grave, grave, modéré, limité) de l''Annexe 2.', 'Annexe 1, section SI cibles ; Annexe 2 (classification des actifs).', 3),
('00000000-0000-0000-00a5-0000000000d8', 'DOS-04', 'Notification des modifications', 'Le prestataire informe sans délai la DCSSI de toute modification d''un élément du dossier ayant fondé la qualification.', 'section V ; section VII.', 4),
('00000000-0000-0000-00a5-0000000000d8', 'DOS-05', 'Renouvellement anticipé', 'La demande de renouvellement est déposée au moins soixante (60) jours avant l''expiration de la décision de qualification en cours.', 'section VII. La qualification est accordée pour une durée maximale de trois (03) ans (section VI).', 5),
('00000000-0000-0000-00a5-0000000000d8', 'DOS-06', 'Acceptation du suivi et des évaluations', 'Le prestataire accepte le suivi régulier ainsi que les évaluations périodiques et inopinées durant la période d''accréditation.', 'Procédure section III.6 ; section VI.', 6);
