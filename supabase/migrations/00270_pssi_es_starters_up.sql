-- 00270 — Starters plateforme pour le référentiel PSSI-ES (framework 00000000-...-017).
-- Met la PSSI-ES à parité avec ISO 27001 sur les aides prédéfinies par contrôle :
--   (1) finding_templates : constats-types liés (catalogue lié, Lot 3) ;
--   (2) controls.audit_checklist : points à vérifier (chips Lot 1) ;
--   (3) control_mappings : crosswalk intra-PSSI-ES (cohérence + systémique, Lot 2).
-- Résolution des contrôles par code (REG N-M) au sein du framework PSSI-ES.

-- Raccourci : ids des contrôles PSSI-ES.
-- (utilisé via sous-requête « domain_id in (domaines du framework 017) »)

-- ========== (1) Bibliothèque de constats-types (platform) ==========
insert into public.finding_templates (scope, control_id, classification, description, risks, recommendations)
select 'platform', c.id, t.classif, t.descr, t.risks, t.recos
from (values
  ('REG 17-5', 'major_nc',
    'Aucune revue périodique des droits d''accès n''est réalisée.',
    ARRAY['Accumulation de droits indus exploitables par un collaborateur ou un tiers.', 'Comptes de personnes parties toujours actifs.'],
    ARRAY['Instaurer une revue périodique formalisée et validée des droits d''accès.']),
  ('REG 17-5', 'minor_nc',
    'La revue des droits d''accès existe mais n''est pas tracée régulièrement.',
    ARRAY['Maintien de droits obsolètes après un changement de poste.'],
    ARRAY['Formaliser et horodater la revue des droits d''accès (fréquence trimestrielle).']),
  ('REG 18-7', 'minor_nc',
    'Des mots de passe par défaut n''ont pas été changés à la mise en service.',
    ARRAY['Compromission triviale via des identifiants constructeur connus.'],
    ARRAY['Imposer le changement des mots de passe par défaut avant mise en production.']),
  ('REG 18-4', 'major_nc',
    'L''authentification forte n''est pas exigée pour l''accès aux données classifiées.',
    ARRAY['Accès non autorisé aux informations sensibles en cas de vol d''identifiant.'],
    ARRAY['Déployer l''authentification forte sur les accès aux données classifiées.']),
  ('REG 25-4', 'major_nc',
    'Les activités des administrateurs ne sont pas journalisées.',
    ARRAY['Perte d''imputabilité des actions privilégiées.', 'Non-détection d''un incident interne.'],
    ARRAY['Activer et protéger la journalisation des activités administrateurs.']),
  ('REG 25-6', 'minor_nc',
    'Les journaux ne font l''objet d''aucune vérification régulière.',
    ARRAY['Détection tardive des événements de sécurité.'],
    ARRAY['Définir une revue périodique des journaux et des alertes associées.']),
  ('REG 24-1', 'major_nc',
    'Les sauvegardes des données critiques ne sont pas réalisées périodiquement.',
    ARRAY['Perte de données irréversible en cas de sinistre.'],
    ARRAY['Planifier des sauvegardes périodiques des données et configurations critiques.']),
  ('REG 24-7', 'major_nc',
    'Les sauvegardes ne sont pas testées par des restaurations périodiques.',
    ARRAY['Sauvegardes inexploitables le jour d''un incident (perte de données).'],
    ARRAY['Planifier des tests de restauration réguliers et tracés.']),
  ('REG 23-1', 'minor_nc',
    'Des postes ou terminaux ne disposent pas d''un antivirus à jour.',
    ARRAY['Propagation de codes malveillants sur le parc.'],
    ARRAY['Déployer et maintenir à jour une protection anti-malware sur tous les terminaux.']),
  ('REG 8-2', 'minor_nc',
    'L''accès physique aux zones sécurisées n''est pas contrôlé par badge ou autorisation.',
    ARRAY['Intrusion physique non tracée dans les zones sensibles.'],
    ARRAY['Mettre en place un contrôle d''accès physique (badge/autorisation écrite) aux zones sécurisées.'])
) as t(code, classif, descr, risks, recos)
join public.controls c on c.code = t.code
  and c.domain_id in (select id from public.domains where framework_id = '00000000-0000-0000-0000-000000000017');

