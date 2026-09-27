-- 00260 — Vidéo de démo sur les articles d'aide.
-- Ajoute une URL de vidéo optionnelle aux articles (help_articles), hébergée dans le
-- bucket public help-media. Affichée en tête de l'article et exploitable pour un CTA
-- « Voir la vidéo ». RLS inchangée (la colonne suit les policies existantes).

alter table public.help_articles add column if not exists video_url text;
