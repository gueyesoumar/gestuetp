# Cahier de tests — Gestu Comply

> Version 1.0 — Avril 2026
> Référence : fonctionnalités extraites du code source

---

## 1. Authentification & Accès

| # | Cas de test | Étapes | Résultat attendu | Statut |
|---|------------|--------|-------------------|--------|
| AUTH-01 | Connexion valide | 1. Aller sur `/login` 2. Saisir email + mot de passe valides 3. Cliquer "Accéder à la plateforme" | Redirection vers le Hub ETP (`/hub`) | ☐ |
| AUTH-02 | Connexion invalide | 1. Saisir un email valide + mot de passe incorrect | Message d'erreur affiché, pas de redirection | ☐ |
| AUTH-03 | Champs vides | 1. Cliquer "Accéder" sans remplir les champs | Validation HTML empêche la soumission | ☐ |
| AUTH-04 | Définir le mot de passe (premier login) | 1. Aller sur `/set-password` avec un token valide 2. Saisir un nouveau mot de passe (8+ caractères) 3. Confirmer | Mot de passe défini, redirection vers login | ☐ |
| AUTH-05 | Déconnexion | 1. Cliquer sur le profil en bas de la sidebar 2. Cliquer "Déconnexion" | Session détruite, redirection vers `/login` | ☐ |
| AUTH-06 | Accès sans authentification | 1. Tenter d'accéder à `/missions` sans être connecté | Redirection automatique vers `/login` | ☐ |
| AUTH-07 | Séparation des portails | 1. Se connecter en tant qu'auditeur 2. Tenter d'accéder à `/client` | Accès refusé ou redirection | ☐ |

---

## 2. Hub ETP & Navigation

| # | Cas de test | Étapes | Résultat attendu | Statut |
|---|------------|--------|-------------------|--------|
| NAV-01 | Affichage du Hub | 1. Se connecter 2. Vérifier le Hub ETP | Les produits Gestu (Comply) sont affichés | ☐ |
| NAV-02 | Navigation sidebar | 1. Cliquer sur chaque item de la sidebar (Tableau de bord, Supervision, Clients, Référentiels, Missions) | Chaque page se charge correctement | ☐ |
| NAV-03 | Sidebar — item actif | 1. Naviguer sur `/clients` | L'item "Clients" est surligné avec un liseré or | ☐ |
| NAV-04 | Sidebar — collapse | 1. Cliquer sur le bouton de réduction de la sidebar | Sidebar réduite à 68px, icônes seules visibles | ☐ |
| NAV-05 | Menu profil | 1. Cliquer sur le profil en bas de la sidebar | Menu popup avec : Mon profil, Notifications, Organisation, Membres, Déconnexion | ☐ |

---

## 3. Tableau de bord

| # | Cas de test | Étapes | Résultat attendu | Statut |
|---|------------|--------|-------------------|--------|
| DASH-01 | Affichage KPIs | 1. Aller sur `/` | Les KPIs s'affichent : missions actives, clients, revues en attente | ☐ |
| DASH-02 | Vue Cabinet | 1. Être dans une organisation de type "cabinet" | Le dashboard Cabinet est affiché | ☐ |
| DASH-03 | Vue Groupe | 1. Être dans une organisation de type "groupe" | Le dashboard Groupe est affiché avec le switch | ☐ |
| DASH-04 | Liste des missions récentes | 1. Vérifier la section missions | Les missions en cours sont listées avec leur statut | ☐ |

---

## 4. Gestion des membres

