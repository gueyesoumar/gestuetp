# [INTERNE] Revue pré-audit Gëstu ETP — backlog de remédiation

> Document **INTERNE** (ne pas transmettre tel quel à l'auditeur externe). Issu d'une revue multi-agents adversariale du code réel, 2026-07-09. Sévérités = **confirmées après contre-analyse**.

# Rapport de synthèse — Revue pré-audit Gëstu ETP

_Revue adversariale de la plateforme (Comply + module régulateur Regul). Chaque constat a été vérifié sur le code réel ; les sévérités ci-dessous sont les **sévérités confirmées après contre-analyse**, qui divergent parfois des sévérités initiales._

---

## 1. Résumé exécutif

**Posture générale : globalement saine mais non prête pour l'audit externe.** Le socle applicatif est propre sur les fondamentaux les plus dangereux (aucun `dangerouslySetInnerHTML`, aucune clé `service_role` côté client, `SafeMarkdown` durci, RLS active et cloisonnée sur la quasi-totalité des tables sensibles, pattern `SECURITY DEFINER` respecté contre la récursion RLS). La plupart des alertes bruyantes du scan initial (react-router « RCE », DOMPurify, CSP, JWT en localStorage) se sont révélées **non exploitables en l'état** après vérification — ce sont des durcissements, pas des brèches.

En revanche, **2 constats bloquants confirmés** touchent le cœur métier : une fuite cross-tenant du journal probant et une collision de statut qui expose le travail d'audit non finalisé au client. Ils doivent être corrigés **avant** l'audit.

### Constats par sévérité confirmée

| Sévérité confirmée | Nombre | Nature |
|---|---|---|
| **Bloquant** | **2** | Fuite RLS cross-tenant (`probative_log`) ; collision de statut `in_review` (fuite + corruption workflow) |
| **Majeur** | **8** | IDOR edge function ; atomicité chaîne probante ; incohérences machine à états ; désactivation entité ; FK cascade destructrice ; down migration destructeur ; absence de gate SCA en CI |
| **Mineur** | **9** | Durcissements RLS, validations d'entrée manquantes, CSP absente, cohérence de code, hygiène build/CI |
| **Info** | **5** | Anon key (non-problème), audit deps dev-only, transition REST brute, rollback mono-niveau, react-router (surévalué) |

> **3 constats initialement notés « bloquant »** (react-router, gate SCA, absence de CI migrations) ont été **rétrogradés** après vérification (info / majeur / mineur) — lacunes réelles d'hygiène/défense-en-profondeur, non des brèches exploitables. À l'inverse, **2 constats initialement « majeur/mineur »** ont été **confirmés bloquants** car ils touchent la confidentialité inter-tenants et le workflow d'audit.

---

## 2. Constats priorisés par dimension

### RLS & cloisonnement multi-tenant

| Sév. | Titre | Localisation | Impact | Recommandation |
|---|---|---|---|---|
| **Bloquant** | `probative_log` lisible cross-tenant par tout staff | `00138_probative_log_up.sql:124-126` | Policy SELECT `using (not is_client_role())` sans borne de tenant → tout staff de n'importe quel régulateur lit titres/gravités d'incidents et types/échéances/références de mesures d'autres assujettis. L'intégrité par hash ne protège pas la confidentialité. | Ne PAS exposer le journal en SELECT direct aux `authenticated` ; le lire via Edge Function `service_role` filtrée par périmètre, ne garder que `verify_probative_chain()`. Sinon scoper via `subject_id → entity source → get_subsidiary_ids`. |
| Mineur | Supervision groupe sans garde `not is_client_role()` | `00058_group_supervision_policies_up.sql:9-48` | 3 policies (`missions/ca/car_select_group`) gatées uniquement sur `get_subsidiary_ids(...)`. Cloisonnement tient par effet de bord de 00134 (NULL pour client). Pas de fuite active ; single-point-of-failure. | Ajouter `not public.is_client_role() and <condition>` aux 3 policies (coût nul, aligne sur 00133). |
| Mineur | Branche `entity_org_id` de `cpc_select_own_org` (espaces d'ID incompatibles) | `00141_portal_contact_entity_link_up.sql` | `entity_org_id` (→organizations) comparé à `client_org_id` (→cabinet_clients, NULL pour assujetti) → prédicat toujours faux : code mort côté Regul. Un contact assujetti ne voit pas ses collègues. Dégradation, pas de fuite. | Réécrire la branche via `get_my_entity_org_ids()` (00145). |
| Mineur | `get_my_client_visible_org_ids` ne couvre pas `entity_org_id` | `00135_organizations_scoped_select_up.sql` | Assujetti Regul ne voit ni sa propre org ni l'org régulateur → branding « audité par X » cassé. Dégradation d'affichage, pas de fuite. | Étendre le helper (branche `entity_org_id` via `client_portal_contacts`) + org régulateur parente. |

### Edge Functions (authz / cloisonnement)

| Sév. | Titre | Localisation | Impact | Recommandation |
|---|---|---|---|---|
| **Majeur** | IDOR cross-tenant : `extract-document-metadata` n'authentifie ni ne cloisonne | `extract-document-metadata/index.ts:139-289` | Aucun `authenticateCaller`. Tout utilisateur authentifié (y compris `role=client`) peut, avec un `document_id` d'un autre tenant, déclencher une extraction IA facturée au mauvais cabinet et invalider la synthèse d'une mission tierce. Borné par idempotence + devinette d'UUID. | Ajouter `authenticateCaller`, charger doc → mission, vérifier `sameCabinet(caller, mission.cabinet_id)`, refuser `role=client`. |
| Mineur | `extract-org-chart-actors` : `mission_id` non cloisonné | `extract-org-chart-actors/index.ts:42-64,119-138` | `mission_id` arbitraire injecté dans `logAiCall` (org codée `null`). Pollution de la comptabilité IA. Pas de fuite (fichier fourni par l'appelant). | Charger la mission, `sameCabinet` avant appel Claude/`logAiCall`, sinon 403. |
| Mineur | 5 fonctions de workflow autorisent sans vérifier `is_active` | `review-assessment`, `submit-assessment`, `generate-action-plan`, `send-to-client-review`, `close-mission` | Membre suspendu (`is_active=false`) avec JWT valide et toujours assigné peut soumettre/valider/clôturer SES missions → contourne la révocation. Portée limitée ; fenêtre = expiration JWT. | Sélectionner `is_active` et refuser 403, ou router via `authenticateCaller`. |

### Module régulateur (Regul / chaîne probante)

| Sév. | Titre | Localisation | Impact | Recommandation |
|---|---|---|---|---|
| **Majeur** | `probative_log` : seq/prev_hash lus sans verrou → collision + acte orphelin | `00138_..._up.sql:66-75` ; `issue-measure:220-237` ; `declare-incident:89-108` | Trigger lit `max(seq)` sans `FOR UPDATE` → collision concurrente. Ancrage APRÈS insertion métier commitée → acte réglementaire vivant sans preuve + 500 → rejeu → doublon. Fragilise la garantie centrale du produit. | `pg_advisory_xact_lock` dans le trigger (ou vraie séquence) ET rendre insert + ancrage atomiques (RPC PLpgSQL ou trigger AFTER INSERT). |
| **Majeur** | `declare-incident` : machine à états incohérente | `declare-incident/index.ts:118-135` ; `IncidentDetailPanel.tsx:65-69` | `set-status` accepte tout saut (`declared→closed`). `notify` depuis `declared` laisse `status=declared` (incohérence garantie). Délais/reporting faux ; transitions non conformes dans le journal probant. | Matrice de transitions imposée côté edge (set-status ET notify) ; aligner le statut lors de notify ; désactiver les boutons UI hors transitions valides. |
| **Majeur** | `declare-incident` : échec d'ancrage silencieusement ignoré | `declare-incident/index.ts:122-124,133-134` | `await anchor(...)` sans capturer le retour puis `success`. UPDATE persisté avant ancrage, non rollback → statut/notif sans entrée probante, utilisateur croit l'opération tracée. | Capturer `aerr` et retourner 500 sur les 2 branches (comme `declare`/`issue-measure`) ; idéalement transactionnel. |
| **Majeur** | `manage-entity deactivate` : ignore incidents/mesures ouverts | `manage-entity/index.ts:275-289` | Ne bloque que sur missions non clôturées. Après `is_active=false`, `get_subsidiary_ids` (active-only) sort l'entité du sous-arbre → incidents en cours et mises en demeure non résolues invisibles alors que juridiquement vivants. Manquement masqué. | Compter aussi `incidents`/`regulatory_measures` en statut vivant (NOT IN resolved/closed), refuser 409 avec message. |
| Mineur | `issue-measure` : `finding_ids` sans validation d'appartenance | `issue-measure/index.ts:79,107` | `finding_ids uuid[]` sans FK, stocké verbatim. Un staff régulateur peut lier une mesure à des findings d'un autre assujetti. Borné : insider de confiance, `entity_id` validé, non ancrés dans le hash, UI ne l'envoie pas. | Valider chaque `finding_id` vs `entity_id` (via `assessment_findings→control_assessments→missions.client_id`), rejeter 400. |
| Mineur | `declare-incident` : `mission_id` non validé contre l'entité | `declare-incident/index.ts:90-91` | `mission_id` inséré sans vérifier `mission.client_id === entity_id`. Lien incident↔mission corrompu, vues de pilotage faussées. Pas de fuite. | Si fourni, charger la mission et exiger `mission.client_id === entityId`, sinon 400/403. |
| Info | Rollback 00136 rétrograde `get_subsidiary_ids` en mono-niveau | `00136_entity_structure_down.sql:6-24` | Rollback partiel (sans annuler 00137→00146) tronque le sous-arbre aux enfants directs. Purement opérationnel ; topologie actuelle mono-niveau (0 donnée impactée). | Avertissement dans l'en-tête du down, ou garder la version récursive (surensemble sûr). |

### Cohérence & machine à états (Comply)

| Sév. | Titre | Localisation | Impact | Recommandation |
|---|---|---|---|---|
| **Bloquant** | Le client voit/valide des évaluations en revue interne (collision `in_review`) | `00015:87` + `00099/00134` ; `review-assessment:127` ; `client-review-assessment:113` ; `useMissionControls.ts:115` | `in_review` sert la revue interne (associé) ET la revue client. Dès qu'un associé existe et que le lead approuve, l'assessment (constats + risques + reco) devient visible au client avant décision d'exposition. Pire : `client-review-assessment` ne vérifie que `status==='in_review'` → un client peut approuver/rejeter un contrôle en revue interne. Config à deux niveaux = flux standard. | Introduire un état `client_review` distinct de `in_review` ; restreindre les RLS client à cet état (+ `approved`) ; exiger `status==='client_review'` ET `mission.status==='client_review'` dans `client-review-assessment` ; faire de `send-to-client-review` le SEUL chemin de visibilité client. |
| **Majeur** | Aucune garde de machine à états sur `missions.status` | `00023:100-110` (+`00060`) ; `MissionFieldworkTab:92` ; `MissionInternalReviewTab:63` ; `MissionScopingTab:183` | Policies UPDATE gatées sur l'identité seule, aucun trigger de transition. Transitions posées côté front (contournable) → un lead peut sauter (scoping→closure) ou régresser. Missions incohérentes avec leurs assessments. Cloisonnement QUI-écrit toujours OK. | Trigger `BEFORE UPDATE` (table de transitions) OU router les transitions via edge functions `service_role` ; retirer `status` de l'UPDATE RLS direct. |
| **Majeur** | `control_assessments.auditor_id` en `ON DELETE CASCADE` détruit le travail d'audit | `00015:16` ; `00099:11` ; cf. `00012:22-23` | Chaîne `auth.users → public.users → control_assessments → assessment_findings` en cascade. Un « Delete user » dans le dashboard Auth efface irréversiblement les constats probants. Incohérence : `lead_auditor_id` est en `set null`. Soft-delete masque mais ne corrige pas. | Passer `auditor_id` en `ON DELETE SET NULL` (nullable) ou `RESTRICT`, migration up/down ; traiter aussi 00014, 00035. |
| Mineur | Liens `/filiales` codés en dur (group-module) | `TransversalPlansPage:101` ; `ContinuousReviewsPage:56` | Base de route Comply codée en dur au lieu de `productVocab.entityRouteBase`. Non exploitable aujourd'hui (pages non montées en Regul) ; incohérence + trappe de portabilité latente. | Remplacer par `${productVocab.entityRouteBase}/${id}`. |
| Info | Transition de statut via `fetch` REST brut | `MissionScopingTab.tsx:171-184` | PATCH REST manuel alors que les onglets frères utilisent le client typé. Perte de typage + diagnostic dégradé. Même RLS → pas de faille. Contraire à CLAUDE.md §4. | Aligner sur `supabase.from('missions').update(...)` avec gestion `error`. |

### Frontend / dépendances / CI (hygiène & durcissement)

| Sév. | Titre | Localisation | Impact | Recommandation |
|---|---|---|---|---|
| **Majeur** | Aucun gate SCA dans la CI | `.github/workflows/ci.yml` | CI = Typecheck + Build + Lint informatif. 12 vulns connues (4 hautes en prod : react-router, tmp, ws×2) livrées sans alerte. Lacune immédiatement relevable en pré-audit (pas un trou exploitable). | `npm audit --audit-level=high --omit=dev` (bloquant) + `dependabot.yml`. Documenter exceptions dev-only. |
| **Majeur** | Le down de 00100 tronque TOUTE `assessment_findings` | `00100_..._backfill_down.sql:15` | `truncate table ... cascade` sans WHERE : un rollback détruit irréversiblement TOUS les constats saisis en prod, pas seulement le backfill. Ne s'exécute qu'en rollback délibéré, conséquence catastrophique. | Down ciblé (colonne marqueur ou lien CAR migrés), ou refuser le truncate. |
| Mineur | JWT (access+refresh) en localStorage sans CSP | `src/lib/supabase.ts:7` ; `vercel.json` ; `index.html` | `createClient` sans bloc auth → refresh_token en localStorage. Aucune CSP. Aggravant à une XSS *future*. Non exploitable aujourd'hui (hygiène XSS bonne, standard SPA). | CSP stricte via `vercel.json` (`script-src 'self'`, `object-src 'none'`, `base-uri 'self'`). |
| Mineur | Aucun CSP + DOMPurify (transitif) vulnérable | `vercel.json:8-16` ; `dompurify@3.3.3` | `SafeMarkdown` durci, aucun `dangerouslySetInnerHTML`, DOMPurify non atteignable (tiré par jspdf/PDF). Défense en profondeur manquante, faille invoquée inexistante. | CSP strict (`default-src 'self'`, `frame-ancestors 'none'`, `connect-src` Supabase) ; `npm audit fix`. |
| Mineur | La CI ne teste jamais les migrations (up ni down) | `.github/workflows/ci.yml` | 146 paires up/down validées à la main. Un `up` cassé, `down` asymétrique ou RLS récursive détecté qu'en prod/staging. Risque préventif. | Job CI Postgres éphémère : tous les `_up` puis tous les `_down` en ordre inverse, échouer à la 1ère erreur. |
| Mineur | Aucune version Node épinglée | `package.json` ; racine ; `vercel.json` | Dérive dev (25) / CI (22) / Vercel (défaut) sur stack bleeding-edge (Vite 8, TS 6) → builds non reproductibles. | `"engines": {"node": ">=22 <23"}` + `.nvmrc` ; épingler Node dans Vercel. |
| Info | `react-router-dom 7.14.0` : advisories turbo-stream/CSRF/redirect/DoS | `package.json:16` | **Surévalué.** SPA 100% client (`BrowserRouter`, pas de SSR/data-router) → vulns dans le chemin serveur absent. Non exploitable. | Bumper vers `^7.15.1` et re-lock (hygiène). |
| Info | Dépendances transitives high/moderate (dompurify, tmp, ws) | `npm audit --omit=dev` | Surface dev/transitive : dompurify jamais importé, tmp/ws non embarqués dans le bundle. | `npm audit fix` puis committer le lock. |
| Info | anon key dans `.env.local` (publique par nature) | `.env.local:2` | Aucun impact : `role:anon`, fichier non tracké (`.gitignore *.local`), aucune `service_role` dans `src/`. Non-problème. | RAS. Maintenir l'invariant ; sécurité 100% par RLS. |

---

## 3. Top 5 des actions recommandées avant l'audit externe

1. **[Bloquant] Fermer la fuite cross-tenant de `probative_log`.** Retirer le SELECT direct aux `authenticated` et exposer le journal uniquement via une Edge Function `service_role` filtrée par périmètre (ne laisser que `verify_probative_chain()`). Seule brèche de confidentialité inter-tenants active — un auditeur externe la trouvera immédiatement.

2. **[Bloquant] Séparer la revue interne de la revue client (`in_review`).** Introduire un état/stage `client_review` distinct, restreindre les policies RLS client à cet état, et faire de `send-to-client-review` le seul chemin de visibilité client. Corrige à la fois la fuite de constats non finalisés et la corruption de la machine à états de validation.

3. **[Majeur] Rendre atomique et fiabiliser la chaîne probante Regul.** `pg_advisory_xact_lock` (ou vraie séquence) dans le trigger `probative_log`, insert métier + ancrage transactionnels, et capturer/propager l'erreur d'ancrage sur `set-status`/`notify` de `declare-incident`. Garantie centrale du produit régulateur — pas d'actes orphelins.

4. **[Majeur] Corriger les FK et le down destructeurs.** Passer `control_assessments.auditor_id` en `ON DELETE SET NULL`/`RESTRICT`, et réécrire `00100_down` pour supprimer le `truncate ... cascade` global. Deux bombes à retardement de perte irréversible de preuves d'audit, déclenchables par une action admin banale.

5. **[Majeur] Sécuriser `extract-document-metadata` et outiller la CI.** Ajouter `authenticateCaller` + `sameCabinet` à l'IDOR (et le contrôle `is_active` aux 5 fonctions de workflow), puis ajouter un gate SCA (`npm audit --audit-level=high --omit=dev` + Dependabot) et un job de test des migrations up/down. Ferme le dernier vecteur cross-tenant actif et supprime les lacunes de process les plus visibles.

> **Verdict pré-audit :** les fondamentaux de sécurité sont bons et la majorité des alertes bruyantes sont des faux-positifs ou du durcissement. Mais les 2 bloquants et les 3-4 majeurs métier ci-dessus sont réels et doivent être corrigés avant d'ouvrir la plateforme à un auditeur externe.

Le rapport complet est disponible dans `/tmp/rapport_synthese.md`.


---

## Annexe — Détail des 28 constats confirmés


### 1. [BLOQUANT] probative_log lisible cross-tenant par tout staff (fuite du journal probant multi-régulateur)
- **Dimension** : rls
- **Localisation** : `supabase/migrations/00138_probative_log_up.sql:124-126`
- **Impact** : Fuite cross-tenant du contenu du journal à valeur probante: titres/gravités d'incidents cyber, types de sanctions, échéances et références d'actes réglementaires d'autres tenants. Le chaînage par hash protège l'intégrité mais PAS la confidentialité. Violation directe du cloisonnement multi-tenant.
- **Recommandation** : Scoper la lecture au sous-arbre du régulateur/tenant, ex: using (not is_client_role() and subject_id in (select id from incidents where entity_id in (select get_subsidiary_ids(get_my_organization_id()))) or subject_id in (select id from regulatory_measures where entity_id in (...))). Plus simple et robuste: ne PAS exposer le journal en SELECT direct aux authenticated — le lire uniquement via une Edge Function service_role qui filtre par périmètre, et ne garder côté authenticated que verify_probative_chain() (qui ne renvoie pas de payload).
- **Vérification** : Constat CONFIRMÉ sur le code réel. La policy SELECT de probative_log (supabase/migrations/00138_probative_log_up.sql:124-126) est bien `using (not public.is_client_role())` sans AUCUNE borne de tenant/organisation. Or les deux tables sources dont les données sensibles sont recopiées dans le payload jsonb sont, elles, correctement cloisonnées au sous-arbre du régulateur : incidents (00144_incidents_up.sql:75-81) et regulatory_measures (00139_regulatory_measures_up.sql:42-48) utilisent toutes deux `and entity_id in (select public.get_subsidiary_ids(public.get_my_organization_id()))`. probative_l

### 2. [BLOQUANT] Le client voit et peut valider/rejeter des évaluations encore en revue interne (collision de statut in_review)
- **Dimension** : coherence
- **Localisation** : `supabase/migrations/00015_control_assessments_up.sql:87 + supabase/migrations/00099_assessment_findings_up.sql:112 ; supabase/functions/review-assessment/index.ts:127 ; supabase/functions/client-review-assessment/index.ts:113 ; src/features/client-portal/missions/useMissionControls.ts:115`
- **Impact** : Fuite de constats non finalisés : dès que le chef de mission approuve un contrôle et qu'un associé existe, l'assessment passe en in_review et devient immédiatement visible par le client (constats + risques + recommandations), avant toute décision d'exposition du cabinet. Un client approbateur peut même valider ou rejeter un contrôle encore en revue interne associé, corrompant la machine à états d'audit (un rejet renvoie l'assessment en draft/rejected). Atteinte à la confidentialité du travail d'audit et à l'intégrité du workflow de validation.
- **Recommandation** : Séparer les deux étapes : introduire un statut/étape dédié `client_review` (nouvelle valeur d'enum assessment_status ou colonne validation_stage) distinct de `in_review`. Restreindre les policies RLS client à ce nouvel état (et à `approved`) et non à `in_review`. Dans client-review-assessment, exiger `assessment.status === 'client_review'` ET `mission.status === 'client_review'`. Faire de send-to-client-review le SEUL chemin qui rend un assessment visible côté client.
- **Vérification** : Constat confirmé sur le code réel, y compris l'état LE PLUS RÉCENT des migrations (00134 qui redéfinit findings_select_client conserve `ca.status in ('approved','in_review')`).

Preuves vérifiées :
1) Surcharge du statut in_review. supabase/functions/send-to-client-review/index.ts commente explicitement le hack : `// Passer les assessments en client_review (on reutilise in_review avec un stage different)` puis `.update({ status: 'in_review' })` (l.~104-108) et met la mission en `client_review`. Or l'enum assessment_status (00015:4-10) ne contient PAS de valeur `client_review` — uniquement draf

### 3. [MAJEUR] IDOR cross-tenant : extract-document-metadata n'authentifie ni ne cloisonne l'appelant
- **Dimension** : edge
- **Localisation** : `supabase/functions/extract-document-metadata/index.ts:139-199`
- **Impact** : Tout utilisateur authentifie du produit (auditeur d'un autre cabinet, ou contact portail client) peut, en devinant/enumerant un document_id (UUID mais souvent recuperable via d'autres surfaces), declencher une extraction IA et surtout ECRASER ai_metadata et invalider ai_synthesis_cache/ai_synthesis_at de documents et missions appartenant a d'autres tenants. Cela consomme le budget IA d'un autre cabinet (facturation Anthropic imputee au mauvais cabinet via kill switch/logAiCall) et corrompt/force le recalcul de leurs syntheses. Violation directe de la regle CLAUDE.md section 3 : toute ecriture service_role doit cloisonner organization_id === ressource.cabinet_id.
- **Recommandation** : Ajouter authenticateCaller(admin, req) en tete de fonction, resoudre le profil, puis apres avoir charge le document -> sa mission -> verifier sameCabinet(caller, mission.cabinet_id) (helper deja dispo dans _shared/auth.ts). Refuser role=client si la fonction est reservee au staff. Ne pas se reposer uniquement sur le verify_jwt de la passerelle, qui n'assure que l'authenticite, pas l'appartenance.
- **Vérification** : Constat confirmé sur le code réel. extract-document-metadata/index.ts:139-289 : le handler n'appelle NI authenticateCaller NI admin.auth.getUser. Il lit body.document_id (l.155-157), charge n'importe quel document par id via service_role (l.160-164, qui contourne la RLS), écrit ai_metadata/ai_extracted_at sur ce doc (l.257-263) puis invalide inconditionnellement missions.ai_synthesis_cache/ai_synthesis_at de la mission liée (l.272-274). Aucun contrôle mission.cabinet_id === caller.organization_id.

Absence de cloisonnement confirmée par contraste : _shared/auth.ts documente explicitement (l.4-

### 4. [MAJEUR] probative_log : séquence/prev_hash lus sans verrou → collision concurrente + acte orphelin non ancré
- **Dimension** : regul
- **Localisation** : `supabase/migrations/00138_probative_log_up.sql:66-75 ; supabase/functions/issue-measure/index.ts:220-237 ; supabase/functions/declare-incident/index.ts:89-108`
- **Impact** : Sous charge concurrente (régulateur qui émet plusieurs mesures / plusieurs assujettis déclarant en même temps), rupture d'atomicité entre l'acte et son ancrage probant : mesures/incidents non tracés, doublons possibles, échecs 500 intermittents. Fragilise directement la valeur probante affichée comme garantie du produit.
- **Recommandation** : Sérialiser l'attribution de seq via `pg_advisory_xact_lock(<clé fixe>)` en tête du trigger, OU calculer seq avec une vraie séquence/`FOR UPDATE`. Surtout : rendre l'insertion métier + ancrage atomiques (une seule RPC/transaction PLpgSQL, ou insérer l'acte dans probative_log dans le même trigger AFTER INSERT de incidents/regulatory_measures) plutôt que deux appels REST séparés depuis l'edge function.
- **Vérification** : Constat confirmé sur le code réel (code vivant, câblé à src/regul/useMeasures.ts:59 et src/regul/incidents/useIncidents.ts:59 ; le trigger de 00138 est l'unique attributeur de seq et les 2 edge functions sont les seuls écrivains de probative_log).

1) Race sur seq/prev_hash — VRAI. supabase/migrations/00138_probative_log_up.sql:67-68 fait `select seq, hash into v_seq, v_prev from public.probative_log order by seq desc limit 1` SANS FOR UPDATE ni pg_advisory_xact_lock. En READ COMMITTED (défaut Postgres), deux insertions concurrentes lisent le même max, calculent toutes deux seq=N+1 et le même 

### 5. [MAJEUR] declare-incident : machine à états incohérente — notification/résolution possibles sans passer par la qualification
- **Dimension** : regul
- **Localisation** : `supabase/functions/declare-incident/index.ts:118-135 ; src/regul/incidents/IncidentDetailPanel.tsx:65-69`
- **Impact** : Incidents dans des états impossibles au regard du cycle réglementaire (résolu jamais notifié, notifié mais statut declared). Les délais/deadlines et le reporting de conformité deviennent faux ; l'audit probant enregistre des transitions non conformes au droit.
- **Recommandation** : Définir la matrice de transitions autorisées (declared→triage→notified→resolved→closed) et la faire respecter côté edge function pour set-status ET notify (rejeter les sauts). Aligner notify pour promouvoir le statut aussi depuis `declared`, ou refuser la notification tant que l'incident n'est pas en `triage`. Masquer/désactiver les boutons UI hors transitions valides.
- **Vérification** : Constat confirmé sur le code réel. (1) set-status (declare-incident/index.ts:118-124) : `update({ status: body.status })` ne valide QUE l'appartenance à la liste STATUSES (l.119), aucune matrice de transition — declared→closed en un saut est accepté. (2) notify (l.127-135) : `if (body.kind !== 'final' && incident.status === 'triage') patch.status = 'notified'` (l.130) — donc notifier un incident en `declared` renseigne `notified_initial_at` mais laisse `status='declared'`, état incohérent réel et systématiquement reproductible (le pill statut l.42 affichera « déclaré » pendant que le DeadlineC

### 6. [MAJEUR] declare-incident : échec d'ancrage silencieusement ignoré sur set-status et notify
- **Dimension** : regul
- **Localisation** : `supabase/functions/declare-incident/index.ts:122-124,133-134`
- **Impact** : Un changement de statut ou une notification d'incident peut être persisté SANS entrée dans le journal probant, tout en renvoyant succès à l'utilisateur. Trou dans la chaîne probante, incohérent avec le principe affiché « un acte non tracé n'a pas de valeur ».
- **Recommandation** : Capturer le retour : `const aerr = await anchor(...); if (aerr) return json({ error: 'Acte non ancré dans le journal probant' }, 500)` sur les deux branches, comme dans issue-measure. Idéalement rendre l'update + ancrage transactionnels (cf. constat probative_log).
- **Vérification** : Constat confirmé sur le code réel. Dans supabase/functions/declare-incident/index.ts, les branches set-status (l.122-123) et notify (l.133-134) appellent `await anchor(...)` puis renvoient directement `json({ success: true }, 200)` SANS capturer la valeur de retour. La fonction `anchor` (l.64-70) renvoie pourtant `error.message` en cas d'échec d'insertion dans probative_log (l.68) et `null` en succès. La branche `declare` de la MÊME fonction, elle, vérifie l'ancrage (l.105-106: `const anchorErr = await anchor(...); if (anchorErr) return json({ error: 'Incident non ancré (journal probant)' }, 5

### 7. [MAJEUR] manage-entity deactivate : ignore incidents et mesures ouverts → actes réglementaires orphelins sur entité invisible
- **Dimension** : regul
- **Localisation** : `supabase/functions/manage-entity/index.ts:275-289`
- **Impact** : Un régulateur peut désactiver un assujetti ayant des incidents en cours de notification (deadline courante) ou une mise en demeure/injonction non résolue ; ces actes deviennent invisibles dans l'UI de supervision et échappent au suivi des échéances, alors qu'ils restent juridiquement vivants. Risque de manquement réglementaire masqué par une simple désactivation.
- **Recommandation** : Avant de désactiver, compter aussi `incidents` (status not in resolved/closed) et `regulatory_measures` (status not in resolved/closed/appealed selon la sémantique) sur `entity_id`, et refuser en 409 s'il en reste, avec un message explicite (comme pour les missions).
- **Vérification** : Constat CONFIRME sur le code réel. Le handler deactivate (supabase/functions/manage-entity/index.ts:275-291) ne contrôle QUE les missions non clôturées (missions .eq('client_id', entityId).neq('status','closure'), l.277-283) puis passe is_active=false (l.285). Aucun contrôle sur incidents ni regulatory_measures.

Le mécanisme d'invisibilité est exact :
- get_subsidiary_ids (00136_entity_structure_up.sql:32-43, version courante récursive) est ACTIVE-ONLY : `AND is_active = true` dans l'ancre (l.36) ET le terme récursif (l.41). Le commentaire même de la migration (l.13-14) le confirme : « la RLS

### 8. [MAJEUR] Aucune garde de machine à états sur missions.status — transitions arbitraires côté client
- **Dimension** : coherence
- **Localisation** : `supabase/migrations/00023_fix_recursive_policies_up.sql:100-110 ; src/features/missions/fieldwork/MissionFieldworkTab.tsx:92 ; src/features/missions/internal-review/MissionInternalReviewTab.tsx:61-64 ; src/features/missions/scoping/MissionScopingTab.tsx:175-184`
- **Impact** : La machine à états (scoping->planning->fieldwork->internal_review->client_review->closure) n'existe que dans le front, qui est contournable. Un lead peut sauter des phases (ex: scoping -> closure) ou régresser arbitrairement, produisant des missions dans des états incohérents avec leurs assessments (ex: mission en closure alors qu'aucun contrôle n'est approuvé). Divergence garantie entre l'affichage (useMissionProgress) et l'état réel des données.
- **Recommandation** : Ajouter un trigger BEFORE UPDATE sur public.missions validant les transitions autorisées (table de transitions), OU router toutes les transitions de statut via des edge functions service_role qui appliquent les préconditions. Retirer la capacité de modifier `status` via l'UPDATE RLS direct (colonne protégée).
- **Vérification** : Constat vérifié sur le code réel et confirmé. (1) La colonne missions.status est un enum PostgreSQL (mission_status, 00012_missions_up.sql:4-12) qui borne les VALEURS aux 7 phases mais n'impose AUCUN ordre ni transition légale. (2) Aucun trigger de validation de transition n'existe : sur public.missions on ne trouve que trg_missions_updated_at (timestamps), trg_sync_lead_associate_to_members (sync membres, 00119) et trg_missions_quota (quota à l'INSERT, 00125) — aucun ne contrôle la légalité d'un changement de status. (3) La policy missions_update_lead_associate (00023_fix_recursive_policies_u

### 9. [MAJEUR] control_assessments.auditor_id en ON DELETE CASCADE détruit le travail d'audit si un auditeur est supprimé
- **Dimension** : coherence
- **Localisation** : `supabase/migrations/00015_control_assessments_up.sql:16 ; supabase/migrations/00099_assessment_findings_up.sql:11 ; supabase/migrations/00012_missions_up.sql:22-23`
- **Impact** : La suppression physique d'un utilisateur (via cascade auth.users, opération SQL admin, ou évolution future d'admin-user au-delà du soft-delete is_active actuel) effacerait irrémédiablement des constats d'audit validés — perte de preuve probante. Le soft-delete (is_active) actuel masque le risque mais ne le corrige pas ; c'est une bombe à retardement d'intégrité.
- **Recommandation** : Passer auditor_id en `on delete set null` (rendre la colonne nullable) ou `on delete restrict` pour interdire la suppression d'un auditeur ayant des assessments, comme pour cabinet_id/client_id/framework_id de missions (restrict). Migration up/down dédiée.
- **Vérification** : Constat exact et confirme sur le code reel. control_assessments.auditor_id est bien `not null references public.users(id) on delete cascade` (00015_control_assessments_up.sql:16), et assessment_findings.assessment_id est `not null references public.control_assessments(id) on delete cascade` (00099_assessment_findings_up.sql:11). La suppression d'une ligne public.users detruit donc en cascade tous ses assessments ET tous les constats (findings) associes — preuve probante d'audit effacee irremediablement. L'incoherence de politique FK est reelle au sein de la meme feature : missions.lead_auditor

### 10. [MAJEUR] Aucune analyse de composition logicielle (SCA) dans la CI : 12 vulnérabilités connues passent le gate (dont 5 hautes)
- **Dimension** : deps
- **Localisation** : `.github/workflows/ci.yml (job « verify » : Typecheck + Build + Lint informatif, pas de `npm audit`)`
- **Impact** : La CI valide type + build mais ne détecte aucune CVE ; des dépendances runtime vulnérables (react-router) sont livrées en prod sans alerte. Un pré-audit sécurité relèvera immédiatement l'absence de gate SCA.
- **Recommandation** : Ajouter une étape `npm audit --audit-level=high --omit=dev` (bloquante sur les vulns prod hautes) dans ci.yml, et activer Dependabot/`dependabot.yml` pour les mises à jour. Documenter les exceptions dev-only (vite/ws) si non bloquées.
- **Vérification** : Constat vérifié sur le code réel, mais sévérité ramenée de bloquant à majeur.

FAITS CONFIRMÉS :
1. Aucun gate SCA dans la CI. `.github/workflows/ci.yml` (job « verify ») exécute uniquement `npm ci`, `npm run typecheck` (gate dur), `npm run build` (gate dur), et `npm run lint` avec `continue-on-error: true`. Aucun `npm audit`, aucun scanner de dépendances (Snyk/Trivy/CodeQL). Le second workflow `feasibility.yml` est sans rapport. Aucun `dependabot.yml` n'existe dans `.github/`.
2. `npm audit` complet = « 12 vulnerabilities (1 low, 6 moderate, 5 high) » — chiffres exacts.
3. Les 5 hautes citées

### 11. [MAJEUR] Le down de la migration 00100 tronque TOUTE la table assessment_findings, pas seulement les lignes backfillées
- **Dimension** : deps
- **Localisation** : `supabase/migrations/00100_assessment_findings_backfill_down.sql (dernière instruction : `truncate table public.assessment_findings cascade`)`
- **Impact** : Un rollback de 00100 (même dans le cadre d'un rollback en chaîne) détruit irréversiblement l'intégralité des constats d'audit saisis en production, pas seulement les données introduites par la migration. Perte de données de conformité non récupérable.
- **Recommandation** : Rendre le down ciblé : ne supprimer que les findings issus du backfill (les marquer via une colonne/source à l'insertion, ou supprimer uniquement ceux liés aux CAR migrés) au lieu d'un `truncate ... cascade` global ; ou documenter explicitement le down comme non-destructif-safe et refuser le truncate.
- **Vérification** : Constat vérifié sur le code réel et exact.

Preuve fichier:ligne — supabase/migrations/00100_assessment_findings_backfill_down.sql:15 : `truncate table public.assessment_findings cascade;` sans aucune clause WHERE ni filtre. Le commentaire ligne 13 assume à tort « les rows ont ete creees par le backfill », ce qui est précisément l'hypothèse fausse : la table est créée par 00099 (00099_assessment_findings_up.sql), pas par 00100.

Le up de 00100 (00100_..._up.sql:53-68 et 78-112) n'insère que des miroirs de CAR et des notes legacy, SANS colonne marqueur (ai_generated=false y compris pour le back

### 12. [MINEUR] Branche entity_org_id de cpc_select_own_org comparée à users.client_org_id (espaces d'ID incompatibles → policy morte pour les assujettis Regul)
- **Dimension** : rls
- **Localisation** : `supabase/migrations/00141_portal_contact_entity_link_up.sql (policy cpc_select_own_org, branche entity_org_id)`
- **Impact** : La policy est du code mort côté Regul: un assujetti ne voit jamais les autres contacts de sa propre entité via ce chemin (il ne voit que sa propre fiche via cpc_select_self, 00142). Fonctionnalité portail assujetti dégradée; risque de confusion future si quelqu'un met client_org_id à un organizations.id (collision d'espaces d'ID → potentielle fuite si les deux tables partagent un uuid).
- **Recommandation** : Réécrire la branche Regul pour comparer entity_org_id au périmètre canonique de l'assujetti, en réutilisant get_my_entity_org_ids() (00145): ... OR (entity_org_id is not null AND entity_org_id in (select public.get_my_entity_org_ids())). Cela aligne la visibilité inter-contacts sur le même helper SECURITY DEFINER déjà utilisé pour inc_select_assujetti.
- **Vérification** : Constat exact, vérifié sur le code réel. Les trois ancrages sont confirmés : (1) entity_org_id REFERENCES public.organizations(id) — 00141_portal_contact_entity_link_up.sql (ADD COLUMN entity_org_id). (2) users.client_org_id REFERENCES public.cabinet_clients(id) — 00040_portal_user_role_up.sql:6, avec commentaire ligne 12 « Référence cabinet_clients ... NULL pour les auditeurs ». (3) invite-assujetti/index.ts:163 laisse explicitement client_org_id NULL : commentaire « client_org_id reste NULL : FK -> cabinet_clients, inapplicable à un assujetti. »

La branche entity_org_id de cpc_select_own_or

### 13. [MINEUR] Policies de supervision groupe sans garde not is_client_role() — cloisonnement client dépendant d'un effet de bord de 00134
- **Dimension** : rls
- **Localisation** : `supabase/migrations/00058_group_supervision_policies_up.sql:9-13 (missions_select_group), et ca_select_group / car_select_group`
- **Impact** : Cloisonnement fragile: toute régression sur get_my_organization_id() (revert 00134, ou un client dont organization_id serait un jour renseigné à une org groupe) rouvre immédiatement une lecture cross-tenant des missions/évaluations/CAR de toutes les entités du sous-arbre. Défense en profondeur manquante sur des tables sensibles.
- **Recommandation** : Ajouter la garde explicite à chaque policy: using (not public.is_client_role() and <condition existante>), comme fait systématiquement en 00133. Coût nul, aligne sur la doctrine, supprime la dépendance implicite à l'effet de bord de 00134.
- **Vérification** : Constat factuellement exact mais surcoté. Le code réel confirme les 3 points :

1) Les 3 policies existent telles que citées et sans garde de rôle : supabase/migrations/00058_group_supervision_policies_up.sql — missions_select_group (l.9-16), ca_select_group (l.21-32), car_select_group (l.37-48), toutes gatées uniquement sur `client_id IN (SELECT public.get_subsidiary_ids(public.get_my_organization_id()))`. Aucune migration ultérieure (00127/00133/00136/00143/00144) ne les recrée avec un guard.

2) La doctrine invoquée est réelle : 00133_rls_client_guard_pass1_up.sql:1-12 énonce explicitement 

### 14. [MINEUR] get_my_client_visible_org_ids ne couvre pas le chemin entity_org_id (branding portail assujetti Regul manquant en RLS)
- **Dimension** : rls
- **Localisation** : `supabase/migrations/00135_organizations_scoped_select_up.sql (get_my_client_visible_org_ids)`
- **Impact** : Un assujetti Regul ne peut pas lire, via cette policy, sa propre org ni l'org du régulateur (branding, « audité par X »). Comme get_my_organization_id() est NULL pour lui (00134), il peut se retrouver sans aucune ligne organizations visible → dégradation d'affichage du portail assujetti. Pas de fuite, mais fonctionnalité incomplète pour le nouveau produit Regul.
- **Recommandation** : Étendre get_my_client_visible_org_ids() (ou ajouter une branche à organizations_select_scoped) pour le chemin entity: union select entity_org_id from client_portal_contacts where user_id = get_my_user_id() and entity_org_id is not null, et l'org régulateur parente correspondante.
- **Vérification** : Constat vérifié sur le code réel, sévérité mineur confirmée.

Chaîne de preuves:
- 00135_organizations_scoped_select_up.sql:50-58 — get_my_client_visible_org_ids() ne joint QUE via cpc.cabinet_client_id = cc.id (deux SELECT). Aucune branche entity_org_id.
- 00141_portal_contact_entity_link_up.sql:26-28 — CHECK XOR: pour un contact assujetti, cabinet_client_id IS NULL, entity_org_id IS NOT NULL. Donc les deux SELECT du helper ne renvoient rien.
- 00134_rls_client_scope_helpers_up.sql:28 — get_my_organization_id() renvoie NULL pour role='client', ce qui vide aussi get_my_client_org_ids() (00135:

### 15. [MINEUR] extract-org-chart-actors : aucun cloisonnement du mission_id fourni
- **Dimension** : edge
- **Localisation** : `supabase/functions/extract-org-chart-actors/index.ts:42-64,119-138`
- **Impact** : Un utilisateur authentifie peut imputer des appels IA (cout, quota) a une mission arbitraire d'un autre tenant via le champ mission_id, faussant la comptabilite ai_call_logs par mission/organisation. Impact limite : les acteurs extraits proviennent d'un fichier fourni par l'appelant (pas de fuite de donnees d'un autre tenant) et l'insertion en base est faite cote frontend apres validation.
- **Recommandation** : Apres authentification, charger la mission par mission_id et verifier mission.cabinet_id === callerProfile.organization_id (via sameCabinet) avant tout appel Claude/logAiCall. Refuser 403 sinon.
- **Vérification** : Constat confirmé sur le code réel. supabase/functions/extract-org-chart-actors/index.ts authentifie l'appelant (admin.auth.getUser l.50) mais accepte un mission_id arbitraire du formData (l.57-59) et ne charge jamais la mission ni ne vérifie mission.cabinet_id === organization_id de l'appelant. Ce mission_id est injecté tel quel dans logAiCall (l.123 et l.138), associé à un coût IA. Pire : organization_id est même codé en dur à null (l.123,138), donc aucun cloisonnement cabinet n'est enregistré.

Le pattern de cloisonnement existe et est documenté dans _shared/auth.ts (authenticateCaller + sam

### 16. [MINEUR] Fonctions de workflow d'audit : autorisation par identite mais sans verification is_active
- **Dimension** : edge
- **Localisation** : `supabase/functions/review-assessment/index.ts:33-44,95-103 ; supabase/functions/submit-assessment/index.ts:33-44,70-75 ; supabase/functions/generate-action-plan/index.ts:88-99,122-127 ; supabase/functions/send-to-client-review/index.ts:32-43,72-77 ; supabase/functions/close-mission/index.ts:32-43,68-73`
- **Impact** : Un membre suspendu (is_active=false) via manage-member conserve un JWT valide jusqu'a expiration et, tant qu'il figure encore comme auditeur/chef de mission/associe sur une mission, peut continuer a soumettre, valider, generer le plan d'action, envoyer au client et cloturer des missions — court-circuitant la revocation d'acces. Portee limitee a ses propres missions assignees.
- **Recommandation** : Selectionner is_active dans la requete de profil de ces fonctions et refuser 403 si false, ou mieux : router toutes ces fonctions via le helper partage authenticateCaller (_shared/auth.ts) qui verifie deja is_active de maniere centralisee (comme le font assign-controls, reset-user-password, issue-measure).
- **Vérification** : Constat verifie et exact sur le code reel. Les cinq fonctions resolvent le profil appelant avec .select('id') uniquement et n'evaluent jamais is_active : review-assessment/index.ts:33-37 puis autorisation par comparaison d'id l.95-98 ; submit-assessment/index.ts:33-37 puis l.70 (assessment.auditor_id !== callerProfile.id) ; generate-action-plan/index.ts:88-92 puis l.122 ; send-to-client-review/index.ts:32-36 puis l.72 ; close-mission/index.ts:32-36 puis l.68. Aucune ne charge is_active ni ne refuse un compte desactive. A l'inverse, manage-member/index.ts effectue bien la suspension via update(

### 17. [MINEUR] JWT (access + refresh token longue durée) stockés en localStorage sans CSP — tout XSS = prise de compte complète
- **Dimension** : front
- **Localisation** : `src/lib/supabase.ts:7 (createClient sans options) ; vercel.json (aucun header CSP) ; index.html (aucune meta CSP)`
- **Impact** : Facteur aggravant à la CSP absente : la moindre XSS (dépendance compromise, injection future) permet d'exfiltrer le refresh_token depuis localStorage. Le refresh_token étant réutilisable pour régénérer des access_token, c'est une prise de contrôle durable du compte (au-delà de la session), non révocable par simple logout. Contexte multi-tenant + rôles admin/cabinet = impact élevé si atteint.
- **Recommandation** : 1) Déployer une CSP stricte (script-src 'self', object-src 'none', base-uri 'self') via vercel.json headers ou meta — c'est le contrôle qui rend une XSS non exploitable. 2) Envisager un storage plus contraint pour la session ; a minima documenter le modèle de menace. Le code applicatif est par ailleurs propre côté XSS (SafeMarkdown skipHtml, aucun dangerouslySetInnerHTML) ce qui limite la probabilité d'origine.
- **Vérification** : Faits vérifiés sur le code réel : (1) src/lib/supabase.ts:7 appelle createClient sans bloc auth → défauts supabase-js v2 (^2.103.0) : persistSession=true, storage=localStorage, autoRefreshToken=true, donc access_token ET refresh_token en localStorage ; (2) aucune CSP nulle part — grep Content-Security-Policy sur json/html/ts/tsx/js = 0 résultat ; vercel.json ne pose que X-Frame-Options/nosniff/Referrer-Policy/Permissions-Policy ; index.html sans meta CSP ; middleware.ts existe mais n'est qu'un gatekeeper hostname marque-blanche (aucun header sécurité) ; (3) hygiène XSS réellement bonne : aucun

### 18. [MINEUR] issue-measure : finding_ids acceptés sans validation d'appartenance à l'entité/mission (fuite inter-entités dans le journal probant)
- **Dimension** : regul
- **Localisation** : `supabase/functions/issue-measure/index.ts:79,107`
- **Impact** : Un staff régulateur (potentiellement multi-périmètre) peut lier une mesure/sanction à des findings d'un AUTRE assujetti, produisant une pièce probante juridiquement erronée et une possible corrélation d'informations entre assujettis. Impact limité par le fait que l'appelant est déjà staff régulateur.
- **Recommandation** : Valider que chaque finding de `finding_ids` référence bien `entity_id` (et, si fourni, `mission_id`) via une requête sur la table des findings avant insertion ; rejeter en 400 sinon.
- **Vérification** : Constat exact dans les faits et bien localisé. Vérifié : `finding_ids uuid[] not null default '{}'` sans FK (00139_regulatory_measures_up.sql:12) ; l'Edge Function stocke `body.finding_ids ?? []` verbatim sans aucune vérification d'appartenance (issue-measure/index.ts:79) et propage `src.finding_ids` sans revalidation en escalate (l.107). Une validation d'appartenance à l'entité est faisable via la chaîne assessment_findings.assessment_id -> control_assessments.mission_id -> missions.client_id (= entity_id) et elle est bien absente. Un staff régulateur peut donc lier une mesure à des findings 

### 19. [MINEUR] declare-incident : mission_id d'un incident non validée contre l'entité déclarante
- **Dimension** : regul
- **Localisation** : `supabase/functions/declare-incident/index.ts:90-91`
- **Impact** : Un assujetti peut rattacher son incident à l'ID d'une mission arbitraire (y compris hors de son périmètre), corrompant le lien incident↔mission utilisé pour le suivi et faussant les vues de pilotage. La FK on delete set null n'apporte aucune garantie d'appartenance.
- **Recommandation** : Si `mission_id` est fourni, charger la mission et exiger `mission.client_id === entityId` (et cohérence régulateur) avant insertion ; sinon 403/400.
- **Vérification** : Constat confirmé sur le code réel. supabase/functions/declare-incident/index.ts:90 insère `mission_id: body.mission_id ?? null` sans aucune validation d'appartenance. Le contrôle de périmètre (l.77 `if (!allowed.has(entityId)) return 403`) ne porte QUE sur entity_id ; `allowed` est construit uniquement à partir de entity_org_id / sous-arbre (l.46-60), jamais sur les missions. `mission_id` est un champ accepté du Payload (index.ts:12) et le body provient d'un JSON brut (l.62), donc un assujetti authentifié peut POSTer directement n'importe quel mission_id vers cet endpoint HTTP public (le fait 

### 20. [MINEUR] Liens entité codés en dur /filiales dans des pages partagées group-module (trappe de portabilité Regul)
- **Dimension** : coherence
- **Localisation** : `src/features/group-module/TransversalPlansPage.tsx:101 ; src/features/group-module/ContinuousReviewsPage.tsx:56 ; comparer src/features/group-module/SubsidiaryCard.tsx:52 et SubsidiaryDetailPage.tsx:22`
- **Impact** : Incohérence dans Comply (deux façons de construire le même lien) et lien mort si ces pages sont montées en Regul, où la route est /assujettis/:id et où /filiales n'est pas enregistrée (RegulApp.tsx). Branchement produit fragile : la neutralisation par vocab n'est pas appliquée uniformément.
- **Recommandation** : Remplacer les chemins codés en dur par `${productVocab.entityRouteBase}/${id}` dans les deux pages, comme SubsidiaryCard, pour garantir la cohérence Comply/Regul.
- **Vérification** : Constat globalement exact au niveau code, mais son impact "runtime en Regul" est surestimé.

Faits vérifiés :
- src/features/group-module/TransversalPlansPage.tsx:101 : `<Link to={`/filiales/${c.subsidiary_id}`}>` — base de route codée en dur. CONFIRMÉ.
- src/features/group-module/ContinuousReviewsPage.tsx:56 : `<Link to={`/filiales/${m.subsidiary_id}`}>` — idem. CONFIRMÉ.
- src/features/group-module/SubsidiaryCard.tsx:52 utilise bien `${productVocab.entityRouteBase}/${subsidiary.id}` et SubsidiaryDetailPage.tsx:22 `productVocab.entityRouteBase` (src/lib/product.ts:47 => /assujettis en Regul, 

### 21. [MINEUR] Aucun Content-Security-Policy alors que des dépendances de sanitisation HTML (DOMPurify) sont vulnérables et que du Markdown utilisateur est rendu
- **Dimension** : deps
- **Localisation** : `vercel.json:8-16 (headers : X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy — pas de CSP) ; dépendances prod dompurify@3.3.3 + react-markdown@10.1.0 (package-lock.json)`
- **Impact** : En l'absence de CSP, toute faille XSS résiduelle (Markdown, PDF html plugin, DOMPurify contourné) s'exécute sans filet côté navigateur. Défense en profondeur manquante sur une app manipulant des données d'audit sensibles multi-tenant.
- **Recommandation** : Ajouter un header Content-Security-Policy strict dans vercel.json (au minimum default-src 'self', frame-ancestors 'none', object-src 'none', connect-src limité à l'URL Supabase). Mettre DOMPurify à jour (>=3.3.x patché) via `npm audit fix`.
- **Vérification** : Constat PARTIELLEMENT réel mais fortement surévalué ; sévérité réelle = mineur (défense en profondeur), pas majeur.

FAITS CONFIRMÉS : (1) Aucun CSP. vercel.json:7-16 ne pose que X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy — pas de Content-Security-Policy. middleware.ts (racine) ne pose AUCUN header de sécurité (uniquement routing hostname marque blanche, ligne 76-80 passthrough). Pas de meta CSP dans index.html. (2) dompurify@3.3.3 présent (package-lock.json). npm audit confirme des advisories sur <=3.4.10.

RÉFUTATION DU MODÈLE DE MENACE (ce qui 

### 22. [MINEUR] La CI ne teste jamais les migrations (ni up, ni rollback down) : régressions de schéma non détectées
- **Dimension** : deps
- **Localisation** : `.github/workflows/ci.yml (aucune étape supabase/migration) ; 146 paires up/down dans supabase/migrations/`
- **Impact** : Une migration `up` cassée, un `down` non symétrique ou une policy RLS récursive n'est détecté qu'en prod/staging. Sur une base à 146 migrations avec RLS multi-tenant, un rollback raté est un incident de production probable.
- **Recommandation** : Ajouter un job CI qui, sur une Postgres éphémère (service container), applique séquentiellement tous les `_up.sql` puis tous les `_down.sql` en ordre inverse, et échoue à la première erreur. Cela valide la symétrie up/down et l'ordre des dépendances.
- **Vérification** : Les faits du constat sont exacts et verifies sur le code reel :

1. `.github/workflows/ci.yml` ne contient que 3 etapes : `Typecheck` (npm run typecheck / tsc -b), `Build` (vite build) et `Lint` (informatif, continue-on-error). Aucune etape n'instancie une Postgres jetable ni n'applique les migrations.

2. Le seul autre workflow, `.github/workflows/feasibility.yml`, est sans rapport : c'est un agent d'analyse de faisabilite RICE (workflow_dispatch, lecture seule sur le repo). Il ne teste aucune migration. Il n'existe aucun autre fichier CI/YAML dans le repo.

3. Le decompte est exact : `supaba

### 23. [MINEUR] Aucune version Node épinglée (pas de `engines` ni `.nvmrc`) alors que le stack est en pré-release (TS 6, Vite 8, React 19)
- **Dimension** : deps
- **Localisation** : `package.json (pas de champ `engines`) ; racine (pas de `.nvmrc`) ; vercel.json (pas de pin runtime) ; .github/workflows/ci.yml:node-version '22'`
- **Impact** : Dérive possible entre l'environnement CI (Node 22) et le build Vercel (Node par défaut du projet, potentiellement différent) : builds reproductibles non garantis, risque d'échec de build prod passant pourtant en CI.
- **Recommandation** : Ajouter `"engines": { "node": ">=22 <23" }` dans package.json et un `.nvmrc` (22) ; fixer la Node version dans les settings Vercel pour aligner CI et prod.
- **Vérification** : Constat vérifié sur le code réel, tous les faits sont exacts :

- package.json : aucun champ `engines` (node -e → undefined).
- Racine : aucun `.nvmrc` ni `.node-version`.
- vercel.json : buildCommand `npm run typecheck && npm run build`, aucun pin de runtime Node (pas de champ, pas de .vercel/ non plus).
- .github/workflows/ci.yml:35 (setup-node) épingle `node-version: '22'`.
- Stack réellement en versions majeures très récentes, confirmées à l'installation : typescript 6.0.3 (déclaré ~6.0.2), vite 8.0.16 (déclaré ^8.0.4), react 19.2.4.

La dérive est concrète : la machine de dev tourne sous 

### 24. [INFO] Dépendances transitives supplémentaires signalées high/moderate (dompurify, tmp, ws) — surface majoritairement dev/transitive
- **Dimension** : front
- **Localisation** : `npm audit --omit=dev (racine du repo)`
- **Impact** : Faible en production frontend : dompurify n'est pas importé par le code applicatif (grep dompurify dans src/ = 0 ; c'est une dépendance transitive, probablement de jspdf/html2canvas et non appelée sur du HTML attaquant). tmp et ws sont des dépendances de build/tooling non embarquées dans le bundle client servi. À traiter par hygiène, pas comme exposition directe.
- **Recommandation** : Lancer `npm audit fix` (non-breaking) pour dompurify/tmp/ws/react-router en une passe, puis committer le package-lock. Vérifier après coup que le bundle client ne régresse pas.
- **Vérification** : Constat vérifié sur l'arbre de dépendances réel. `npm audit --omit=dev` confirme exactement les 3 avis cités : dompurify <=3.4.10 (moderate, multiples bypass XSS/FORBID_TAGS), tmp <0.2.6 (high, path traversal), ws 8.0.0-8.20.1 (high, DoS/mem disclosure), avec « fix available via npm audit fix » (non-breaking) pour les trois. Total 7 vulnérabilités (3 moderate, 4 high) — chiffre exact.

Chaînes transitives confirmées via `npm ls` :
- dompurify@3.4.9 <- jspdf@4.2.1 (jspdf est bien une dépendance prod, package.json:17). Grep « dompurify » dans src/ = 0 : jamais importé directement par le code app

### 25. [INFO] anon key Supabase versionnée en .env.local (public par nature, mais présente sur disque)
- **Dimension** : front
- **Localisation** : `.env.local:2 (VITE_SUPABASE_ANON_KEY=eyJ...role":"anon")`
- **Impact** : Aucun réel : la clé anon est conçue pour être publique (elle est de toute façon exposée dans le bundle via import.meta.env.VITE_*). L'important — l'absence de service_role côté client — est respecté. Le fichier n'étant pas tracké, pas de fuite git.
- **Recommandation** : RAS sur la clé anon. Maintenir l'invariant : aucune clé service_role dans le frontend (déjà le cas). S'assurer que la sécurité repose entièrement sur la RLS puisque l'anon key est publique.
- **Vérification** : Constat vérifié et exact. .env.local existe sur disque avec VITE_SUPABASE_ANON_KEY en ligne 2 (confirmé par Read). Le JWT décodé donne bien {"iss":"supabase","ref":"jibblzpownddlodzmewj","role":"anon","iat":1775861157,"exp":2091437157} — c'est le rôle anon, pas service_role. .gitignore:13 (*.local) couvre le fichier : `git check-ignore -v .env.local` renvoie ".gitignore:13:*.local  .env.local", `git ls-files | grep env` est vide, et `git log --all` ne montre aucun .env* dans l'historique → jamais commité, aucune fuite git. Aucune clé service_role dans le frontend : le seul hit `service_role` d

### 26. [INFO] Rollback 00136 rétrograde get_subsidiary_ids en mono-niveau, cassant silencieusement la RLS récursive de tout le socle Regul (et des groupes Comply multi-niveaux)
- **Dimension** : regul
- **Localisation** : `supabase/migrations/00136_entity_structure_down.sql:6-24`
- **Impact** : En cas de rollback partiel, les petits-enfants (arbre multi-niveaux) deviennent invisibles côté supervision Regul ET côté visibilité des groupes Comply, sans erreur — dégradation silencieuse de visibilité. Purement opérationnel (dépend d'un rollback mal ordonné), d'où info.
- **Recommandation** : Ajouter dans l'en-tête du 00136_down un avertissement explicite « ne pas rollbacker tant que 00137→00146 sont appliquées », ou garder la version récursive de get_subsidiary_ids dans le down (le récursif est un surensemble sûr du mono-niveau).
- **Vérification** : Faits vérifiés sur le code réel. 00136_up (lignes 25-44) rend get_subsidiary_ids RÉCURSIF (WITH RECURSIVE, multi-niveaux). 00136_down (lignes 7-18) le rétrograde bien en mono-niveau (enfants directs uniquement). Les policies dépendantes existent et appellent toutes get_subsidiary_ids(get_my_organization_id()) : erp_select_regulator (00137_up:46), rm_select_regulator (00139_up:47) et la policy incidents (00144_up:80). J'ai vérifié que les _down de 00137/00139/00144 ne restaurent PAS get_subsidiary_ids (seul grep positif sur _down : 00057, 00127, 00136) — donc un rollback isolé de 00136 laissera

### 27. [INFO] Transition de statut de mission via fetch REST brut au lieu du client Supabase typé
- **Dimension** : coherence
- **Localisation** : `src/features/missions/scoping/MissionScopingTab.tsx:171-184`
- **Impact** : Perte du typage et de la gestion d'erreur homogène ; en cas d'échec le message générique masque la cause (le corps texte n'est que loggé). Dette de cohérence, pas de faille directe.
- **Recommandation** : Aligner sur les deux autres onglets : utiliser `supabase.from('missions').update({ status: 'planning' }).eq('id', mission.id)` avec gestion `error` explicite.
- **Vérification** : Constat exact et vérifié sur le code réel. MissionScopingTab.tsx:171-184 (handleValidateScoping) effectue bien la transition de statut de mission via un fetch REST brut : PATCH sur `${VITE_SUPABASE_URL}/rest/v1/missions?id=eq.${mission.id}` avec headers manuels apikey + Authorization Bearer + Prefer: return=minimal, body {status:'planning'}, et en cas d'échec le corps texte n'est que loggé (console.error) avec un message générique. Les deux onglets frères font la même opération via le client typé avec gestion error explicite : MissionFieldworkTab.tsx:90-93 (`supabase.from('missions').update({ 

### 28. [INFO] react-router-dom 7.14.0 (dépendance runtime) : vulnérabilité haute turbo-stream RCE + CSRF + open redirect + DoS
- **Dimension** : deps
- **Localisation** : `package.json:16 ("react-router-dom": "^7.14.0") ; package-lock.json → node_modules/react-router@7.14.0`
- **Impact** : C'est la lib de routage runtime servie en production (app.gestugroup.com). L'open redirect et le CSRF sont directement exploitables sur une SPA multi-tenant exposée ; la chaîne turbo-stream est classée RCE non authentifiée. Sur une plateforme de conformité/audit SI, c'est le constat le plus grave.
- **Recommandation** : Passer react-router-dom en ^7.15.1 (ou dernière 7.x patchée) et re-lock (npm update react-router-dom react-router). Vérifier qu'aucun usage de loaders/actions SSR turbo-stream n'est en jeu, puis re-tester le routage. À faire avant tout audit.
- **Vérification** : La dépendance et les avis sont réels mais la sévérité/exploitabilité sont grossièrement surestimées. Vérifié : package.json:22 "react-router-dom": "^7.14.0" et package-lock.json résolvent react-router ET react-router-dom en 7.14.0 ; npm audit confirme les 4 GHSA. MAIS les sévérités réelles d'npm audit contredisent le reviewer : turbo-stream = HIGH 8.1 (pas RCE critique), open redirect = MODERATE, DoS __manifest = HIGH 7.5, CSRF = LOW 3.1 — aucune n'est "bloquante". Surtout, TOUTES ces vulnérabilités vivent dans le chemin serveur SSR/framework-mode de react-router, absent de cette application. 