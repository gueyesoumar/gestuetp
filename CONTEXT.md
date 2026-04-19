# Gëstu Comply — Document de contexte projet

> **Usage** : Coller ce fichier en début de chaque session Claude (chat ou Claude Code) avant de travailler sur le projet.

---

## 1. Vision produit

**Gëstu Comply** est le premier module de **Gëstu ETP (Enterprise Trust Platform)**, une suite de solutions autour de la confiance numérique. Les modules futurs incluront : gestion du risque, politiques & procédures, data privacy, etc.

**Gëstu Comply** est une plateforme multi-référentiels de contrôle de conformité et d'audit SI (global ou sectoriel). Elle accompagne les organisations dans leurs projets de conformité sur des référentiels standards (ISO 27001, COBIT, ITIL, NIST, etc.).

Les référentiels sont **gérés et maintenus par Gëstu** (pas par les clients).

---

## 2. Segments de marché (B2B2B)

### Segment 1 — Cabinets de conseil ⭐ (priorité V1)
Cabinets accompagnant plusieurs clients sur des audits SI et projets de conformité.
- **Objectif** : Automatiser les missions, approche customer-centric, intégration IA.
- **Modèle** : Le cabinet crée des missions pour ses clients. Le client a accès à la plateforme **uniquement pendant la durée de la mission**.

### Segment 2 — Entreprises groupe / Holding
Groupes avec filiales souhaitant superviser leur conformité, réaliser des audits et assurer le suivi des recommandations et plans d'action.

### Segment 3 — Fonds d'investissement / Accompagnement
Fonds travaillant avec des start-ups/PMEs souhaitant :
- En entrée : due diligence (avant investissement)
- En cours : contrôle de conformité et audit des entreprises en portefeuille

---

## 3. Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + Vite + TypeScript (`strict: true`) |
| Styling | Tailwind CSS |
| Backend / BDD | Supabase (Auth, Database, Storage, RLS) |
| Email | Resend |
| IDE | VS Code + Claude Code |
| Repo | github.com/gueyesoumar/gestuetp |

---

## 4. Règles de développement non négociables

1. **TypeScript strict** : Pas de `any` implicite, pas d'assertions `as Type` non justifiées. `strict: true` dans `tsconfig.json`.
2. **Gestion async** : Tout hook async doit avoir un cleanup (`AbortController` ou return function dans `useEffect`).
3. **Gestion d'erreur Supabase** : Chaque requête Supabase doit avoir un bloc `error` géré explicitement.
4. **Taille des composants** : Max 150 lignes par composant. Au-delà, découper en sous-composants.
5. **Strings français** : Toujours utiliser les entités HTML (`&apos;`, `&laquo;`, `&raquo;`) ou template literals dans le JSX. Jamais d'apostrophes ou guillemets français bruts.
6. **Migrations SQL** : Chaque migration doit être accompagnée de son script de rollback (`down`).
7. **Sécurité RLS** : Tester toujours avec un compte non-admin avant de déployer. Les Row Level Security policies doivent être cohérentes avec la logique applicative.
8. **Dépendances** : Vérifier sur npmjs.com avant d'installer tout package suggéré par Claude.

---

## 5. Rôles et permissions

### 5.1 Rôles plateforme (au sein d'un cabinet)

> ⚠️ Ces rôles sont **modulaires et paramétrables**. Par défaut configurés par l'admin Gëstu, mais peuvent être délégués à l'admin du cabinet client.

| Rôle | Créer mission | Affecter équipe | Être chef de mission | Désigner chef de mission |
|------|:---:|:---:|:---:|:---:|
| Associé | ✅ | ✅ | ✅ | ✅ |
| Sénior Manager | ✅ | ✅ | ✅ | ✅ |
| Manager | ✅ | ✅ | ✅ | ❌ |
| Sénior | ❌ | ❌ | ✅ | ❌ |
| Junior | ❌ | ❌ | ❌ | ❌ |
| Consultant Externe | ❌ | ❌ | ❌ | ❌ |

### 5.2 Rôles mission