| # | Cas de test | Étapes | Résultat attendu | Statut |
|---|------------|--------|-------------------|--------|
| MBR-01 | Liste des membres | 1. Aller sur `/membres` | Tableau des membres affiché avec nom, email, rôle(s), statut | ☐ |
| MBR-02 | Recherche par nom | 1. Saisir un nom dans la barre de recherche | Filtrage en temps réel des membres | ☐ |
| MBR-03 | Filtre par statut | 1. Sélectionner "Actifs" dans le filtre statut | Seuls les membres actifs sont affichés | ☐ |
| MBR-04 | Filtre par rôle | 1. Sélectionner un rôle dans le filtre | Seuls les membres ayant ce rôle sont affichés | ☐ |
| MBR-05 | Inviter un membre | 1. Cliquer "Inviter un membre" 2. Remplir email, prénom, nom, rôle 3. Soumettre | Membre créé, apparaît dans la liste | ☐ |
| MBR-06 | Invitation — email invalide | 1. Saisir un email invalide dans le formulaire d'invitation | Message d'erreur, formulaire non soumis | ☐ |
| MBR-07 | Invitation — email déjà utilisé | 1. Inviter un email déjà enregistré | Message d'erreur "Cet email est déjà utilisé" | ☐ |
| MBR-08 | Attribuer un rôle | 1. Menu contextuel (⋮) → "Gérer les rôles" 2. Sélectionner un ou plusieurs rôles 3. Enregistrer | Rôle(s) attribué(s), badge mis à jour | ☐ |
| MBR-09 | Multi-rôles | 1. Attribuer 2 rôles à un membre | Les 2 badges de rôle sont affichés | ☐ |
| MBR-10 | Désactiver un membre | 1. Menu (⋮) → "Désactiver" 2. Confirmer | Statut passe à "Inactif" (badge gris) | ☐ |
| MBR-11 | Réactiver un membre | 1. Sur un membre inactif, menu (⋮) → "Réactiver" 2. Confirmer | Statut repasse à "Actif" (badge vert) | ☐ |
| MBR-12 | Modifier le mot de passe | 1. Menu (⋮) → "Modifier le mot de passe" 2. Saisir un nouveau mot de passe (8+ car.) 3. Confirmer 4. Soumettre | Message de succès affiché | ☐ |
| MBR-13 | Mot de passe trop court | 1. Saisir un mot de passe de 5 caractères | Message d'erreur "au moins 8 caractères" | ☐ |
| MBR-14 | Mots de passe non identiques | 1. Saisir des mots de passe différents dans les 2 champs | Message "Les mots de passe ne correspondent pas" | ☐ |
| MBR-15 | Renvoyer l'invitation | 1. Menu (⋮) → "Renvoyer l'invitation" 2. Confirmer | Invitation renvoyée (pas d'erreur) | ☐ |
| MBR-16 | Voir le profil | 1. Cliquer sur le nom d'un membre ou menu (⋮) → "Voir le profil" | Drawer latéral avec 3 onglets : Profil, Missions, Historique | ☐ |
| MBR-17 | Profil — onglet Missions | 1. Ouvrir le profil d'un membre 2. Aller sur l'onglet "Missions" | Liste des missions assignées avec statut et rôle | ☐ |
| MBR-18 | Visualiser les permissions | 1. Cliquer sur un badge de rôle dans le tableau | Les permissions s'affichent en dessous (badges compacts) | ☐ |
| MBR-19 | Gestion des rôles (CRUD) | 1. Cliquer "Rôles" (icône engrenage) 2. Créer un nouveau rôle avec nom + permissions 3. Enregistrer | Rôle créé, apparaît dans la liste | ☐ |
| MBR-20 | Modifier un rôle | 1. Dans la gestion des rôles, cliquer le crayon sur un rôle 2. Modifier le nom ou les permissions 3. Enregistrer | Rôle mis à jour | ☐ |
| MBR-21 | Supprimer un rôle | 1. Dans la gestion des rôles, cliquer la corbeille 2. Confirmer | Rôle supprimé (sauf s'il est encore attribué) | ☐ |

---

## 5. Gestion des clients

| # | Cas de test | Étapes | Résultat attendu | Statut |
|---|------------|--------|-------------------|--------|
| CLT-01 | Liste des clients | 1. Aller sur `/clients` | Tableau ou cartes des clients du cabinet | ☐ |
| CLT-02 | Créer un client | 1. Cliquer "Nouveau client" 2. Remplir le formulaire (nom, secteur, effectifs, pays…) 3. Soumettre | Client créé, redirection vers sa fiche | ☐ |
| CLT-03 | Fiche client — informations | 1. Cliquer sur un client | Fiche détaillée avec identité, coordonnées, secteur | ☐ |
| CLT-04 | Modifier les informations | 1. Modifier les champs de la fiche client 2. Enregistrer | Données mises à jour | ☐ |
| CLT-05 | Exigences réglementaires | 1. Aller sur la section "Exigences réglementaires" d'un client | Liste du catalogue réglementaire groupée par juridiction | ☐ |
| CLT-06 | Sélectionner des exigences | 1. Cocher des exigences (CDP-SN, PSSI-ES, BCEAO-SSI…) | Exigences liées au client, compteur mis à jour | ☐ |
| CLT-07 | Parties intéressées | 1. Ajouter une partie intéressée (nom, rôle, attentes) | Partie ajoutée à la liste | ☐ |
| CLT-08 | Branding client | 1. Uploader un logo 2. Définir les couleurs primaire/secondaire | Logo affiché, couleurs appliquées au portail client | ☐ |

---

## 6. Référentiels

| # | Cas de test | Étapes | Résultat attendu | Statut |
|---|------------|--------|-------------------|--------|
| REF-01 | Liste des référentiels | 1. Aller sur `/referentiels` | Cartes des référentiels : PSSI-ES, ISO 27001, NIST CSF, Audit SI, etc. | ☐ |
| REF-02 | Détail PSSI-ES | 1. Cliquer sur "PSSI-ES — Sénégal" | Page avec 11 domaines listés, compteur 155 contrôles | ☐ |
| REF-03 | Domaines et contrôles | 1. Cliquer sur un domaine (ex: ORG) | Liste des contrôles du domaine avec code, nom, description | ☐ |
| REF-04 | Guidance / Mapping ISO | 1. Ouvrir un contrôle (ex: REG 1-1) | Le champ guidance affiche le mapping ISO 27001 | ☐ |
| REF-05 | Comparaison de référentiels | 1. Aller sur `/referentiels/comparer` 2. Sélectionner 2 référentiels | Tableau comparatif côte à côte | ☐ |
| REF-06 | Badge PSSI-ES en création de mission | 1. Aller sur `/missions/nouvelle` | La carte PSSI-ES apparaît avec le badge "SN" vert émeraude | ☐ |
| REF-07 | Badge NIST distinct d'ISO | 1. Vérifier les cartes en création de mission | NIST a le badge "NIST" bleu, ISO a le badge "ISO" vert forêt | ☐ |

---

## 7. Création de mission (Wizard)

| # | Cas de test | Étapes | Résultat attendu | Statut |
|---|------------|--------|-------------------|--------|
| MIS-01 | Étape 1 — Type de mission | 1. Aller sur `/missions/nouvelle` 2. Sélectionner "PSSI-ES" | Carte sélectionnée avec coche verte | ☐ |
| MIS-02 | Étape 2 — Client | 1. Cliquer "Suivant" 2. Sélectionner un client existant | Client affiché avec son nom et secteur | ☐ |
| MIS-03 | Étape 3 — Équipe | 1. Sélectionner un auditeur principal 2. Sélectionner un associé 3. Ajouter des auditeurs | Équipe constituée, compteur affiché | ☐ |
| MIS-04 | Étape 4 — Calendrier | 1. Définir la date de début et de fin | Dates affichées dans le récapitulatif | ☐ |
| MIS-05 | Étape 5 — Confirmation | 1. Vérifier le récapitulatif 2. Cliquer "Créer la mission" | Mission créée, redirection vers sa page détail | ☐ |
| MIS-06 | Navigation wizard | 1. Cliquer "Précédent" à l'étape 3 | Retour à l'étape 2 avec les données conservées | ☐ |
| MIS-07 | Validation des champs requis | 1. Tenter de passer à l'étape suivante sans sélection | Le bouton "Suivant" est désactivé | ☐ |

---

## 8. Détail d'une mission — Vue d'ensemble

| # | Cas de test | Étapes | Résultat attendu | Statut |
|---|------------|--------|-------------------|--------|
| DET-01 | Affichage de la mission | 1. Aller sur `/missions/:id` | Header avec nom, statut, client, framework, dates, équipe | ☐ |
| DET-02 | KPIs de progression | 1. Vérifier la vue d'ensemble | Score provisoire, contrôles évalués/total, jours restants | ☐ |
| DET-03 | Phases de la mission | 1. Vérifier la barre de progression | Phases affichées : Initialisation → Cadrage → Planification → Terrain → Revue → Clôture | ☐ |
| DET-04 | Navigation entre onglets | 1. Cliquer sur chaque onglet (Cadrage, Planification, Terrain, Revue, Revue client, Clôture) | Chaque onglet se charge sans erreur | ☐ |

---

## 9. Cadrage (Scoping)

| # | Cas de test | Étapes | Résultat attendu | Statut |
|---|------------|--------|-------------------|--------|
| SCP-01 | Affichage du cadrage | 1. Aller sur l'onglet "Cadrage" | Objectifs d'audit, critères, périmètre affichés | ☐ |
| SCP-02 | Modification des notes de cadrage | 1. Modifier les notes de cadrage 2. Sauvegarder | Données sauvegardées sans erreur | ☐ |
| SCP-03 | Exigences réglementaires liées | 1. Vérifier la section exigences | Les exigences du client sont affichées | ☐ |

---

## 10. Planification

| # | Cas de test | Étapes | Résultat attendu | Statut |
|---|------------|--------|-------------------|--------|
| PLN-01 | Programme de travail | 1. Aller sur l'onglet "Planification" | Tableau des contrôles avec colonnes : code, nom, risque, auditeur | ☐ |
| PLN-02 | Affecter un contrôle | 1. Sélectionner un auditeur dans le dropdown d'un contrôle | Contrôle affecté, select pré-rempli | ☐ |
| PLN-03 | Réaffecter un contrôle | 1. Changer l'auditeur d'un contrôle déjà affecté | Nouvel auditeur affiché | ☐ |
| PLN-04 | Affectation par domaine | 1. Sélectionner un auditeur pour un domaine entier 2. Cliquer "Affecter le domaine" | Tous les contrôles du domaine sont affectés | ☐ |
| PLN-05 | Réaffectation par domaine | 1. Sur un domaine entièrement affecté, sélectionner un autre auditeur 2. Cliquer "Réaffecter" | Tous les contrôles réaffectés | ☐ |
| PLN-06 | Modifier le niveau de risque | 1. Cliquer sur la pastille de risque d'un contrôle | Le risque change cycliquement : Critique → Élevé → Moyen → Faible | ☐ |
| PLN-07 | Entretiens planifiés | 1. Section "Entretiens" 2. Ajouter un entretien (date, lieu, participants) | Entretien créé et affiché | ☐ |
| PLN-08 | Gantt | 1. Vérifier la section Gantt | Barres temporelles affichées par domaine/auditeur | ☐ |

---

## 11. Travaux de terrain (Fieldwork)

| # | Cas de test | Étapes | Résultat attendu | Statut |
|---|------------|--------|-------------------|--------|
| FLD-01 | Liste des contrôles assignés | 1. Aller sur l'onglet "Terrain" | Contrôles assignés à l'auditeur connecté | ☐ |
| FLD-02 | Documenter un contrôle | 1. Sélectionner un contrôle 2. Rédiger les constats (findings) 3. Classifier (NC majeure, mineure, observation, point fort) | Évaluation sauvegardée en brouillon | ☐ |
| FLD-03 | Ajouter des preuves | 1. Uploader un document en tant que preuve | Document lié au contrôle | ☐ |
| FLD-04 | Soumettre une évaluation | 1. Cliquer "Soumettre" sur un contrôle documenté | Statut passe à "Soumis", l'évaluation est verrouillée | ☐ |
| FLD-05 | Compteur de progression | 1. Documenter et soumettre plusieurs contrôles | Le compteur "X/155 contrôles" se met à jour | ☐ |

---

## 12. Revue & Validation

| # | Cas de test | Étapes | Résultat attendu | Statut |
|---|------------|--------|-------------------|--------|
| REV-01 | Kanban de validation | 1. Aller sur l'onglet "Revue" | Colonnes Kanban : Soumis → Revue Lead → Revue Associé → Revue Client → Validé | ☐ |
| REV-02 | Approuver une évaluation (Lead) | 1. Ouvrir une carte "Soumis" 2. Lire les constats 3. Cliquer "Approuver" | Carte déplacée vers "Revue Associé" | ☐ |
| REV-03 | Rejeter une évaluation | 1. Ouvrir une carte 2. Ajouter un commentaire 3. Cliquer "Rejeter" | Carte retournée à l'auditeur avec le commentaire | ☐ |
| REV-04 | Approbation par l'associé | 1. Se connecter en tant qu'associé 2. Approuver une évaluation déjà validée par le lead | Carte déplacée vers "Revue Client" ou "Validé" | ☐ |
| REV-05 | Envoyer en revue client | 1. Cliquer "Envoyer au client" sur les évaluations approuvées | Évaluations envoyées au portail client | ☐ |

---

## 13. Portail client

| # | Cas de test | Étapes | Résultat attendu | Statut |
|---|------------|--------|-------------------|--------|
| CP-01 | Connexion client | 1. Se connecter avec un compte client | Redirection vers `/client` (dashboard client) | ☐ |
| CP-02 | Dashboard client | 1. Vérifier le tableau de bord | Résumé des missions en cours, actions en attente | ☐ |
| CP-03 | Liste des missions | 1. Aller sur `/client/missions` | Missions assignées à l'entité du client | ☐ |
| CP-04 | Détail mission client | 1. Cliquer sur une mission | Détail avec les constats, questionnaires, documents | ☐ |
| CP-05 | Répondre au questionnaire | 1. Ouvrir un questionnaire 2. Répondre aux questions 3. Soumettre | Réponses sauvegardées, progression mise à jour | ☐ |
| CP-06 | Uploader des documents | 1. Aller sur `/client/documents` 2. Uploader un fichier | Document visible dans la liste | ☐ |
| CP-07 | Valider des constats | 1. Aller sur `/client/validations` 2. Approuver ou contester un constat | Réponse enregistrée, notif envoyée à l'auditeur | ☐ |
| CP-08 | Notifications | 1. Aller sur `/client/notifications` | Notifications listées (nouvelles missions, demandes de preuves, constats à valider) | ☐ |

---

## 14. Clôture de mission

| # | Cas de test | Étapes | Résultat attendu | Statut |
|---|------------|--------|-------------------|--------|
| CLO-01 | Score final | 1. Aller sur l'onglet "Clôture" | Score de conformité affiché (% contrôles approuvés / total) | ☐ |
| CLO-02 | Répartition par domaine | 1. Vérifier la liste des domaines | Score par domaine avec barres de progression colorées | ☐ |
| CLO-03 | Clôturer la mission | 1. Cliquer "Clôturer la mission" | Statut passe à "Clôturé", mission verrouillée | ☐ |
| CLO-04 | Seuils de couleur | 1. Vérifier les couleurs des scores | ≥80% vert, 50-79% ambre, <50% rouge | ☐ |

---

## 15. Supervision

| # | Cas de test | Étapes | Résultat attendu | Statut |
|---|------------|--------|-------------------|--------|
| SUP-01 | Page de supervision | 1. Aller sur `/supervision` | Page avec sélecteur de référentiel, KPIs, onglets | ☐ |
| SUP-02 | Sélecteur de référentiel | 1. Changer le référentiel (PSSI-ES → ISO 27001) | Données, domaines et classement se mettent à jour | ☐ |
| SUP-03 | Filtre par périmètre | 1. Sélectionner un secteur dans le filtre périmètre | Seules les entités du secteur sont affichées | ☐ |
| SUP-04 | KPIs | 1. Vérifier les 4 cartes KPI | Entités auditées, conformité moyenne, NC majeures, couverture | ☐ |
| SUP-05 | Onglet Classement | 1. Cliquer "Classement" | Tableau des entités triées par score décroissant | ☐ |
| SUP-06 | Onglet Heatmap | 1. Cliquer "Heatmap" | Matrice domaines × entités avec cellules colorées | ☐ |
| SUP-07 | Domaines les plus faibles | 1. Vérifier sous la heatmap | Les 3 domaines les plus faibles sont identifiés | ☐ |
| SUP-08 | Onglet Risques systémiques | 1. Cliquer "Risques systémiques" | Cartes de risques pour les domaines < 60% | ☐ |
| SUP-09 | Onglet Évolution | 1. Cliquer "Évolution" | Barre de la période actuelle + scores par entité | ☐ |
| SUP-10 | Onglet Rapport | 1. Cliquer "Rapport" | Paramètres (destinataire, émetteur, format) + aperçu du rapport | ☐ |
| SUP-11 | Seuils de statut | 1. Vérifier les badges de statut | ≥80% "Conforme" vert, 60-79% "Partiel" or, <60% "Non conforme" rouge | ☐ |

---

## 16. Profil utilisateur

| # | Cas de test | Étapes | Résultat attendu | Statut |
|---|------------|--------|-------------------|--------|
| PRF-01 | Affichage du profil | 1. Aller sur `/profil` | Avatar (initiales), nom, email, poste, statut | ☐ |
| PRF-02 | Modifier les informations | 1. Modifier prénom, nom, téléphone, poste 2. Cliquer "Mettre à jour" | Message "Profil mis à jour" | ☐ |
| PRF-03 | Changer son mot de passe | 1. Saisir le nouveau mot de passe 2. Confirmer 3. Cliquer "Changer" | Message "Mot de passe modifié" | ☐ |
| PRF-04 | Email non modifiable | 1. Vérifier le champ email | Le champ est désactivé avec le message "Contactez un administrateur" | ☐ |
| PRF-05 | Informations de session | 1. Vérifier la section Session | Email, dernière connexion, statut "Connecté" | ☐ |

---

## 17. Notifications

| # | Cas de test | Étapes | Résultat attendu | Statut |
|---|------------|--------|-------------------|--------|
| NTF-01 | Liste des notifications | 1. Aller sur `/notifications` | Liste des notifications avec type, message, date | ☐ |
| NTF-02 | Compteur non-lues | 1. Vérifier le badge sur l'icône profil | Nombre de notifications non lues affiché | ☐ |
| NTF-03 | Marquer comme lue | 1. Cliquer sur une notification | La notification est marquée comme lue | ☐ |
| NTF-04 | Navigation depuis notification | 1. Cliquer sur une notification de type "soumission" | Redirection vers la mission/évaluation concernée | ☐ |

---

## 18. Organisation

| # | Cas de test | Étapes | Résultat attendu | Statut |
|---|------------|--------|-------------------|--------|
| ORG-01 | Affichage de l'organisation | 1. Aller sur `/organisation` | Nom, description, type d'organisation | ☐ |
| ORG-02 | Modifier l'organisation | 1. Modifier le nom ou la description 2. Enregistrer | Données mises à jour | ☐ |

---

## 19. Fonctions IA (Smart)

| # | Cas de test | Étapes | Résultat attendu | Statut |
|---|------------|--------|-------------------|--------|
| AI-01 | Questionnaire intelligent | 1. Lancer la génération de questionnaire (smart-questionnaire) | Questionnaire généré adapté au référentiel et au client | ☐ |
| AI-02 | Plan de travail intelligent | 1. Lancer la planification intelligente (smart-plan) | Programme de travail pré-rempli avec suggestions | ☐ |
| AI-03 | Analyse intelligente | 1. Lancer l'analyse (smart-analyse) | Résumé et recommandations générés | ☐ |
| AI-04 | Risques intelligents | 1. Lancer l'identification de risques (smart-risks) | Risques identifiés et classifiés | ☐ |

---

## 20. Sécurité & RLS

| # | Cas de test | Étapes | Résultat attendu | Statut |
|---|------------|--------|-------------------|--------|
| SEC-01 | Isolation des données | 1. Se connecter avec l'org A 2. Vérifier que les données de l'org B ne sont pas visibles | Aucune donnée d'une autre organisation accessible | ☐ |
| SEC-02 | Rôle client limité | 1. Se connecter en tant que client 2. Tenter d'accéder aux routes auditeur | Accès refusé | ☐ |
| SEC-03 | Opérations sensibles serveur | 1. Vérifier que la création de mission, l'invitation de membres, la revue passent par des Edge Functions | Pas d'accès direct en écriture depuis le client | ☐ |
| SEC-04 | Mot de passe — règles minimum | 1. Tenter de définir un mot de passe de 4 caractères | Rejeté avec message d'erreur | ☐ |

---

## Résumé

| Module | Nombre de tests | Priorité |
|--------|----------------|----------|
| Authentification | 7 | Critique |
| Navigation | 5 | Haute |
| Tableau de bord | 4 | Moyenne |
| Membres | 21 | Haute |
| Clients | 8 | Haute |
| Référentiels | 7 | Moyenne |
| Création de mission | 7 | Critique |
| Détail mission | 4 | Haute |
| Cadrage | 3 | Moyenne |
| Planification | 8 | Haute |
| Terrain | 5 | Critique |
| Revue & Validation | 5 | Critique |
| Portail client | 8 | Haute |
| Clôture | 4 | Haute |
| Supervision | 11 | Haute |
| Profil | 5 | Moyenne |
| Notifications | 4 | Moyenne |
| Organisation | 2 | Basse |
| IA (Smart) | 4 | Moyenne |
| Sécurité & RLS | 4 | Critique |
| **TOTAL** | **126** | |
