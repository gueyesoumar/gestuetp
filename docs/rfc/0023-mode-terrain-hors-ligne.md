# RFC 0023 - Mode terrain : collecte de preuves hors-ligne

> Statut : **proposition (cadrage, avant tout code)**. Maquette cliquable validée (format mobile).
> Fondé sur : [[RFC 0003]] (moteurs de mission audit/contrôle), [[RFC 0012]] (garde-fou IA anti-exfiltration), [[RFC 0013]] (éditions et capacités data-driven).
> Réutilise : l'éditeur de constats (`src/features/missions/fieldwork/findings/`), `assessment_findings` (migration 00099), le catalogue `finding_templates` par contrôle (migration 00269), `control_assessments` / `controls`, le Storage des preuves, le pipeline `ai-guard`.
> Maquette : prototype « Mode terrain » (liste des contrôles, fiche, capture photo/audio/note, constat enrichi, revue des preuves, synchro hors-ligne).

---

## 1. Problème

L'auditeur en déplacement collecte des preuves sur site (photos de documents et d'installations, observations enregistrées à l'oral, notes), souvent dans des locaux **sans connexion fiable** (salles serveurs, sites isolés, administrations peu connectées). Aujourd'hui :

- Gëstu ETP est un **web responsive** qui ne s'ouvre pas sans réseau : impossible de travailler hors-ligne.
- La saisie des constats est pensée pour le poste de travail (`FindingsEditor`, trois zones texte + catalogue), pas pour une utilisation une-main sur le terrain.
- La preuve audio n'existe pas (pas de capture micro, pas de transcription).

Résultat : l'auditeur prend des notes et des photos sur un outil tiers (téléphone, carnet), puis **ressaisit au bureau**, avec perte de contexte, de temps et de traçabilité.

## 2. Objectif

1. Une **interface terrain épurée**, utilisable une-main, centrée sur la collecte de preuves d'un contrôle.
2. Un fonctionnement **hors-ligne** complet : consulter les contrôles, capturer photo/audio/note, qualifier le constat sans réseau, puis **synchroniser** au retour de connexion.
3. Une **saisie de constat alignée sur le web** : constat / risque / recommandation choisis dans le catalogue **par contrôle** (`finding_templates`) et éditables librement.
4. La **transcription** des notes audio, sous le garde-fou de confidentialité IA.

## 3. Principe directeur

Ne pas construire une seconde application. Le mode terrain est une **surface mobile de la même app**, qui réutilise le modèle de données existant (`control_assessments`, `assessment_findings`, `finding_templates`, Storage) et ajoute trois capacités techniques : **exécution hors-ligne (PWA)**, **stockage local (IndexedDB)**, **file de synchronisation (outbox)**. La transcription est une nouvelle capacité IA soumise à `ai-guard` ([[RFC 0012]]).

## 4. Options

| Option | Hors-ligne | Caméra / micro | Upload en arrière-plan | Effort | Limites |
|---|---|---|---|---|---|
| **A. PWA installable** | oui (service worker + IndexedDB + outbox) | APIs Web (getUserMedia, input capture) | limité | moyen | iOS : synchro en arrière-plan bridée, **éviction possible du stockage**, pas d'upload background fiable |
| **B. Web responsive seul** | **non** | APIs Web | non | faible | ne répond pas au besoin (réseau requis) |
| **C. App native / Capacitor** | oui, robuste | natif | oui | élevé | build mobile + stores, maintenance d'un shell natif |

Notes :
- **A** réutilise 100 % du code web, se déploie sur Vercel comme aujourd'hui, s'installe via « Ajouter à l'écran d'accueil ». C'est le chemin le plus court qui répond au besoin.
- **C** apporte la robustesse terrain (stockage sûr, upload en arrière-plan, caméra native) mais au prix d'un build mobile. C'est une **v2** si la fiabilité l'exige.
- **B** est écarté (ne résout pas le hors-ligne).

## 5. Recommandation