| Rôle mission | Responsabilités |
|---|---|
| **Associé** | Validateur ultime de la mission |
| **Chef de mission** | Coordonne, affecte auditeurs aux domaines/contrôles, valide le travail des auditeurs, soumet à l'Associé |
| **Auditeur** | Ne voit que ses missions affectées. Travaille uniquement sur ses domaines/contrôles. Soumet au chef de mission (partiellement possible) |

### 5.3 Rôle client (pendant la mission)

- Répond aux questionnaires (début de mission)
- Fournit des documents/preuves
- Suit l'avancement en temps réel
- Interagit et commente avec l'équipe audit
- Valide (ou rejette) les contrôles après validation interne complète

---

## 6. Workflow de mission — 7 phases

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 ⇄ Phase 5 ⇄ Phase 6 → Phase 7
```

| # | Phase | Acteurs principaux | Description |
|---|---|---|---|
| **1** | Initialisation | Chef de mission, Associé | Création mission, périmètre, référentiel, dates, affectation équipe, désignation chef de mission, lettre de mission client |
| **2** | Cadrage & collecte initiale | Client, Auditeurs | Questionnaire de prise de connaissance envoyé au client. Client répond et charge les premiers documents |
| **3** | Planification | Chef de mission | Affectation domaines/contrôles aux auditeurs. Programme de travail, calendrier entretiens, livrables attendus |
| **4** | Travaux sur le terrain | Auditeurs | Collecte preuves, tests, rédaction constats (IA). Soumission partielle possible |
| **5** | Revue & validation interne | Chef de mission → Associé | Validation en cascade. Rejet possible (global ou par contrôle) avec commentaire à chaque niveau |
| **6** | Validation client | Client | Chaque contrôle validé côté cabinet part en revue client. Rejet ou complément possible → retour Phase 4 |
| **7** | Clôture & livraison | Tous | Scoring conformité (IA), rapport PDF + PowerPoint, tableau de bord client, plan d'action (IA), restitution |

### Règles de validation
- Rejet possible à chaque étape (global ou par contrôle spécifique)
- Rejet toujours accompagné d'un commentaire
- Soumission partielle autorisée pour les auditeurs (domaine par domaine)
- Un contrôle rejeté par le client retourne en Phase 4 uniquement pour ce contrôle

---

## 7. Intégration IA — V1

| Fonctionnalité | Phase concernée |
|---|---|
| Assistance à la rédaction des constats | Phase 4 |
| Scoring automatique de conformité | Phase 7 |
| Suggestion de recommandations | Phase 7 |
| Génération du plan d'action post-audit | Phase 7 |

---

## 8. Livrables de mission

- **Rapport** : Modifiable + exportable PDF et PowerPoint
- **Tableau de bord conformité** : Visible par le client (en temps réel pendant la mission et post-mission)

---

## 9. Marque blanche (White Label)

La plateforme peut être proposée en marque blanche aux organisations clientes :
- URL personnalisée : `client.gestugroup.com`
- Interface aux couleurs et charte graphique du client (logo, couleurs primaires, etc.)
- Le client accède à **Gëstu ETP** depuis son URL, puis navigue vers **Gëstu Comply**
- Les données restent strictement cloisonnées par organisation (RLS Supabase)
- Chaque organisation a donc une configuration tenant propre (slug URL, logo, couleurs, nom affiché)

---

## 10. Relation cabinet ↔ client

- Un client peut être suivi par **plusieurs cabinets différents** sur la plateforme
- L'accès client est **limité à la durée de la mission**

---

## 11. Modèle de données (Supabase)

### Tables plateforme
| Table | Rôle |
|-------|------|
| `organizations` | Cabinets, groupes, fonds, clients. `types: string[]` permet à une org d'être cabinet ET client simultanément. `parent_org_id` gère les structures groupe/filiales |
| `tenant_configs` | Configuration marque blanche par organisation (logo, couleurs, domaine custom) |
| `users` | Tous les utilisateurs, rattachés à une organisation |
| `platform_roles` | Rôles paramétrables par organisation. `permissions: jsonb` stocke les droits sans changer le schéma |
| `user_platform_roles` | Association utilisateur ↔ rôle plateforme |

### Tables référentiels (gérés par Gëstu)
| Table | Rôle |
|-------|------|
| `frameworks` | Référentiels (ISO 27001, COBIT, ITIL, NIST, etc.) |
| `domains` | Domaines d'un référentiel |
| `controls` | Contrôles d'un domaine |
| `questionnaire_templates` | Templates de questionnaires liés à un référentiel |
| `questions` | Questions d'un template |

### Tables mission
| Table | Rôle |
|-------|------|
| `missions` | La mission. Lie cabinet, client, référentiel, chef de mission et associé |
| `mission_members` | Équipe de la mission + rôle dans la mission |
| `mission_control_assignments` | Quel auditeur travaille sur quel contrôle |
| `control_assessments` | Travail effectué sur un contrôle (constats, recommandations, brouillon IA) |
| `assessment_validations` | Historique de validation d'un contrôle. `stage` = `auditor_submitted` / `lead_review` / `associate_review` / `client_review` |
| `questionnaire_instances` | Copie de travail du template au lancement de la mission (isolée des futures modifications Gëstu) |
| `questionnaire_responses` | Réponses du client aux questions |
| `documents` | Fichiers uploadés (preuves, documents client), liés à la mission et optionnellement à un contrôle |
| `comments` | Interactions mission globale ou sur un contrôle spécifique (`assessment_id` nullable) |
| `reports` | Rapports générés (PDF / PowerPoint). Plusieurs versions possibles par mission |

### Décisions clés
- `organizations.types` est un tableau `string[]` → une org peut être `["cabinet", "client"]` simultanément
- `platform_roles.permissions` est en `jsonb` → rôles paramétrables sans migration de schéma
- `questionnaire_instances` isole la mission des évolutions futures des référentiels
- `assessment_validations` reconstitue tout l'historique de validation d'un contrôle

---

## 12. Décisions d'architecture

> À compléter au fur et à mesure des sessions

| Date | Décision | Justification |
|------|----------|---------------|
| 2026-04-10 | INSERT/DELETE réservés au `service_role` | Éviter l'auto-élévation de privilèges côté client |
| 2026-04-10 | Index GIN sur `organizations.types` | Requêtes efficaces sur tableau (`types @> '{cabinet}'`) |
| 2026-04-10 | `users.auth_id` FK vers `auth.users(id)` | Lien fort avec Supabase Auth |
| 2026-04-10 | Trigger `set_updated_at()` partagé créé en 00001 | Éviter la duplication entre migrations |
| 2026-04-11 | Fonctions `SECURITY DEFINER` pour les policies RLS (`get_my_organization_id()`, `get_my_user_id()`) | Éviter la récursion infinie quand une policy sur `users` référence `users` |

---

## 13. Modules

### Terminés
_Aucun pour l'instant (refonte complète)_

### En cours
_À compléter_

### Backlog
- Authentification (OneLogin OIDC)
- Gestion des cabinets et utilisateurs
- Gestion des référentiels
- Création et gestion des missions
- Workflow de mission (7 phases)
- Interface client
- Module IA (constats, scoring, recommandations, plan d'action)
- Génération rapports (PDF + PowerPoint)
- Tableau de bord conformité

---

## 14. Checklist avant chaque merge

| # | Question | Risque ciblé |
|---|----------|-------------|
| 1 | Y a-t-il des `any` ou `as SomeType` non justifiés ? | TypeScript drift |
| 2 | Les appels Supabase ont-ils un bloc `error` géré ? | État optimiste |
| 3 | Ai-je testé avec un compte non-admin ? | RLS |
| 4 | Le composant fait-il plus de 150 lignes ? | Couplage |
| 5 | Y a-t-il des apostrophes françaises brutes dans le JSX ? | Encoding |
| 6 | La migration a-t-elle un script `down` ? | Rollback |
| 7 | Ce code est-il cohérent avec ce CONTEXT.md ? | Dérive inter-sessions |
| 8 | Ai-je vérifié les packages ajoutés sur npmjs.com ? | Dépendances |

---

## 15. Prompt de démarrage de session recommandé

```
Voici le contexte de mon projet : [coller ce CONTEXT.md]

Dans cette session, on va travailler sur : [décrire la tâche]

Avant chaque bloc de code généré, vérifie que tu respectes :
- TypeScript strict (pas de any, pas de as Type non justifié)
- Gestion d'erreur Supabase systématique
- Cleanup des hooks async
- Composants < 150 lignes
- Strings françaises correctement échappées
```
