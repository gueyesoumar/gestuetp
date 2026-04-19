-- Seed: Référentiel Due Diligence Technique — 5 domaines, 42 contrôles
-- Pour investisseurs évaluant la maturité technique de startups/PME

insert into public.frameworks (id, name, slug, description, version, publisher)
values (
  '00000000-0000-0000-0000-000000000015',
  'Due Diligence Technique',
  'due-diligence-tech',
  'Référentiel d''évaluation de la maturité technique pour les investisseurs. Couvre le produit, l''équipe, la sécurité, l''infrastructure et la propriété intellectuelle.',
  '1.0',
  'Gëstu'
);

-- ============================================================
-- Domaines
-- ============================================================

insert into public.domains (id, framework_id, code, name, description, sort_order) values
('00000000-0000-0000-0006-000000000001', '00000000-0000-0000-0000-000000000015', 'PT', 'Produit & Technologie', 'Stack technique, architecture, qualité du code, scalabilité et roadmap', 1),
('00000000-0000-0000-0006-000000000002', '00000000-0000-0000-0000-000000000015', 'ET', 'Équipe technique', 'Compétences, organisation, processus de développement et rétention', 2),
('00000000-0000-0000-0006-000000000003', '00000000-0000-0000-0000-000000000015', 'SD', 'Sécurité & Données', 'Protection des données, conformité RGPD, vulnérabilités et incidents', 3),
('00000000-0000-0000-0006-000000000004', '00000000-0000-0000-0000-000000000015', 'IO', 'Infrastructure & Opérations', 'Hébergement, monitoring, déploiement, disponibilité et coûts', 4),
('00000000-0000-0000-0006-000000000005', '00000000-0000-0000-0000-000000000015', 'PI', 'Propriété Intellectuelle & Risques', 'IP, dépendances, licences, dette technique et lock-in', 5);

-- ============================================================
-- PT — Produit & Technologie (10 contrôles)
-- ============================================================

insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-0006-000000000001', 'PT.01', 'Stack technique documenté', 'Les technologies utilisées (langages, frameworks, bases de données) sont documentées et justifiées', 'Question clé : Quelles technologies sont utilisées et pourquoi ce choix ?', 1),
('00000000-0000-0000-0006-000000000001', 'PT.02', 'Architecture logicielle documentée', 'L''architecture (monolithe, microservices, serverless) est documentée avec des schémas', 'Question clé : L''architecture est-elle cohérente et évoluable ?', 2),
('00000000-0000-0000-0006-000000000001', 'PT.03', 'Qualité du code (standards, reviews)', 'Des standards de code existent, des code reviews sont pratiquées, du linting est en place', 'Question clé : Y a-t-il des code reviews systématiques et des règles de qualité ?', 3),
('00000000-0000-0000-0006-000000000001', 'PT.04', 'Couverture de tests', 'Des tests unitaires, d''intégration et/ou E2E existent avec un taux de couverture mesuré', 'Question clé : Quel est le niveau de tests automatisés ?', 4),
('00000000-0000-0000-0006-000000000001', 'PT.05', 'Gestion du versioning (Git)', 'Le code est versionné avec Git, une stratégie de branching est en place (GitFlow, trunk-based)', 'Question clé : Le code est-il versionné proprement avec un historique exploitable ?', 5),
('00000000-0000-0000-0006-000000000001', 'PT.06', 'Documentation technique', 'Le code, les API et l''architecture sont documentés (README, Swagger, ADR)', 'Question clé : Un nouveau développeur peut-il onboarder rapidement ?', 6),
('00000000-0000-0000-0006-000000000001', 'PT.07', 'Scalabilité de l''architecture', 'L''architecture peut supporter une croissance significative (x10 utilisateurs, x10 données)', 'Question clé : Le produit peut-il absorber la croissance prévue sans refonte majeure ?', 7),
('00000000-0000-0000-0006-000000000001', 'PT.08', 'Performance et temps de réponse', 'Les performances sont mesurées, les temps de réponse sont dans les seuils acceptables', 'Question clé : Le produit est-il rapide et réactif pour les utilisateurs ?', 8),
('00000000-0000-0000-0006-000000000001', 'PT.09', 'Roadmap produit formalisée', 'Une roadmap technique existe, est alignée avec la roadmap business et réaliste', 'Question clé : La vision technique est-elle claire et exécutable ?', 9),
('00000000-0000-0000-0006-000000000001', 'PT.10', 'Dette technique identifiée et gérée', 'La dette technique est connue, documentée et un plan de résorption existe', 'Question clé : La dette technique est-elle maîtrisée ou hors de contrôle ?', 10);

-- ============================================================
-- ET — Équipe technique (8 contrôles)
-- ============================================================

insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-0006-000000000002', 'ET.01', 'Organigramme et rôles techniques', 'L''équipe technique est structurée avec des rôles clairs (CTO, lead dev, devops, etc.)', 'Question clé : Qui fait quoi ? Y a-t-il un leadership technique clair ?', 1),
('00000000-0000-0000-0006-000000000002', 'ET.02', 'Compétences clés identifiées', 'Les compétences critiques sont couvertes et il n''y a pas de trou majeur', 'Question clé : L''équipe a-t-elle les compétences pour exécuter la roadmap ?', 2),
('00000000-0000-0000-0006-000000000002', 'ET.03', 'Dépendance aux personnes clés (key-man risk)', 'Le risque de départ d''une personne clé est identifié et mitigé (documentation, bus factor > 1)', 'Question clé : Que se passe-t-il si le CTO ou le lead dev part demain ?', 3),
('00000000-0000-0000-0006-000000000002', 'ET.04', 'Processus de recrutement technique', 'Le processus de recrutement technique est structuré (test technique, entretiens, onboarding)', 'Question clé : L''entreprise peut-elle recruter et intégrer efficacement ?', 4),
('00000000-0000-0000-0006-000000000002', 'ET.05', 'Méthodologie de développement (Agile/Scrum)', 'Le développement suit une méthodologie structurée avec des sprints, daily standups, rétrospectives', 'Question clé : Le développement est-il organisé et prévisible ?', 5),
('00000000-0000-0000-0006-000000000002', 'ET.06', 'CI/CD en place', 'L''intégration continue et le déploiement continu sont automatisés', 'Question clé : Le déploiement est-il automatisé, fiable et rapide ?', 6),
('00000000-0000-0000-0006-000000000002', 'ET.07', 'Gestion des incidents et astreintes', 'Un processus de gestion des incidents de production existe avec des astreintes si nécessaire', 'Question clé : Comment les problèmes en production sont-ils détectés et résolus ?', 7),
('00000000-0000-0000-0006-000000000002', 'ET.08', 'Externalisation et freelances', 'La part du développement externalisé est connue, les risques associés sont évalués', 'Question clé : Quelle part du code a été écrite par des externes ? Quel contrôle ?', 8);

-- ============================================================
-- SD — Sécurité & Données (9 contrôles)
-- ============================================================

insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-0006-000000000003', 'SD.01', 'Politique de sécurité formalisée', 'Une politique de sécurité existe, même minimale, adaptée à la taille de l''entreprise', 'Question clé : La sécurité est-elle prise au sérieux ou totalement ignorée ?', 1),
('00000000-0000-0000-0006-000000000003', 'SD.02', 'Gestion des accès et authentification', 'Les accès aux systèmes critiques sont contrôlés, le MFA est déployé sur les outils sensibles', 'Question clé : Qui a accès à quoi ? Les accès sont-ils maîtrisés ?', 2),
('00000000-0000-0000-0006-000000000003', 'SD.03', 'Chiffrement des données sensibles', 'Les données sensibles (mots de passe, données clients) sont chiffrées en transit et au repos', 'Question clé : Les données critiques sont-elles protégées par du chiffrement ?', 3),
('00000000-0000-0000-0006-000000000003', 'SD.04', 'Conformité RGPD', 'Le registre des traitements existe, les consentements sont gérés, un DPO est désigné si requis', 'Question clé : L''entreprise est-elle conforme au RGPD ? Risque d''amende ?', 4),
('00000000-0000-0000-0006-000000000003', 'SD.05', 'Gestion des données personnelles clients', 'Les données clients sont stockées de manière sécurisée, les accès sont tracés', 'Question clé : Comment les données clients sont-elles stockées et qui y accède ?', 5),
('00000000-0000-0000-0006-000000000003', 'SD.06', 'Tests de sécurité (pentest, scan)', 'Des tests de sécurité (pentest, scan de vulnérabilités) ont été réalisés récemment', 'Question clé : La sécurité a-t-elle été testée par un tiers indépendant ?', 6),
('00000000-0000-0000-0006-000000000003', 'SD.07', 'Historique des incidents de sécurité', 'L''historique des incidents de sécurité est connu, les leçons ont été tirées', 'Question clé : Y a-t-il eu des brèches de sécurité ? Comment ont-elles été gérées ?', 7),
('00000000-0000-0000-0006-000000000003', 'SD.08', 'Sauvegarde et restauration', 'Des sauvegardes automatiques sont en place, les restaurations sont testées', 'Question clé : En cas de perte de données, peut-on restaurer ? En combien de temps ?', 8),
('00000000-0000-0000-0006-000000000003', 'SD.09', 'Plan de réponse aux incidents', 'Un plan de réponse aux incidents existe, même basique, avec des contacts d''urgence', 'Question clé : Que se passe-t-il concrètement en cas de cyberattaque ?', 9);