**Option A (PWA installable) en v1**, avec une trajectoire ouverte vers **Capacitor (Option C) en v2** si la fiabilité terrain l'impose (longues coupures, iOS, gros volumes média, upload en arrière-plan). Vu le contexte (connectivité incertaine, parc probablement Android), la PWA couvre l'essentiel du besoin rapidement.

## 6. Architecture (PWA, v1)

- **Shell applicatif en cache** : un service worker met en cache le code de l'app (precache du build Vite + runtime caching). L'app se lance sans réseau. Outil pressenti : `vite-plugin-pwa` (Workbox).
- **Données locales (IndexedDB)** : avant la sortie terrain, l'auditeur ouvre la mission **en ligne** ; on pré-charge en local les `controls` de la mission, les `finding_templates` par contrôle, le `control_assessments`, et les référentiels utiles. Les **médias capturés** (photos, audio) sont stockés en blobs.
- **File de synchronisation (outbox)** : toute action hors-ligne (constat, pièce jointe, verdict) est journalisée dans une file locale avec un statut `en attente`. Au retour du réseau, la file est **rejouée** vers Supabase (voir §9). La maquette illustre déjà ce comportement (compteur « X en attente », badge par contrôle, bouton Synchroniser).
- **Authentification hors-ligne** : le jeton de session Supabase est conservé pour permettre l'ouverture hors-ligne ; il est **rafraîchi** au retour en ligne. Les écritures différées restent soumises aux RLS au moment du rejeu.

## 7. Parcours terrain

Repris de la maquette, un seul fil par contrôle :
1. **Liste des contrôles** de la mission (statut, compteur de preuves, **badge « preuves non synchronisées »** par contrôle).
2. **Fiche contrôle épurée** : exigence, **verdict**, puis collecte (Photo / Audio / Note).
3. **Capture** : photo (caméra), audio (enregistrement), note.
4. **Constat enrichi** (§8).
5. **Revue des preuves** avant synchro : liste consolidée, **détail d'une preuve** (recadrer une photo, ré-écouter un audio, éditer la transcription, supprimer).
6. **Synchronisation** au retour du réseau.

## 8. Saisie de constat enrichie (alignée web)

