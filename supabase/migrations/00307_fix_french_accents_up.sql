-- Corrige les accents français manquants dans le CONTENU seedé (ce que voient les
-- utilisateurs). Approche sûre : on applique une fonction de correction UNIQUEMENT aux
-- colonnes de TEXTE AFFICHÉ (name/text/description/guidance...), jamais aux colonnes de
-- code/enum (category/type/code/slug) -> aucun risque de casser un filtre applicatif.
-- La fonction utilise des frontières de mots (\y) et ne touche pas le texte déjà
-- accentué (idempotente, ré-appliquable sans effet de bord). CLAUDE.md §5.

create or replace function public.fix_fr_accents(t text) returns text
language plpgsql immutable as $$
declare
  pairs text[] := array[
    -- minuscules (le \1 conserve le pluriel éventuel)
    'securite(s?)','sécurité\1', 'conformite(s?)','conformité\1', 'entite(s?)','entité\1',
    'integrite(s?)','intégrité\1', 'responsabilite(s?)','responsabilité\1', 'activite(s?)','activité\1',
    'strategie(s?)','stratégie\1', 'strategique(s?)','stratégique\1', 'procedure(s?)','procédure\1',
    'referentiel(s?)','référentiel\1', 'evaluation(s?)','évaluation\1', 'element(s?)','élément\1',
    'critere(s?)','critère\1', 'perimetre(s?)','périmètre\1', 'reglementaire(s?)','réglementaire\1',
    'reglementation(s?)','réglementation\1', 'detection(s?)','détection\1', 'prealable(s?)','préalable\1',
    'necessaire(s?)','nécessaire\1', 'numerique(s?)','numérique\1', 'periodique(s?)','périodique\1',
    'systeme(s?)','système\1', 'controle(s?)','contrôle\1', 'probleme(s?)','problème\1',
    'modele(s?)','modèle\1', 'donnee(s?)','donnée\1', 'geographique(s?)','géographique\1',
    'operationnel(les|le|s)?','opérationnel\1', 'designe(es|e|s)?','désigné\1', 'designer','désigner',
    'dedie(es|e|s)?','dédié\1', 'realise(es|e|s)?','réalisé\1', 'verifie(es|e|s)?','vérifié\1',
    'identifie(es|e|s)?','identifié\1', 'privilegie(es|e|s)?','privilégié\1', 'protege(es|e|s)?','protégé\1',
    'cree(es|e|s)?','créé\1', 'nomme(es|e|s)?','nommé\1', 'formalise(es|e|s)?','formalisé\1',
    'organise(es|e|s)?','organisé\1', 'concerne(es|e|s)?','concerné\1', 'liee(s?)','liée\1',
    'gere(es|e|s)?','géré\1', 'gerer','gérer', 'deja','déjà', 'etai(t|ent)','étai\1',
    'acces','accès', 'brievement','brièvement', 'presidentiel(les|le|s)?','présidentiel\1',
    'regulierement','régulièrement', 'periodiquement','périodiquement', 'decrivez','décrivez',
    'operationnelle(s?)','opérationnelle\1', 'operationnalisation','opérationnalisation',
    -- Capitalisées (début de phrase / position)
    'Securite(s?)','Sécurité\1', 'Conformite(s?)','Conformité\1', 'Systeme(s?)','Système\1',
    'Controle(s?)','Contrôle\1', 'Entite(s?)','Entité\1', 'Referentiel(s?)','Référentiel\1',
    'Procedure(s?)','Procédure\1', 'Donnee(s?)','Donnée\1', 'Element(s?)','Élément\1',
    'Critere(s?)','Critère\1', 'Evaluation(s?)','Évaluation\1', 'Reglementaire(s?)','Réglementaire\1',
    'Integrite(s?)','Intégrité\1', 'Responsabilite(s?)','Responsabilité\1', 'Activite(s?)','Activité\1',
    'Strategie(s?)','Stratégie\1', 'Perimetre(s?)','Périmètre\1', 'Prealable','Préalable',
    'Necessaire','Nécessaire', 'Detection','Détection', 'Geographique(s?)','Géographique\1',
    'Numerique(s?)','Numérique\1', 'Operationnel(les|le|s)?','Opérationnel\1', 'Gerer','Gérer',
    'Gere(es|e|s)?','Géré\1', 'Deja','Déjà', 'Acces','Accès', 'Decrivez','Décrivez',
    'Organise(es|e|s)?','Organisé\1', 'Protege(es|e|s)?','Protégé\1', 'Designer','Désigner',
    'Realise(es|e|s)?','Réalisé\1', 'Verifie(es|e|s)?','Vérifié\1', 'Identifie(es|e|s)?','Identifié\1',
    'Formalise(es|e|s)?','Formalisé\1', 'Nomme(es|e|s)?','Nommé\1', 'Concerne(es|e|s)?','Concerné\1',
    'Cree(es|e|s)?','Créé\1', 'Dedie(es|e|s)?','Dédié\1', 'Privilegie(es|e|s)?','Privilégié\1',
    'Etai(t|ent)','Étai\1', 'Modele(s?)','Modèle\1', 'Probleme(s?)','Problème\1'
  ];
  i int;
begin
  if t is null then return null; end if;
  i := 1;
  while i < array_length(pairs, 1) loop
    t := regexp_replace(t, '\y' || pairs[i] || '\y', pairs[i+1], 'g');
    i := i + 2;
  end loop;
  return t;
end $$;

-- Applique aux colonnes de TEXTE AFFICHÉ (no-op sur le déjà-accentué).
update public.questions set text = public.fix_fr_accents(text), description = public.fix_fr_accents(description);
update public.controls set name = public.fix_fr_accents(name), description = public.fix_fr_accents(description), guidance = public.fix_fr_accents(guidance);
update public.domains set name = public.fix_fr_accents(name), description = public.fix_fr_accents(description);
update public.frameworks set name = public.fix_fr_accents(name), description = public.fix_fr_accents(description);
update public.questionnaire_templates set name = public.fix_fr_accents(name), description = public.fix_fr_accents(description);
update public.evidence_catalog set name = public.fix_fr_accents(name), description = public.fix_fr_accents(description);
update public.regulatory_catalog set name = public.fix_fr_accents(name), description = public.fix_fr_accents(description), penalties = public.fix_fr_accents(penalties), authority = public.fix_fr_accents(authority);
update public.control_mappings set notes = public.fix_fr_accents(notes);
