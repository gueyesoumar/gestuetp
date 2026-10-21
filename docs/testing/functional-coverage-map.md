# Carte de couverture fonctionnelle - Gëstu ETP

> Plan de test maître : la carte de TOUS les recoins (module x rôle x flux) pour un test
> fonctionnel exhaustif. Sert de base à l'exécution manuelle ET à la suite E2E automatisée
> (Playwright, `tools/demo-videos/`). Statut : v1 (2026-10-21).
>
> Priorités : **P1** = golden path / critique métier · **P2** = cas limites et variantes ·
> **P3** = confort / périphérie. Chaque flux note le(s) rôle(s) et les contrôles sécurité/RLS.

## Rôles de test

| Code | Rôle | Édition / accès | Particularités |
|---|---|---|---|
| **SA** | Super-admin (platform owner) | console cross-cabinet | `is_platform_owner` : toutes permissions, /cabinets /utilisateurs /plans /monitoring /securite |
| **CAB-O** | Cabinet owner | audit-core (Comply) | toutes perms cabinet (clients, missions, équipe, rôles) |
| **CAB-A** | Cabinet auditeur | audit-core | perms limitées, membre de mission (grant d'équipe) |
| **REG-A** | Régulateur admin | supervision-core (Regul) | `can_manage_supervision_assignments`, voit tout |
| **REG-S** | Régulateur superviseur | supervision-core | scoping strict par affectation (00327), ne voit que ses assujettis |
| **ENT** | Entreprise | enterprise-core | registre propre, PAS de portail client |
| **CLI** | Client portail | role=client | répond aux missions/directives, dépose des preuves |
| **VEN** | Candidat fournisseur | role=client (org fournisseur) | auto-évaluation + preuves (pas de client_mission_access) |

## Préceptes transverses (à vérifier sur CHAQUE module)

| # | Contrôle transverse | Attendu | Priorité |
|---|---|---|---|
| T1 | **MFA / AAL2** | TOTP obligatoire ; actions sensibles bloquées si AAL1 ; enrôlement + reset | P1 |
| T2 | **Cloisonnement RLS multi-tenant** | un rôle ne voit JAMAIS les données d'une autre org (cross-cabinet, cross-assujetti) | P1 |
| T3 | **Cloisonnement portail** | CLI/VEN ne voient que LEUR org ; les helpers staff ne fuient pas (mig 00134) | P1 |
| T4 | **Gates de capacité/entitlement** | un module non inclus est masqué (UI) ET refusé (écriture `enforce_capability_write`) | P1 |
| T5 | **Autorité des RPC cross-org** | écriture cross-org seulement via RPC SECURITY DEFINER bornée (supervision/mission) | P1 |
| T6 | **Permissions cabinet** | une permission `can_*` absente => action refusée (403 serveur) ET masquée | P1 |
| T7 | **Accents / typographie** | accents réels partout (UI + contenu seedé) ; zéro cadratin/ellipse IA | P2 |
| T8 | **Surface d'erreur** | message serveur lisible (readInvokeError), jamais de stack technique à l'utilisateur | P2 |
| T9 | **Piste d'audit** | actions sensibles scellées dans activity_log (chaîne hash par org), visibles /piste-audit | P2 |
| T10 | **Vocabulaire par édition** | Régulateur=« assujetti », Cabinet=« client/entité » (useVocab) | P3 |
| T11 | **Branding module** | logo = nom du module dans son workspace (Risk/Vendor/Policy) sinon édition | P3 |
| T12 | **Responsive / état au repos** | pages lisibles en largeur réduite ; états vides actionnables | P3 |

---

## 1. Plateforme & shell

### 1.1 Authentification (`/login`, `/set-password`, MFA)
- **P1** Connexion email+mot de passe (tous rôles) ; mauvais identifiants => erreur générique.
- **P1** Enrôlement TOTP (1er login) ; connexion avec code TOTP ; AAL2 atteint.
- **P2** Code TOTP invalide/expiré ; reset mot de passe (`/set-password` via lien) ; désinscription (`/unsubscribe`).
- **P2** Session expirée => redirection login sans crash ; refresh conserve le rôle (pas de flash cross-rôle).
- **Sécurité** T1. Blocage AAL2 sur une action sensible depuis une session AAL1.

### 1.2 Hub ETP (`/hub`)
- **P1** Affichage des modules selon capacités ; navigation vers chaque module ; « Retour au Hub ETP ».
- **P3** Marque Hub = « Gëstu ETP » (ou marque blanche cabinet si branding). T11.

### 1.3 Compte / profil (`/compte`, `/profil`→redirect, `/notifications`)
- **P1** Édition profil ; changement mot de passe ; gestion TOTP.
- **P2** Notifications : liste, marquage lu, lien profond.

### 1.4 Organisation (`/organisation` : membres, rôles, piste-audit)
- **P1** CAB-O/REG-A : inviter un membre, assigner/éditer un rôle, suspendre/réactiver/retirer.
- **P1** Édition des permissions d'un rôle (`can_*`) => effet immédiat sur l'accès (T6).
- **P2** CAB-A sans `can_manage_members` => onglet masqué + action refusée.
- **P2** Piste d'audit (`/piste-audit`) : chaîne d'événements, filtres, permission `can_view_audit_trail`. T9.

### 1.5 Onboarding / démo / édition
- **P2** Assistant onboarding (widget + tours driver.js) ; mode démo (garde-fous, pastille, découverte).
- **P3** Vocabulaire/édition résolu au runtime (T10) ; branding email par instance.

---

## 2. Comply - Cabinet (audit-core)

### 2.1 Clients (`/clients`, `/clients/nouveau`, `/clients/:id`)
- **P1** CAB-O : créer un client (edge create-client => nœud org + arête audit_engagement) ; éditer ; fiche.
- **P2** Réconciliation par n° d'immatriculation ; client sans accès portail vs avec compte portail.
- **Sécurité** T2 : un autre cabinet ne voit pas ce client. T5 : création via service_role.

### 2.2 Missions / audits (`/missions`, `/missions/nouvelle`, `/missions/:id`)
- **P1** Wizard création mission (6 étapes : type→client→périmètre→équipe→calendrier→confirmation).
- **P1** Moteur de mission (audit vs contrôle) résolu par org (RFC 0003) ; 3 vues (Kanban/Split/Cards).
- **P1** Déroulé terrain : évaluer un contrôle (voie express Conforme/N-A ; saisie en étapes), constats.
- **P1** Constats (findings) : N par évaluation, classification/risque/reco/priorité ; clôture mission.
- **P2** Auto-promotion des constats à la clôture (opt-in org) => scénario risque ; export rapport.
- **P2** Assignation d'équipe ; un CAB-A non membre ne voit pas la mission (grant d'équipe).
- **Sécurité** T2/T6. control_assessments.mission_id + RLS membre de mission.

