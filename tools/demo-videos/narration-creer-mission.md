# Voix off — « Créer une mission » (Gëstu)

Script de narration synchronisé avec la vidéo `videos/creer-une-mission.mp4`.
Le rythme de la vidéo est calé sur ces segments (durées cibles ci-dessous) : chaque
écran reste affiché le temps de sa narration, le curseur survole l'élément décrit avant
d'agir, et la transition tombe en fin de segment.

- **Ton** : pédagogique, « nous ».
- **Débit conseillé** : ~150 mots/min. Laisser ~0,5 s de silence entre deux segments.
- **Durée totale visée** : ~2 min 20.
- Les timecodes sont des **cibles** ; après un enregistrement, on peut relever les temps
  réels et réajuster (les durées vivent dans l'objet `T` de `record-create-mission.mjs`).

| # | Écran | Début | Durée |
|---|-------|-------|-------|
| S0 | Liste des missions → lancement | 0:00 | 18 s |
| S1 | Étape 1 · Référentiel | 0:18 | 20 s |
| S2 | Étape 2 · Client | 0:38 | 16 s |
| S3 | Étape 3 · Périmètre | 0:54 | 24 s |
| S4 | Étape 4 · Équipe | 1:18 | 22 s |
| S5 | Étape 5 · Calendrier | 1:40 | 21 s |
| S6 | Étape 6 · Récapitulatif & création | 2:01 | 18 s + 4 s (création) |

---

## S0 — Liste des missions → lancement · `0:00–0:18`

> Voyons comment lancer un audit de conformité dans Gëstu. Tout part de l'espace Missions,
> qui regroupe les engagements du cabinet, du cadrage à la clôture. Pour en créer un,
> cliquons sur « Nouvelle mission » : un assistant en six étapes nous guide pas à pas.

## S1 — Étape 1 · Référentiel · `0:18–0:38`

> Première étape : le référentiel. C'est le cœur de la mission : il détermine les contrôles
> à évaluer et la manière de scorer la conformité. Gëstu est multi-référentiels — ISO 27001,
> RGPD, PCI-DSS… Ici, nous retenons la PSSI-ES, la politique de sécurité de l'État du
> Sénégal : 11 chapitres, 30 objectifs et 155 règles.

## S2 — Étape 2 · Client · `0:38–0:54`

> Deuxième étape : le client. On choisit l'entité auditée dans le portefeuille du cabinet.
> Chaque fiche porte déjà son secteur, sa taille et ses exigences réglementaires, ce qui
> évite de ressaisir le contexte. Sélectionnons Téranga Finances.

## S3 — Étape 3 · Périmètre · `0:54–1:18`

> Troisième étape : le périmètre. Gëstu pré-sélectionne d'emblée les 213 contrôles du
> référentiel, regroupés par domaine. On peut déplier un domaine pour voir le détail des
> contrôles, et affiner à volonté : cocher ou décocher un contrôle précis, ou retirer un
> domaine entier — le compteur se met à jour en temps réel. On garde tout pour un audit
> complet, ou on cible le périmètre. Le nom de la mission est déjà proposé, et modifiable.

## S4 — Étape 4 · Équipe · `1:18–1:40`

> Quatrième étape : l'équipe. On désigne l'associé, validateur final de la mission, puis le
> chef de mission qui coordonne les travaux. Pour garantir la séparation des devoirs, Gëstu
> impose deux personnes distinctes et ne propose comme chefs que les membres habilités. Selon
> le volume de contrôles, l'outil recommande même le nombre d'auditeurs et la durée.

## S5 — Étape 5 · Calendrier · `1:40–2:01`

> Cinquième étape : le calendrier. On saisit les dates de début et de fin. À partir du
> périmètre et de la taille de l'équipe, Gëstu estime automatiquement la durée de chaque
> phase — cadrage, travaux, revue et restitution client — et affiche la timeline
> prévisionnelle. Un vrai gain de temps pour planifier.

## S6 — Étape 6 · Récapitulatif & création · `2:01–2:23`

> Dernière étape : le récapitulatif. On vérifie d'un coup d'œil le référentiel, le client,
> le périmètre, l'équipe et la période. Tout est correct : on crée la mission.
>
> *(sur la création & le toast, ~4 s)* Elle apparaît immédiatement dans le tableau de bord,
> en colonne Cadrage, prête à démarrer. En quelques minutes, l'audit est structuré de bout
> en bout.
