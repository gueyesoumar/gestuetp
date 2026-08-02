-- Migration 00165 (UP) : smoke test du pipeline CI/CD. Inerte — aucun effet de
-- schéma. Prouve seulement que la CI applique automatiquement les migrations en
-- attente (push staging → snayz auto ; push main → jibbl sur approbation).
select 1;
