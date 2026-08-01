-- Migration 00093: Restaure les accents français sur le seed NIST CSF 2.0 — DOWN
--
-- Note : la version sans accents n'a pas vocation à être restaurée (c'était
-- un bug de seed). Le down est une no-op volontaire pour ne pas réintroduire
-- la mauvaise data. Si besoin de revenir en arrière, repasser le seed
-- 005_nist_framework.sql à la main.

SELECT 1;