Reprise fidèle du mécanisme `FindingsEditor` / `finding_templates` (migration 00269) :
- Le catalogue est filtré **par contrôle** (`finding_templates.control_id`), portées `platform` (fourni par Gëstu) et `cabinet` (capitalisé par l'organisation).
- Chaque **constat-type** porte sa `description` + `risks[]` + `recommendations[]`.
- L'auditeur **choisit un constat-type** (qui aligne la classification), puis les **propositions de risque et de recommandation** du type deviennent disponibles. Les trois champs restent **éditables librement** (liste + texte libre).
- Classification : `major_nc` / `minor_nc` / `observation` / `strength`. Priorité : `critical` / `high` / `medium` / `low`. Écriture dans `assessment_findings` (migration 00099) : `classification`, `description`, `risk`, `recommendation`, `priority`.
- Option future : **« Enregistrer dans la bibliothèque »** (ajout d'un constat-type `cabinet`), comme sur le web.

## 9. Intégration des données et rejeu

- **Preuves** : à la synchro, les blobs sont téléversés dans le Storage des preuves ; un item de preuve est créé et relié (le lien `assessment_findings.evidence_item_id` existe déjà).
- **Constats** : rejeu vers `assessment_findings` via le chemin serveur normal (RLS + gardes de mission). L'outbox garde un **identifiant client** par action pour l'**idempotence** (un rejeu partiel ne duplique pas).
- **Verdict / avancement** : mise à jour de `control_assessments`.
- **Transcription** : voir §10.

## 10. Transcription audio (nouvelle capacité IA)

- L'audio est **capturé hors-ligne** ; la **transcription s'effectue à la synchro**, côté serveur (Edge Function dédiée), car elle nécessite le réseau et un modèle.
- Elle est **soumise à `ai-guard`** ([[RFC 0012]]) : si l'analyse IA est désactivée pour l'organisation (réglage « Analyse IA des documents »), l'audio est conservé **sans** transcription automatique (transcription manuelle possible). Consentement par client et politique de confidentialité comme pour les autres flux IA.
- La transcription produite est **éditable** par l'auditeur avant intégration au constat.

## 11. Sécurité

- **Données sensibles sur l'appareil** : les preuves d'audit stockées localement sont confidentielles. Prévoir le **chiffrement au repos** (IndexedDB chiffré, clé liée au verrou de l'app/appareil) ou, a minima, s'appuyer sur le verrouillage de l'OS, et une **purge après synchronisation confirmée**.
- **Jeton de session** : conservé pour l'ouverture hors-ligne, rafraîchi au retour en ligne ; expiration gérée (ré-authentification requise au-delà d'un délai).
- **RLS au rejeu** : aucune écriture ne contourne les RLS ; le rejeu passe par les chemins serveur normaux, avec les gardes de mission (l'auditeur ne peut écrire que sur ses missions).
- **Confidentialité IA** : la transcription respecte `ai-guard` et le consentement par client.
- **Volumétrie** : photos/audio volumineux : compression à la capture, limite de taille, gestion de quota et d'éviction IndexedDB (surtout iOS).

## 12. Décisions à trancher

- **D1 - Cible prioritaire** : Android d'abord (PWA fiable) + iOS best-effort, ou les deux au même niveau. *Reco : Android d'abord, iOS best-effort ; Capacitor si iOS devient critique.*
- **D2 - v1 PWA, v2 Capacitor** : acter la trajectoire. *Reco : oui.*
- **D3 - Chiffrement local des preuves** : chiffrer IndexedDB au repos, ou s'appuyer sur le verrou OS. *Reco : chiffrer au repos (données d'audit).*
- **D4 - Politique de purge** : supprimer les médias locaux après confirmation serveur, avec un court délai de rétention. *Reco : purge après confirmation + rétention courte.*
- **D5 - Périmètre moteur** : mode terrain pour le moteur **contrôle** (régulateur) et/ou **audit** (cabinet). *Reco : les deux (le fieldwork est commun), activable par capacité.*
- **D6 - Activation** : nouvelle capacité `field_mode` ([[RFC 0013]]) par édition/client. *Reco : oui, capacité dédiée.*
- **D7 - Transcription** : fournisseur et hébergement, langue, consentement. *Reco : Edge Function, FR par défaut, sous `ai-guard` + consentement par client.*

## 13. Découpage de livraison

- **Lot 1 - Socle PWA** : service worker (precache du shell), manifeste d'installation, détection en ligne/hors-ligne, écran d'installation.
- **Lot 2 - Interface terrain** (lecture) : liste des contrôles + fiche épurée, pré-chargement IndexedDB des contrôles et `finding_templates`, consultation hors-ligne.
- **Lot 3 - Capture** : photo (caméra) + note, stockage blob local, badge « non synchronisé » par contrôle.
- **Lot 4 - Constat enrichi** : constat-type / risque / recommandation (catalogue par contrôle) + classification + priorité, hors-ligne.
- **Lot 5 - Outbox & synchro** : file, rejeu idempotent vers `assessment_findings` / Storage / `control_assessments`, revue des preuves + détail.
- **Lot 6 - Audio & transcription** : capture micro + Edge Function de transcription sous `ai-guard`, édition de la transcription.
- **Lot 7 - Durcissement** : chiffrement au repos, purge, quotas/compression, gestion d'expiration du jeton.

## 14. Non-régression / hors scope

- **Additif** : le web existant n'est pas modifié ; le mode terrain est une surface activée par capacité.
- **Hors scope v1** : build natif (Capacitor), upload en arrière-plan garanti, édition collaborative hors-ligne, mode terrain pour les modules autres que la mission de contrôle/audit.
