-- 00260 — Rollback : retrait de la vidéo de démo sur les articles d'aide.

alter table public.help_articles drop column if exists video_url;