### 2.3 Questionnaire (`/questionnaire/:id`)
- **P1** Formules (RFC 0015) : prise de connaissance vs auto-évaluation choisie au lancement.
- **P2** Questions liées aux contrôles (question_controls) alimentent l'évaluation ; CadrageInline.

### 2.4 Référentiels / frameworks (`/frameworks`, `/referentiels`, `/referentiels/comparer`)
- **P1** Lister les référentiels (ISO 27001, NIST, COBIT, ITIL, PSSI-ES, PASI...) ; détail domaines/contrôles.
- **P2** Comparer deux référentiels ; bibliothèque éditable par org (RFC 0016, organization_id sur templates).
- **P2** Référentiel **PASI** (mig 00346) apparaît et est utilisable (8 domaines / 49 contrôles, accents réels).

### 2.5 Rapports (`/reports` via mission) & conformité continue (`/conformite-continue`)
- **P2** Génération rapport d'audit (narratifs, SoA) ; export.
- **P3** Connecteurs read-only (Entra pilote, RFC 0014) ; preuve collectée auto.

### 2.6 Policy (`/politiques`, `/politiques/couverture`)
- **P1** Tableau de gouvernance documentaire ; cycle de vie d'une politique ; couverture.
- **Sécurité** gate capacité `policy` (T4) ; blend par axe + cross-tenant.

---

## 3. Regul - Régulateur (supervision-core)

### 3.1 Assujettis (`/assujettis`, `/assujettis/:id`)
- **P1** REG-A : créer un assujetti (manage-entity => arête regulatory_supervision) ; profil réglementaire (IIC/Standard = criticality='eleve').
- **P1** Filtre standard (FilterBar + useFilters + pagination) ; IIC.
- **Sécurité** T2 : REG-S ne voit que ses assujettis affectés (00327) ; super-admin cross-cabinet SANS embed PostgREST organizations(...).