-- ============================================================
-- IO — Infrastructure & Opérations (8 contrôles)
-- ============================================================

insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-0006-000000000004', 'IO.01', 'Hébergement et environnement de production', 'L''hébergement est documenté (provider, région, type), le choix est justifié', 'Question clé : Où est hébergé le produit ? Le choix est-il pertinent et pérenne ?', 1),
('00000000-0000-0000-0006-000000000004', 'IO.02', 'Coûts d''infrastructure', 'Les coûts d''infrastructure sont connus, suivis et leur évolution est prévisible', 'Question clé : Les coûts cloud sont-ils maîtrisés ? Comment évoluent-ils avec la croissance ?', 2),
('00000000-0000-0000-0006-000000000004', 'IO.03', 'Monitoring et alerting', 'Les systèmes de production sont surveillés avec des alertes en cas d''anomalie', 'Question clé : Les problèmes sont-ils détectés avant que les utilisateurs ne s''en plaignent ?', 3),
('00000000-0000-0000-0006-000000000004', 'IO.04', 'Disponibilité et SLA', 'L''uptime est mesuré, un SLA est défini (même interne), l''historique est disponible', 'Question clé : Le produit est-il fiable ? Quel est l''uptime réel ?', 4),
('00000000-0000-0000-0006-000000000004', 'IO.05', 'Stratégie de déploiement', 'Les déploiements sont fréquents, automatisés et réversibles (rollback)', 'Question clé : Peut-on déployer rapidement et revenir en arrière en cas de problème ?', 5),
('00000000-0000-0000-0006-000000000004', 'IO.06', 'Gestion des environnements', 'Les environnements dev, staging et production sont séparés et cohérents', 'Question clé : Les développeurs testent-ils sur un environnement séparé de la production ?', 6),
('00000000-0000-0000-0006-000000000004', 'IO.07', 'Scalabilité de l''infrastructure', 'L''infrastructure peut scaler horizontalement pour absorber la croissance', 'Question clé : L''infra peut-elle supporter x10 sans refonte majeure ?', 7),
('00000000-0000-0000-0006-000000000004', 'IO.08', 'Plan de reprise d''activité (PRA)', 'Un PRA existe pour les scénarios de perte du provider principal ou d''incident majeur', 'Question clé : Que se passe-t-il si le datacenter ou le provider cloud tombe ?', 8);

-- ============================================================
-- PI — Propriété Intellectuelle & Risques (7 contrôles)
-- ============================================================

insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-0006-000000000005', 'PI.01', 'Propriété du code source', 'L''entreprise est propriétaire de l''intégralité du code source produit', 'Question clé : Qui possède le code ? Y a-t-il des zones grises ?', 1),
('00000000-0000-0000-0006-000000000005', 'PI.02', 'Cession de PI par les fondateurs/employés', 'Les contrats de travail et d''associés incluent une clause de cession de propriété intellectuelle', 'Question clé : Les fondateurs ont-ils cédé leur PI à l''entreprise ?', 2),
('00000000-0000-0000-0006-000000000005', 'PI.03', 'Licences open-source conformes', 'Les licences des bibliothèques open-source utilisées sont identifiées et compatibles (GPL, MIT, Apache)', 'Question clé : Y a-t-il un risque de contamination GPL ou de non-conformité de licence ?', 3),
('00000000-0000-0000-0006-000000000005', 'PI.04', 'Dépendance à des tiers critiques', 'Les dépendances critiques (API, SDK, services) sont identifiées et le risque de lock-in évalué', 'Question clé : Le produit peut-il fonctionner si un fournisseur critique disparaît ?', 4),
('00000000-0000-0000-0006-000000000005', 'PI.05', 'Brevets et marques', 'Les brevets et marques pertinents ont été déposés ou sont en cours de dépôt', 'Question clé : La PI est-elle protégée juridiquement ?', 5),
('00000000-0000-0000-0006-000000000005', 'PI.06', 'Contrats de prestataires techniques', 'Les contrats de développement externe incluent la cession de PI et des clauses de confidentialité', 'Question clé : Le code écrit par des freelances appartient-il bien à l''entreprise ?', 6),
('00000000-0000-0000-0006-000000000005', 'PI.07', 'Risques réglementaires spécifiques', 'Les réglementations sectorielles applicables au produit sont identifiées (fintech, healthtech, edtech)', 'Question clé : Le produit est-il soumis à des réglementations spécifiques ? Sont-elles respectées ?', 7);
