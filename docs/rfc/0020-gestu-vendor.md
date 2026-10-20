# RFC 0020 - Gëstu Vendor : gestion des tiers / fournisseurs et qualification sécurité

> Statut : **proposition (cadrage, avant tout code)**.
> Fondé sur : [[RFC 0007]] (nature des clients, graphe mené à son terme), [[RFC 0001]] (graphe de relations), [[RFC 0013]] (framework d'édition data-driven), [[RFC 0018]] (convergence des accès / entitlement unique), [[RFC 0019]] (facturation découplée).
> Réutilise : référentiels + contrôles (`frameworks`/`controls`), pipeline d'évaluation (missions, questionnaires, constats, score), portail externe (`client_portal_contacts`), profil d'arête (`engagement_profiles`), profil durable de nœud (`entity_regulatory_profile`).

---

## 1. Problème

La plateforme couvre la conformité (Comply), le risque (Risk), la gouvernance documentaire (Policy) et la supervision régulateur (Regul), mais **pas la gestion des tiers / fournisseurs** (Third-Party Risk Management). Or :

1. **Besoin général** : toute organisation doit recenser ses **fournisseurs / tiers**, apprécier leur posture sécurité, suivre criticité, accès aux données, contrats, certifications et cadence de ré-évaluation.
2. **Cas d'usage prospect (autorité de régulation)** : qualifier la **sécurité des entreprises candidates à travailler avec l'État sur le SI**. Schéma de qualification : la société candidate passe une **évaluation sécurité** (questionnaire + preuves), reçoit un **verdict** (Qualifiée / Qualifiée sous conditions / Non qualifiée) assorti d'une **validité**, et figure dans un **registre des prestataires qualifiés**.

Les deux lectures partagent la même colonne vertébrale : **évaluer une entité externe contre un référentiel sécurité, produire des constats et un verdict**. C'est exactement ce que la plateforme sait déjà faire pour un audit ou une supervision.

## 2. Objectif

Ajouter un module **Gëstu Vendor** qui :
- matérialise le fournisseur comme un **nœud organisation** relié par une **arête typée `supplier`** (cohérent avec `audit_engagement` pour les clients et `regulatory_supervision` pour les assujettis) ;
- porte le **contexte de relation** (services, accès données, criticité de la relation, contrat, verdict de qualification) sur un **profil d'arête** ;
- réutilise le **pipeline d'évaluation** existant pour l'appréciation sécurité, et le **portail externe** pour l'auto-évaluation de la société candidate ;
- se vend comme un **module à la carte** (capacité `vendor`) via la chaîne d'entitlements.

## 3. Concordance (pourquoi ce modèle, et pas un autre)

Vérifié contre l'ensemble des RFC (voir analyse) :
- **La relation inter-organisation est une ARÊTE TYPÉE, jamais un attribut** : RFC 0007 §2 (« la nature émerge des arêtes, jamais stockée »). C'est le mécanisme VIVANT en prod (`create-client` pose `audit_engagement` ; `manage-entity` pose `regulatory_supervision`/`group_ownership` ; `parent_org_id` a été supprimé, mig 00224).
- **Aucune RFC postérieure ne remplace cette primitive** : 0013/0018/0019 agissent sur capacités/accès/facturation, orthogonaux à l'arête (RFC 0007 §3.2).
- **Split nœud / arête** (RFC 0007 §8.1) : l'**identité durable** va sur le nœud (ex. `entity_regulatory_profile` est clé sur `organization_id`) ; le **contexte par relation** va sur l'arête (ex. `engagement_profiles` est clé sur `relationship_id`).

**Décision D-TPRM (actées, A.A.A.A)** :
- **D-TPRM-1 = A** : réutiliser référentiels + pipeline d'évaluation + portail + graphe ; n'ajouter qu'une fine couche Vendor.
- **D-TPRM-2 = A** : fournisseur = nœud organisation + arête `supplier` + profil d'arête (le rôle « fournisseur » est une arête, jamais un `types[]`).
- **D-TPRM-3 = A** : deux niveaux : fiche suivie en interne (sans login) ; compte portail (réutilise `client_portal`) pour l'auto-évaluation + preuves.
- **D-TPRM-4 = A** : nouveau module/capacité `vendor` ; le cas régulateur est une **configuration** (arête `supplier` + registre public des qualifiés), pas un fork.

## 4. Modèle de domaine

### 4.1 Nœud fournisseur
Le fournisseur est une **organisation** (réutilise `organizations` : identité, `registration_number`, secteur, pays). Création **eager** et réconciliation par numéro d'immatriculation, comme `create-client` (via une Edge Function service_role ; aucune policy d'insert directe sur `organizations`). Attributs **intrinsèques et durables** du fournisseur (certifications détenues au niveau de l'entreprise, forme juridique, contact sécurité) sur un profil de nœud léger si nécessaire (sinon colonnes `organizations`).

### 4.2 Arête `supplier`
Nouvelle valeur d'enum : `alter type public.relationship_nature add value 'supplier'` (**migration dédiée** : Postgres interdit d'ajouter puis d'utiliser une valeur d'enum dans la même transaction). Arête `organization_relationships(actor_org_id = org gestionnaire, target_org_id = nœud fournisseur, nature = 'supplier', status = 'active')`. Une arête active par couple (gestionnaire, fournisseur) via l'index `uq_org_rel_active` existant.

