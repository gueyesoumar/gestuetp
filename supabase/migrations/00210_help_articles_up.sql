-- Migration: base de connaissances editable (UP)
-- Table help_articles (contenu global plateforme, pas de donnee tenant).
-- Lecture : tout utilisateur authentifie voit le publie ; owner voit tout.
-- Ecriture : platform owner uniquement.

create table public.help_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category text not null,
  title text not null,
  excerpt text not null default '',
  body text not null default '',
  keywords text[] not null default '{}',
  audience text not null default 'all' check (audience in ('all', 'staff', 'client')),
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_help_articles_published on public.help_articles(is_published, sort_order);

alter table public.help_articles enable row level security;

create policy "help_articles_select"
  on public.help_articles for select
  using (is_published or public.is_platform_owner());

create policy "help_articles_insert_owner"
  on public.help_articles for insert
  with check (public.is_platform_owner());

create policy "help_articles_update_owner"
  on public.help_articles for update
  using (public.is_platform_owner())
  with check (public.is_platform_owner());

create policy "help_articles_delete_owner"
  on public.help_articles for delete
  using (public.is_platform_owner());

create trigger trg_help_articles_updated_at
  before update on public.help_articles
  for each row execute function public.set_updated_at();

-- Seed : articles cures repris de la version statique (P1).
insert into public.help_articles (slug, category, title, excerpt, body, keywords, sort_order) values
('navigation-hub', 'Démarrer', $t$Comment naviguer entre les modules ?$t$,
 $t$Le Hub ETP est le point d'entrée : il regroupe vos modules.$t$,
 $t$Le Hub ETP est le point d'entrée : il regroupe vos modules. Depuis un espace de travail, utilisez « Retour au Hub ETP » en haut de la barre latérale pour y revenir.$t$,
 array['hub','modules','accueil','naviguer'], 10),

('reset-password', 'Compte & sécurité', $t$Comment réinitialiser mon mot de passe ?$t$,
 $t$Dans Mon compte → Sécurité, ou « Mot de passe oublié ? » sur l'écran de connexion.$t$,
 $t$Rendez-vous dans Mon compte → Sécurité pour définir un nouveau mot de passe. Si vous l'avez oublié, utilisez « Mot de passe oublié ? » sur l'écran de connexion pour recevoir un lien par email.$t$,
 array['mot de passe','oublié','connexion','sécurité'], 20),

('setup-2fa', 'Compte & sécurité', $t$Comment configurer l'authentification à deux facteurs (2FA) ?$t$,
 $t$Dans Mon compte → Sécurité, ajoutez un authentificateur et scannez le QR code.$t$,
 $t$Le 2FA est requis pour tous les comptes. Dans Mon compte → Sécurité, ajoutez un authentificateur : nommez l'appareil, scannez le QR code avec votre application (Google/Microsoft Authenticator…) puis saisissez le code à 6 chiffres.$t$,
 array['2fa','double authentification','totp','authentificateur','qr'], 30),

('lost-authenticator', 'Compte & sécurité', $t$J'ai perdu mon téléphone d'authentification, que faire ?$t$,
 $t$Retirez l'ancien facteur si vous en avez un second, sinon faites une demande au support.$t$,
 $t$Si vous disposez encore d'un second authentificateur, connectez-vous puis retirez l'ancien depuis Mon compte → Sécurité. Sinon, faites une demande au support pour réinitialiser votre 2FA.$t$,
 array['2fa','perdu','téléphone','authentificateur','bloqué'], 40),

('invite-member', 'Membres & rôles', $t$Comment inviter un nouveau membre ?$t$,
 $t$Dans Organisation → Membres, cliquez sur « Inviter un membre ».$t$,
 $t$Dans Organisation → Membres, cliquez sur « Inviter un membre », renseignez l'email et le rôle. Un lien d'invitation est envoyé automatiquement. Nécessite la permission de gestion des membres.$t$,
 array['inviter','membre','équipe','ajouter','utilisateur'], 50),

('manage-roles', 'Membres & rôles', $t$Comment gérer les rôles et les permissions ?$t$,
 $t$Dans Organisation → Rôles & permissions, créez ou modifiez un rôle.$t$,
 $t$Dans Organisation → Rôles & permissions, créez ou modifiez un rôle et cochez les permissions (missions, membres, paramètres…). Assignez ensuite le rôle à un membre depuis l'onglet Membres.$t$,
 array['rôle','permission','droits','accès'], 60),

('create-mission', 'Missions', $t$Comment créer une mission ?$t$,
 $t$Depuis Missions → Nouvelle mission, suivez l'assistant.$t$,
 $t$Depuis Missions → Nouvelle mission, suivez l'assistant : type, client, périmètre, équipe, calendrier, puis confirmation.$t$,
 array['mission','créer','audit','nouvelle'], 70),

('client-portal-access', 'Portail client', $t$Comment donner accès au portail à un client ?$t$,
 $t$Créez le client puis invitez son contact au portail.$t$,
 $t$Créez le client puis invitez son contact : il recevra un accès au portail où il suit ses missions et échange les documents. Un client n'accède qu'à ses propres données.$t$,
 array['client','portail','accès','inviter'], 80),

('audit-trail-access', 'Conformité', $t$Qui peut consulter la piste d'audit ?$t$,
 $t$Les profils disposant de la permission dédiée, dans Organisation → Piste d'audit.$t$,
 $t$La piste d'audit est réservée aux profils disposant de la permission dédiée. Elle est accessible dans Organisation → Piste d'audit et permet l'export des événements.$t$,
 array['piste','audit','traçabilité','journal','logs'], 90),

('activate-module', 'Facturation & plan', $t$Comment activer un module ou changer de plan ?$t$,
 $t$Depuis le Centre d'aide → Faire une demande.$t$,
 $t$Depuis le Centre d'aide → Faire une demande, choisissez « Activer une fonctionnalité » ou « Changer de plan ». La demande est routée vers l'équipe habilitée à la traiter.$t$,
 array['module','plan','activer','abonnement','fonctionnalité'], 100);
