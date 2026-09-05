-- Migration: enrichissement des articles d'aide (UP)
-- Corps complets et structures (titres + etapes). Les images sont ajoutees
-- ensuite via l'editeur admin (bucket help-media).

update public.help_articles set body = $b$Le **Hub ETP** est votre point de départ : il réunit tous vos modules (Comply, Risk, Policy…) et affiche l'état de chacun.

## Accéder au Hub
1. Cliquez sur **Retour au Hub ETP** en haut de la barre latérale, à gauche.
2. Choisissez un module pour ouvrir son espace de travail.

## Bon à savoir
- Chaque module conserve sa propre barre latérale une fois ouvert.
- Le bouton **Retour au Hub ETP** reste toujours visible pour revenir en un clic.$b$ where slug = 'navigation-hub';

update public.help_articles set body = $b$Vous pouvez changer votre mot de passe à tout moment, ou en demander la réinitialisation si vous l'avez oublié.

## Depuis votre compte
1. Ouvrez **Mon compte → Sécurité**.
2. Saisissez un nouveau mot de passe (8 caractères minimum) et confirmez-le.
3. Validez : le changement est immédiat.

## Mot de passe oublié
1. Sur l'écran de connexion, cliquez sur **Mot de passe oublié ?**.
2. Saisissez votre email professionnel.
3. Suivez le lien reçu par email pour définir un nouveau mot de passe.

## Bon à savoir
- Pour votre sécurité, le lien de réinitialisation expire après un court délai.
- Le 2FA reste requis après la réinitialisation.$b$ where slug = 'reset-password';

update public.help_articles set body = $b$L'authentification à deux facteurs (2FA) protège votre compte : après le mot de passe, un code temporaire est demandé. Elle est **obligatoire** sur Gëstu ETP.

## Ajouter un authentificateur
1. Ouvrez **Mon compte → Sécurité**.
2. Cliquez sur **Ajouter un authentificateur** et donnez-lui un nom (ex : « iPhone perso »).
3. Scannez le QR code affiché avec votre application (Google Authenticator, Microsoft Authenticator, Authy…).
4. Saisissez le code à 6 chiffres généré pour confirmer.

## Bon à savoir
- Ajoutez **un second authentificateur** (autre appareil) pour ne jamais être bloqué.
- À la connexion, saisissez simplement le code à 6 chiffres de votre application.$b$ where slug = 'setup-2fa';

update public.help_articles set body = $b$Pas de panique : la marche à suivre dépend de si vous avez un second authentificateur.

## J'ai un second authentificateur
1. Connectez-vous avec le code de l'appareil qui vous reste.
2. Ouvrez **Mon compte → Sécurité**.
3. **Retirez** l'authentificateur perdu (confirmation par un code de l'appareil conservé).

## Je n'ai plus aucun accès
1. Depuis le **Centre d'aide → Faire une demande**, demandez la réinitialisation de votre 2FA.
2. Le support la réinitialise ; vous reconfigurez un authentificateur à la prochaine connexion.

## Bon à savoir
- Le dernier authentificateur ne peut pas être retiré : ajoutez-en un nouveau d'abord.$b$ where slug = 'lost-authenticator';

update public.help_articles set body = $b$Ajoutez vos collègues à l'organisation et attribuez-leur un rôle.

## Inviter un membre
1. Ouvrez **Organisation → Membres**.
2. Cliquez sur **Inviter un membre**.
3. Renseignez l'email et le **rôle**, puis envoyez.
4. La personne reçoit un lien d'invitation par email.

## Bon à savoir
- Nécessite la permission **Gérer les membres**.
- Le rôle détermine les permissions — voir « Gérer les rôles et les permissions ».$b$ where slug = 'invite-member';

update public.help_articles set body = $b$Les rôles regroupent des permissions que vous attribuez ensuite aux membres.

## Créer ou modifier un rôle
1. Ouvrez **Organisation → Rôles & permissions**.
2. Cliquez sur **Créer un rôle** (ou l'icône crayon pour en modifier un).
3. Cochez les permissions voulues (créer des missions, gérer les membres, modifier les paramètres…).
4. Enregistrez.

## Attribuer un rôle
1. Dans **Organisation → Membres**, ouvrez un membre.
2. Assignez-lui le rôle correspondant.

## Bon à savoir
- Nécessite la permission **Gérer les rôles**.
- Un rôle **par défaut** peut être défini pour les nouveaux membres.$b$ where slug = 'manage-roles';

update public.help_articles set body = $b$Créez une mission d'audit ou de contrôle en quelques étapes guidées.

## Étapes
1. Ouvrez **Missions → Nouvelle mission**.
2. Choisissez le **type** de mission.
3. Sélectionnez le **client** concerné.
4. Définissez le **périmètre** (référentiel, contrôles).
5. Constituez l'**équipe**.
6. Fixez le **calendrier**, puis **confirmez**.

## Bon à savoir
- Vous pouvez ajuster l'équipe et le calendrier après création.
- Le type de mission détermine le workflow appliqué.$b$ where slug = 'create-mission';

update public.help_articles set body = $b$Le portail client permet à vos clients de suivre leurs missions et d'échanger des documents en toute sécurité.

## Donner accès
1. Créez le **client** (ou ouvrez une fiche existante).
2. Invitez un **contact** : il recevra un accès au portail.
3. Le contact définit son mot de passe et se connecte.

## Bon à savoir
- Un client n'accède **qu'à ses propres données** (cloisonnement strict).
- Vous gérez les accès contact par contact.$b$ where slug = 'client-portal-access';

update public.help_articles set body = $b$La piste d'audit journalise les actions sensibles de votre organisation, de façon inviolable.

## Consulter la piste d'audit
1. Ouvrez **Organisation → Piste d'audit**.
2. Filtrez par date, acteur ou type d'événement.
3. Exportez au besoin en **CSV**.

## Bon à savoir
- Réservée aux profils disposant de la permission **Voir la piste d'audit**.
- Les entrées sont **append-only** (non modifiables) et chaînées par hash.$b$ where slug = 'audit-trail-access';

update public.help_articles set body = $b$Besoin d'un module supplémentaire (Risk, Policy…) ou d'un changement de plan ? Faites-en la demande depuis l'application.

## Faire une demande
1. Ouvrez le **Centre d'aide → Faire une demande**.
2. Choisissez **Activer une fonctionnalité** ou **Changer de plan**.
3. Décrivez votre besoin et envoyez.

## Bon à savoir
- La demande est routée automatiquement vers l'équipe habilitée.
- Vous suivez son avancement dans **Suivre mes demandes**.$b$ where slug = 'activate-module';