-- ========== (2) Points à vérifier (audit_checklist) ==========
update public.controls c
set audit_checklist = v.checklist::jsonb
from (values
  ('REG 17-5', '[{"label":"Une revue périodique des droits d''accès est-elle réalisée ?"},{"label":"Est-elle tracée et validée ?"},{"label":"Les droits des partants sont-ils retirés ?","evidence_type":"document"}]'),
  ('REG 18-7', '[{"label":"Les mots de passe par défaut ont-ils tous été changés ?","evidence_type":"interview"}]'),
  ('REG 18-4', '[{"label":"L''authentification forte est-elle exigée pour les données classifiées ?"}]'),
  ('REG 25-4', '[{"label":"Les actions des administrateurs sont-elles journalisées ?"},{"label":"Les journaux sont-ils protégés contre l''altération ?"}]'),
  ('REG 25-6', '[{"label":"Les journaux sont-ils revus régulièrement ?"},{"label":"Des alertes sont-elles définies ?"}]'),
  ('REG 24-1', '[{"label":"Les sauvegardes sont-elles périodiques ?"},{"label":"Couvrent-elles données et configurations ?","evidence_type":"document"}]'),
  ('REG 24-7', '[{"label":"Des tests de restauration sont-ils réalisés ?"},{"label":"Sont-ils tracés ?","evidence_type":"document"}]'),
  ('REG 23-1', '[{"label":"Un antivirus est-il installé sur tous les terminaux ?"},{"label":"Est-il à jour ?","evidence_type":"observation"}]'),
  ('REG 8-2', '[{"label":"L''accès aux zones sécurisées requiert-il badge ou autorisation ?","evidence_type":"observation"}]'),
  ('REG 6-1', '[{"label":"Un inventaire des actifs existe-t-il ?"},{"label":"Est-il tenu à jour ?","evidence_type":"document"}]'),
  ('REG 19-8', '[{"label":"Les réseaux sont-ils cloisonnés (physique et/ou logique) ?"}]'),
  ('REG 29-6', '[{"label":"Le plan de continuité est-il testé périodiquement ?","evidence_type":"document"}]')
) as v(code, checklist)
where c.code = v.code
  and c.domain_id in (select id from public.domains where framework_id = '00000000-0000-0000-0000-000000000017');

-- ========== (3) Crosswalk intra-PSSI-ES ==========
with pairs(src, tgt, rel) as (
  values
    ('REG 17-2', 'REG 17-3', 'equivalent'),
    ('REG 17-5', 'REG 17-6', 'equivalent'),
    ('REG 18-3', 'REG 18-4', 'related'),
    ('REG 18-7', 'REG 18-9', 'related'),
    ('REG 18-4', 'REG 18-5', 'related'),
    ('REG 25-1', 'REG 25-7', 'equivalent'),
    ('REG 25-2', 'REG 25-1', 'related'),
    ('REG 25-3', 'REG 25-5', 'related'),
    ('REG 25-4', 'REG 25-6', 'related'),
    ('REG 24-1', 'REG 24-7', 'related'),
    ('REG 24-1', 'REG 24-4', 'related'),
    ('REG 23-1', 'REG 23-2', 'related'),
    ('REG 23-2', 'REG 23-3', 'related'),
    ('REG 19-1', 'REG 19-2', 'related'),
    ('REG 19-1', 'REG 19-8', 'related'),
    ('REG 8-2', 'REG 8-3', 'related'),
    ('REG 8-2', 'REG 8-6', 'related'),
    ('REG 6-1', 'REG 6-2', 'related'),
    ('REG 6-1', 'REG 6-3', 'related'),
    ('REG 29-5', 'REG 29-6', 'equivalent'),
    ('REG 27-2', 'REG 27-3', 'related'),
    ('REG 27-3', 'REG 27-5', 'related')
)
insert into public.control_mappings (source_control_id, target_control_id, relationship)
select cs.id, ct.id, p.rel
from pairs p
join public.controls cs on cs.code = p.src
  and cs.domain_id in (select id from public.domains where framework_id = '00000000-0000-0000-0000-000000000017')
join public.controls ct on ct.code = p.tgt
  and ct.domain_id in (select id from public.domains where framework_id = '00000000-0000-0000-0000-000000000017')
on conflict (source_control_id, target_control_id) do nothing;