### 4.3 Profil d'arête (contexte de relation)
Table 1-1 sur l'arête (pattern `engagement_profiles`), ex. `vendor_relationship_profile(relationship_id unique)` :
- services rendus, niveau d'accès aux données (aucun / limité / étendu / critique) ;
- **criticité de CETTE relation** (`eleve` / `standard`) ; la criticité est relative au gestionnaire, donc elle vit sur l'arête, pas sur le nœud ;
- contrat / SLA (dates), référent interne ;
- **statut de qualification** (`prospect` / `en_evaluation` / `qualifie` / `qualifie_conditions` / `non_qualifie` / `suspendu`), **validité**, **dernière** et **prochaine** évaluation.

### 4.4 Évaluation sécurité (réutilise le pipeline)
L'appréciation sécurité réutilise **référentiel + questionnaire + constats + score** (frameworks/controls, formules RFC 0015, findings-centric). Un **référentiel « Qualification sécurité des prestataires SI de l'État »** (framework + contrôles) est fourni comme contenu. Le **verdict** (qualification) et sa validité sont inscrits sur le profil d'arête à la clôture de l'évaluation.

### 4.5 Portail candidat (cas régulateur, réutilise client_portal)
La société candidate reçoit un **compte portail** (pattern `client_portal_contacts`, cloisonnement portail) pour remplir une **auto-évaluation** et **déposer ses preuves** ; le régulateur revoit les constats et prononce le verdict. Le registre des **prestataires qualifiés** agrège les arêtes au statut `qualifie`, consultable par le régulateur, exportable, avec option de **publication**.

## 5. Capacité / module (chaîne entitlements, pas de seed direct)

- `org_capability` est un enum : `alter type public.org_capability add value 'vendor'` (migration dédiée).
- **Ne jamais seeder `organization_capabilities` directement** (RFC 0013 §9h : `refresh_org_capabilities` est destructif). Le module passe par la chaîne : ligne `products('vendor', ...)` + `product_features` + mapping `product_capability(product_key='vendor' -> capability 'vendor')` + projection d'entitlement. Direction RFC 0018 : clé `module.vendor` dans `org_entitlements`.
- **Facturation découplée** (RFC 0019) : aucun prix sur l'arête ni la capacité ; le module de facturation lira l'entitlement.
- **Couleur produit** (BRAND.md) : à définir, distincte des 7 existantes (proposition : ardoise / bronze). Édition : vendable à la carte comme Risk/Policy.

## 6. Lots (additif, chacun livrable)

1. **Lot 1 - Socle + registre** : enum `supplier` + enum `vendor` + chaîne capacité (produit/feature/mapping/entitlement) + arête `supplier` + `vendor_relationship_profile` + Edge Function de création (eager + réconciliation) + **registre des fournisseurs** (liste, criticité, accès données, statut, prochaine évaluation) + nav/module.
2. **Lot 2 - Évaluation + verdict** : appréciation sécurité (réutilise framework/questionnaire/constats/score) + **verdict de qualification** (validité, ré-évaluation) inscrit sur l'arête.
3. **Lot 3 - Portail candidat** : auto-évaluation + preuves par la société candidate (réutilise client_portal + evidence) ; coeur du cas régulateur.
4. **Lot 4 - Registre des qualifiés** : consultation / export / publication + cadence de ré-évaluation + alertes d'expiration.
5. **Contenu** : référentiel « Qualification sécurité des prestataires SI de l'État » (framework + contrôles).

## 7. Sécurité

- **Cloisonnement par le graphe** : chaque org ne voit que SES arêtes `supplier` (RLS org-scoped sur l'arête et le profil). Le régulateur ne voit que ses candidats.
- **Cross-org** (lecture consolidée, verdict) via **RPC SECURITY DEFINER** gardées (comme la supervision : `can_supervise_org`-like), jamais d'écriture cross-org directe.
- **Portail candidat cloisonné** comme le portail client (helpers staff neutralisés pour `role = portail` ; cf. résolution de la fuite RLS client).
- **Verdicts et élévations** côté serveur (service_role / RPC), jamais côté client. Aucune confiance client.
- **Pas de recursion RLS** (helpers SECURITY DEFINER). Enum, pas de CHECK à contourner.

## 8. Hors scope

Notation automatique du fournisseur par connecteurs externes (relève de [[RFC 0014]] conformité continue, réutilisable plus tard), facturation (RFC 0019), place de marché de prestataires.

## 9. Liens
[[RFC 0007]] (graphe/arêtes), [[RFC 0013]] (capacités data-driven), [[RFC 0018]] (entitlement unique / module.vendor), [[RFC 0019]] (facturation découplée), [[RFC 0015]] (formules questionnaire), [[RFC 0014]] (connecteurs de preuve).
