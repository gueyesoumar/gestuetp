# Guide d'onboarding fonctionnel — Gëstu ETP

> Complément au dossier fonctionnel, conçu pour être **autoporteur** : une personne externe au projet doit pouvoir comprendre l'application sans autre contexte. Version du 2026-07-09.
> Contient : périmètre & hypothèses (§1), glossaire (§2), intégrations (§3), schémas (§4), **scénarios de bout en bout** (§5), **dictionnaire de données** (§6), **machines à états** (§7).

---

## 1. Périmètre, hypothèses & hors-périmètre

**Dans le périmètre** : application web (SPA React) Gëstu ETP — produits Comply et Regul — et son backend Supabase (PostgreSQL + RLS, Auth, Storage, Edge Functions).

**Hypothèses de fonctionnement**
- **Langue** : interface en **français** (fr-FR).
- **Support** : navigateurs modernes (desktop en priorité ; responsive présent).
- **Connexion** : application en ligne (pas de mode hors-ligne).
- **Multi-tenant** : plusieurs cabinets/organisations cohabitent sur une même instance Comply ; Regul est sur une **instance dédiée**.
- **Authentification** : comptes nominatifs (Supabase Auth). Pas d'accès anonyme aux données.

**Hors périmètre fonctionnel**
- Facturation/paiement en ligne (des *plans* existent mais l'encaissement n'est pas géré ici).
- Signature électronique qualifiée (le journal probant assure l'intégrité, pas la signature eIDAS).
- Mobile natif.

---

## 2. Glossaire d'acronymes & termes

| Terme | Signification |
|---|---|
| **Référentiel** (framework) | Cadre normatif (ISO 27001, PSSI-ES…) structuré en domaines → contrôles |
| **Contrôle** | Exigence vérifiable d'un référentiel |
| **Évaluation** (assessment) | Jugement porté sur un contrôle dans une mission |
| **Constat** (finding) | Point relevé sur un contrôle |
| **NC / PC / LC / C / N/A** | Niveaux de conformité : Non conforme / Partiellement / Largement / Conforme / Non applicable |
| **major_nc / minor_nc** | Non-conformité majeure / mineure (classification d'un constat) |
| **observation / strength** | Constat mineur non bloquant / point fort |
| **CAR** | *Corrective Action Request* — action corrective du plan d'action |
| **PSSI-ES** | Politique de Sécurité des Systèmes d'Information de l'État (Sénégal) — le référentiel régulateur |
| **Assujetti** (Regul) | Organisation soumise à la supervision de l'autorité |
| **OIV** | Opérateur d'Importance Vitale (terme FR ; **abandonné** au profit d'une criticité neutre) |
| **RLS** | *Row-Level Security* — cloisonnement au niveau des lignes en base |
| **Lead / associé / auditeur** | Rôles dans une mission (chef, qualité, terrain) |

---

## 3. Intégrations externes

| Intégration | Usage | Où |
|---|---|---|
| **Supabase** | Base PostgreSQL, Auth (JWT), Storage (documents/logos), RLS, Edge Functions (Deno) | Cœur backend |
| **Resend** | Envoi d'e-mails (invitations, réinitialisation, relances) | Edge Functions `_shared/resend.ts` |
| **Anthropic (Claude)** | Fonctions IA (pré-remplissage questionnaire, plan, analyse, risques) | Edge Functions `smart-*`, `ai-documents` |
| **Génération de documents** | PDF (rapports, note de cadrage), Excel (plan d'action), PPTX (restitution) | Côté client (`jspdf`, `exceljs`) |
| **DNS / domaines custom** | Marque blanche : domaine du cabinet (CNAME) résolu avant login | `resolve-tenant-by-hostname`, `dns-verify-tenant` |
| **Vercel** | Hébergement du frontend, CI build, en-têtes de sécurité | `vercel.json` |

---

## 4. Schémas

### 4.1 Acteurs & relations

```
                          GËSTU ETP
        ┌───────────────────────────┬───────────────────────────┐
        │           COMPLY          │           REGUL           │
   ┌────┴─────┐               ┌─────┴──────┐            ┌────────┴────────┐
   │ Cabinet  │  audite  ───▶ │  Client    │            │   Régulateur    │
   │ d'audit  │               │  (audité)  │            │   (autorité)    │
   └────┬─────┘               └────────────┘            └────────┬────────┘
        │ équipe                                                  │ supervise 1..N
   ┌────┴──────────────┐                              ┌───────────┴───────────┐
   │ lead / associé /  │                              │      Assujettis        │
   │ auditeurs         │                              │  (entités régulées)    │
   └───────────────────┘                              └────────────────────────┘

   Super-admin (éditeur) : transverse aux deux — gère cabinets, référentiels, plans.
```

### 4.2 Chaîne métier (du référentiel à l'action)

```
Référentiel ─▶ Domaines ─▶ Contrôles
                                │  (dans une Mission)
                                ▼
                          Évaluations ─▶ Constats ─▶ Rapport ─▶ Plan d'action
                                │                                    (Comply)
                                │
                   (Regul) Constats ─▶ Mesures graduées ──┐
                           Incidents ───────────────────┐ │
                                                         ▼ ▼
                                              Journal probant (append-only, hash)
```

### 4.3 Cycle de vie d'une mission

```
initialization ─▶ scoping ─▶ planning ─▶ fieldwork ─▶ internal_review ─▶ client_review ─▶ closure
   (création)     (cadrage)  (planif.)   (travaux)     (revue interne)   (valid. client)  (clôture)
                                                                                   │
                                                                                   ▼
                                                                            Plan d'action (suivi CAR)
```

---

## 5. Scénarios de bout en bout

### 5.1 Comply — un audit ISO 27001 complet

**Contexte** : le cabinet *AuditCo* audite son client *BanqueX* sur ISO 27001.

1. **Créer la mission** — Un membre habilité (`can_create_mission`) ouvre `/missions/nouvelle` (assistant 6 étapes) : type = audit → référentiel ISO 27001 → client BanqueX → équipe (lead + auditeurs) → dates → confirmation. La mission naît en `initialization`.
2. **Cadrage** — Le lead définit le périmètre, lance le **questionnaire** à BanqueX (invitation e-mail d'un contact), identifie des risques initiaux. (IA optionnelle : *Smart Interview* pré-remplit le questionnaire à partir des documents déposés ; *Smart Risks* propose des risques.) Statut → `scoping`.
3. **Planification** — Le lead sélectionne les contrôles pertinents, leur attribue un **niveau de risque** et affecte chaque contrôle à un auditeur (IA optionnelle : *Smart Plan*). Statut → `planning`.
4. **Travaux** — Chaque auditeur ouvre ses contrôles, **observe → documente → analyse**, dépose/relie des **preuves**, pose un **niveau de conformité** (NC/PC/LC/C/N-A) et crée des **constats**. Il **soumet** (`submitted`). Statut → `fieldwork`.
5. **Revue interne** — Le lead revoit chaque évaluation (`in_review`) et **approuve** ou **rejette** (renvoi en correction). Statut → `internal_review`.
6. **Validation client** — Les évaluations approuvées sont envoyées à BanqueX, qui **valide ou conteste** et pose des **observations**. Statut → `client_review`.
7. **Clôture** — Le lead clôt : calcul du **score de conformité**, génération du **rapport d'audit (PDF)** et du **plan d'action (Excel)**. Statut → `closure`.
8. **Plan d'action** — BanqueX suit ses **CAR** (`open → client_responded → verified → closed`), l'auditeur vérifiant les remédiations.

### 5.2 Regul — un contrôle de la DCSSI

**Contexte** : le régulateur *DCSSI* supervise l'assujetti *Opérateur Télécom National*.

1. **Enregistrer l'assujetti** (M1) — Sur `/assujettis`, création de l'entité + **profil réglementaire** (criticité élevée/standard/indéterminée, régime, tier).
2. **Planifier un contrôle** (M3) — Sur `/controles/nouvelle`, mission de contrôle sur le référentiel **PSSI-ES** (11 domaines / 213 contrôles).
3. **Évaluer & constater** — Même moteur qu'en Comply : évaluations + constats.
4. **Prononcer une mesure** (M4) — Sur `/constats`, l'autorité transforme des constats en **mesure graduée** (recommandation d'abord ; escalade possible vers mise en demeure → injonction → sanction). Chaque acte est **ancré dans le journal probant**.
5. **Inviter l'assujetti au portail** (M7) — Depuis la fiche assujetti → « Gérer les accès » → un contact reçoit une invitation et accède à un espace **strictement cloisonné**.
6. **Incidents** (M5) — L'assujetti **déclare** un incident depuis son portail ; l'autorité le **qualifie**, suit les **échéances** de notification (figées à la déclaration), puis **notifie/résout/clôt**.
7. **Piloter** (M8) — Le tableau de bord agrège la **posture du parc** : criticité × conformité, priorités d'action, mesures ouvertes, échéances.

---

## 6. Dictionnaire de données (entités clés)

> Champs *signifiants* (métier), pas exhaustifs techniquement. Types PostgreSQL simplifiés.

### `organizations`
Cabinet, client, groupe ou assujetti selon `types[]` / `parent_org_id`. Champs : `name`, `slug`, `types[]` (`cabinet`/`group`/…), `parent_org_id` (hiérarchie), `entity_type` (`filiale`/`site`/`direction`/`business_unit`), `is_active`.

### `users`
`auth_id` (lien Supabase Auth), `organization_id`, `email`, `first_name`/`last_name`, `role` (`auditor`/`client`), `is_platform_owner`, `is_active`.

### `missions`
`cabinet_id` (cabinet ou régulateur), `client_id` (client ou assujetti), `framework_id`, `name`, `status` (voir §7), `kind` (`audit`/`continuous_supervision`), `lead_auditor_id`, `associate_id`, `start_date`/`end_date`, `is_active`.

### `control_assessments`
`mission_id`, `control_id`, `status` (voir §7), `conformity_level` (`nc`/`pc`/`lc`/`c`/`na`), champs d'observation/analyse.

### `assessment_findings`
`assessment_id`, `classification` (`major_nc`/`minor_nc`/`observation`/`strength`), `description`, `risk`, `recommendation`, `priority`, échéance proposée.

### `mission_evidence_requests`
`mission_id`, `status` (`pending`/`uploaded`/`declined_by_client`/`accepted`/`reissued`/`escalated_to_finding`), motif de refus (`inexistant`/`non_applicable`/`confidentialite`), `escalated_assessment_id`.

### `client_portal_contacts` / `client_mission_access`
Contact portail : `cabinet_client_id` **XOR** `entity_org_id` (Regul), `user_id`, `portal_status` (`pending`/`invited`/`active`). Accès : `contact_id`, `mission_id`, `permission` (`contributor`/`viewer`/`approver`).

### `frameworks` / `domains` / `controls`
Référentiel → domaines → contrôles (`code`, `name`, `risk_level`, `sort_order`).

### `entity_regulatory_profile` (Regul)
`organization_id`, `criticality` (`eleve`/`standard`/`indetermine`), `obligation_regime`, `tier`, `status` (`active`/`exited`), dates.

### `regulatory_measures` (Regul)
`entity_id`, `mission_id?`, `finding_ids[]`, `measure_type` (`recommandation`/`mise_en_demeure`/`injonction`/`sanction`), `status` (voir §7), `parent_measure_id` (escalade), `deadline`, `issued_at`.

### `incidents` (Regul)
`entity_id`, `declared_by`, `category` (`intrusion`/`ransomware`/`fuite_donnees`/`deni_service`/`autre`), `severity` (`faible`/`moyen`/`eleve`/`critique`), `status` (voir §7), `detected_at`, `declared_at`, `initial_deadline`/`final_deadline`, `notified_initial_at`/`final_report_at`.

### `probative_log` (Regul)
`seq`, `occurred_at`, `actor_user_id`, `action_type`, `subject_type`, `subject_id`, `payload`, `prev_hash`, `hash`. Append-only.

> **Note de typage** : certains champs à valeurs contraintes sont stockés en `text` avec un CHECK côté base et une énumération côté application (ex. `conformity_level`, `criticality`) plutôt qu'en type union strict dans `database.types.ts`. Les valeurs listées ci-dessus sont les valeurs réellement acceptées (CHECK SQL), à considérer comme la source de vérité.

---

## 7. Machines à états (transitions complètes)

### 7.1 Mission (`missions.status`)

| De → Vers | Déclencheur | Acteur | Pré-condition |
|---|---|---|---|
| `initialization → scoping` | Démarrage du cadrage | Lead | Mission créée |
| `scoping → planning` | Cadrage validé | Lead | Périmètre/questionnaire définis |
| `planning → fieldwork` | Contrôles affectés | Lead | Contrôles + auditeurs assignés |
| `fieldwork → internal_review` | Envoi en revue | Lead | Évaluations soumises |
| `internal_review → client_review` | Envoi au client | Lead/associé | Évaluations approuvées |
| `client_review → closure` | Clôture | Lead | Retours client traités |
| (transverse) `closure → action_plan` | Suivi remédiation | Client + auditeur | Rapport généré |

### 7.2 Évaluation d'un contrôle (`control_assessments.status`)

Transitions **imposées côté serveur** (`submit-assessment`, `review-assessment`, `client-review-assessment`) :

| De → Vers | Déclencheur | Acteur |
|---|---|---|
| `— → draft` | Ouverture d'un contrôle | Auditeur affecté |
| `draft → submitted` | Soumission | Auditeur |
| `submitted → in_review` | Approbation par le lead **lorsqu'un associé doit encore revoir** (mission avec `associate_id`) | Lead |
| `submitted → approved` | Approbation par le lead **sans associé** | Lead |
| `in_review → approved` | Approbation par l'associé | Associé |
| `submitted / in_review → rejected` | Rejet (renvoi en correction) | Lead / associé |
| `rejected → submitted` | Re-soumission après correction | Auditeur |
| `approved → (validé client)` | Validation par le client | Client (`approver`) |
| `approved → draft` | Contestation par le client (renvoi en reprise) | Client (`approver`) |

Point clé : l'état `in_review` **n'apparaît que si la mission a un associé** ; sinon le lead approuve directement (`submitted → approved`). Chaque acte de revue est tracé dans `assessment_validations` (piste d'audit).

### 7.3 Demande de preuve (`mission_evidence_requests.status`)

| De → Vers | Déclencheur | Acteur |
|---|---|---|
| `— → pending` | Demande créée | Auditeur |
| `pending → uploaded` | Dépôt d'un document | Client |
| `pending → declined_by_client` | Refus motivé | Client |
| `uploaded → accepted` | Preuve acceptée | Auditeur |
| `declined_by_client → reissued` | Relance | Auditeur |
| `declined_by_client → escalated_to_finding` | Escalade en constat | Auditeur |

### 7.4 Mesure réglementaire (`regulatory_measures.status`) — Regul

| De → Vers | Déclencheur | Acteur |
|---|---|---|
| `— → draft` | Création d'un acte | Régulateur |
| `draft → issued` | Émission (ancrage probant) | Régulateur |
| `issued → acknowledged` | Prise en compte | Assujetti/Régulateur |
| `issued → appealed` | Contestation | Assujetti |
| `acknowledged → resolved` | Résolution | Régulateur |
| `resolved → closed` | Clôture | Régulateur |
| (parallèle) escalade | Nouvelle mesure `parent_measure_id` de **niveau supérieur** | Régulateur |

### 7.5 Incident (`incidents.status`) — Regul

| De → Vers | Déclencheur | Acteur |
|---|---|---|
| `— → declared` | Déclaration (échéances figées) | Assujetti ou régulateur |
| `declared → triage` | Mise en qualification | Régulateur |
| `triage → notified` | Notification initiale enregistrée | Régulateur |
| `notified/triage → resolved` | Résolution | Régulateur |
| `resolved → closed` | Clôture | Régulateur |

Actes de notification (`notified_initial_at`, `final_report_at`) et changements de statut **ancrés dans le journal probant**.

> **Nuance importante** : l'ordre des statuts d'incident est **indicatif** (guidé par l'UI). Côté serveur, `declare-incident` n'impose pas l'ordre pour `set-status` (hormis `notify` qui exige `triage`) — un régulateur habilité peut fixer un statut valide directement. À l'inverse, les transitions des **évaluations** (§7.2) et l'**escalade des mesures** (§7.4, obligatoirement vers un niveau supérieur) **sont** contraintes côté serveur.

---

*Ce guide rend le dossier fonctionnel autoporteur pour un lecteur externe. Voir aussi `00-contexte-metier-et-vision.md` (le pourquoi) et `01-dossier-fonctionnel.md` (référence détaillée).*