### 3.2 Contrôles (`/controles`, `/controles/nouvelle`, `/controles/:id`)
- **P1** Moteur Contrôle (5 étapes, sans validation client, remarques assujetti non bloquantes).
- **P1** Écran unique de contrôle (voie express+verdict / saisie en étapes / rail onglets).

### 3.3 Incidents & mesures (`/incidents`, `/constats`)
- **P1** Déclarer un incident ; mesure corrective ; lien au score/risque.
- **P2** Boucle incidents => risque (incident_risk_links) ; invalidation d'acceptation au changement.

### 3.4 Supervision (`/supervision`, `/supervision/campagnes/:id`, `/supervision/entites/:id`)
- **P1** Campagnes réflexives (édition Entreprise C6, client_id=cabinet_id) ; vue entité.
- **P1** Affectations de supervision (`/risque/affectations`) : org ET secteur ; angle mort « sans responsable ».

### 3.5 Score de confiance
- **P2** 6 dimensions + 3 facteurs ; mapping contrôle→dimension ; radar ; mode observation (shadow) vs pondéré.

---

## 4. Risk (ISO 27005) - `/risque/*`

### 4.1 Vue d'ensemble, Synthèse, Portefeuille
- **P1** Dashboard (KPI hors seuil/revues en retard/exposition ; points d'attention ; radar tri-couche).
- **P1** **Portefeuille** (superviseur) : cockpit + **FilterBar entité/secteur/type** (ré-agrège KPI/radar/liste) ; drill-down assujetti.
- **P1** **Synthèse exécutive** : langage dirigeant, simulation d'impact au clic sur scénario grave.
- **Sécurité** T2/T5 : lectures cross-org via get_supervised_org_portfolio / get_supervised_risks.

### 4.2 Registre (`/risque/registre`)
- **P1** Onglet **Mon organisation** (défaut) ; créer un risque (**Nouveau risque**, formulaire ScenarioFormModal : modèle + champs cœur + optionnels + jauge).
- **P1** Onglet **Tous les assujettis** (consolidé) : filtre Origine ; **Nouveau risque pour un assujetti** (sélecteur assujetti).
- **P1** **Badge source** : Assujetti / Autorité / Gëstu Regul (une seule ligne).
- **P2** Matrice cliquable => filtre ; export Registre + SoA (CSV) ; suppression (ConfirmDialog).
- **Sécurité** T2/T5 : create_supervised_scenario (source='regulator', log double, autorité get_my_supervised_org_ids).

### 4.3 Détail scénario (nœud papillon)
- **P1** Bande synthèse (inhérent→résiduel, cycle de vie, jauge) + 3 onglets (Apprécier/Traiter/Surveiller).
- **P1** Papillon 5 zones ; barrières (contrôles+politiques) avec efficacité ; causes/conséquences (nodes).
- **P2** Provenance (constat/mission) ; badge source ; incidents liés.

### 4.4 Paramétrage (`/risque/criteres`, `/risque/modeles`, `/risque/affectations`)
- **P1** Critères : échelles, seuil d'acceptation, appétit, **cadence de revue (dont mensuelle)**, auto-promotion.
- **P1** Modèles de scénarios sectoriels (catalogue plateforme + propre org, 79+ modèles africains) ; « Partir d'un modèle ».
- **P2** Affectations de supervision (org/secteur) ; permission can_manage_*.
- **P3** Nav « Paramétrage » regroupée en bas.

### 4.5 Traiter (`/risque/plan`, `/risque/acceptations`, `/risque/simulateur`)
- **P1** Plan de traitement (actions, origine Interne/Régulateur, vérification) ; bascule own/consolidé.
- **P1** Acceptations (résiduel figé, approbateur, validité, dérogation hors seuil obligatoire).
- **P1** **Simulateur** : own-org (barrières réelles + « Ajouter au plan ») ; **assujetti supervisé** (bascule, bowtie cross-org get_supervised_scenario_bowtie, « Demander une action »).
- **P2** Demande d'action : **liste prédéfinie par dimension** + saisie libre (RequestActionPanel).

### 4.6 Surveiller (`/risque/revue`)
- **P1** Revues dues/en retard (own) ; enregistrer une revue (décision maintain/retreat/accept/close/reopen).
- **P1** Bascule **Tous les assujettis** : échéances cross-assujettis + « Demander une action » (pas d'écriture cross-org).

### 4.7 Boucle portail assujetti
- **P1** CLI : voir les directives du régulateur (`/client/directives`), répondre (statut+note), déposer des preuves.
- **Sécurité** T3 : un assujetti ne voit QUE les directives de sa propre org (cp_rta_select).

---

## 5. Vendor (TPRM / PASI) - `/fournisseurs`, `/client/evaluations`

- **P1** REG-A/CAB-O : créer un fournisseur (edge create-vendor => nœud + arête supplier + profil ; PAS de types[]).
- **P1** Registre : filtres (qualification/criticité/échéance) + recherche + export CSV + badge échéance + relance.
- **P1** Fiche fournisseur : lancer une évaluation (référentiel actif, dont **PASI**) ; grille conformité ; score live ; verdict (qualifié/sous conditions/non) ; clôture + validité.
- **P1** Constats fournisseur ; inviter le candidat (edge invite-vendor-candidate).
- **P1** VEN : auto-évaluation (`/client/evaluations`) ; soumettre ; **preuves par contrôle** (upload bucket + RPC).
- **P2** Cadence de ré-évaluation par criticité (élevé 12 / standard 24) ; alertes d'expiration (< 60 j).
- **Sécurité** T3/T4 : gate capacité `vendor` ; cloisonnement candidat (role=client) ; preuves RPC-only + can_access_vendor_evidence_file ; permission `can_manage_vendors`.

---

## 6. Admin / Super-admin (console SA)

- **P1** SA : `/cabinets` (+ /:id), `/utilisateurs` (+ /:id), `/plans`, `/plans-transverses`, `/monitoring`, `/securite`, `/documents`.
- **P1** **Entitlements / abonnements** : octroyer/révoquer un module à une org => l'accès change (UI + écriture) ; gate soft/hard ; incidents/mesures classés « modules » vs « fonctionnalités » (data-driven).
- **P1** Choix du **moteur de mission** par org ; feature flags (ex. score risque : observation→pondéré).
- **P2** Provisioning sous-domaine marque blanche (Vercel+OVH, mig 00230) ; MFA admin-reset.
- **Sécurité** T4/T5 : toute élévation/octroi via service_role ; refresh_org_capabilities non destructif (passer par la chaîne entitlements).

---

## 7. Groupe / filiales

- **P2** `/filiales` (+ /:id), `/plans-transverses` ; vue Groupe (switch) ; supervision de filiales ; permissions groupe (can_view_supervision...).

---

## 8. Parcours de bout en bout (cross-module) - les scénarios « vraie vie »

| # | Parcours | Rôles | Vérifie |
|---|---|---|---|
| **J1** | Cabinet : client → mission → audit (contrôles+constats) → clôture → auto-promotion → risque → rapport | CAB-O, CAB-A, CLI | chaîne Comply complète + promotion + report |
| **J2** | Régulateur : assujetti → contrôle → incident/mesure → Risk (créer risque assujetti, directive) → réponse portail → vérif → score | REG-A, REG-S, CLI | supervision active bout-en-bout + cloisonnement |
| **J3** | Vendor : créer fournisseur → inviter candidat → auto-éval → évaluation PASI → constats → verdict → preuves → registre qualifiés+échéances | REG-A, VEN | qualification TPRM complète + preuves cross-lane |
| **J4** | Abonnement : SA octroie/révoque un module → surface d'accès d'une org change (soft puis hard) | SA, CAB-O | entitlements de bout en bout |
| **J5** | MFA : enrôlement TOTP → AAL2 → action sensible OK ; session AAL1 → action bloquée | tous | sécurité auth |
| **J6** | Isolation : chaque rôle tente de lire/écrire une ressource d'une AUTRE org (URL directe, RPC) => refus | tous | T2/T3/T5 adversarial |

---

## 9. Correspondance avec l'automatisation (Playwright)

- Existant (`tools/demo-videos/e2e/`) : `risk-screens`, `supervision`, `portal-directives` (régulateur + portail, **lecture seule**, 19 tests).
- À étendre (ordre proposé) : **J5/J6 (auth+isolation)** → **J2 (régulateur write)** → **J3 (vendor)** → **J1 (cabinet)** → **J4 (abonnement)**.
- Chaque parcours Pn devient un `*.spec.ts` par rôle (projets Playwright `storageState` par compte). Auth 2FA via `auth-auto.mjs` (TOTP par compte).
- Voir `docs/testing/test-accounts-and-data.md` pour les comptes + données + secrets requis avant exécution.
