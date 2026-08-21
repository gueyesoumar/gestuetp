-- Migration 00207 (UP) : suppression des éditions (RFC 0006, lot 2 — nettoyage)
--
-- Après la bascule C+P3 (00206), plus rien ne lit l'édition : le runtime dérive
-- tout des abonnements (capacités) et de la persona (capacité supervision). On
-- retire donc l'échafaudage devenu mort. Séparé du flip pour ne pas casser les
-- edges pendant la fenêtre de déploiement.
--
-- Seul lecteur SQL vivant de organizations.edition = get_my_edition() (aucun
-- appelant applicatif) → drop en premier, puis la colonne (retire la FK), puis la table.

drop function if exists public.get_my_edition();

alter table public.organizations drop column if exists edition;

drop table if exists public.editions;
