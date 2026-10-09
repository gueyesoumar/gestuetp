-- B1 (RFC 0013 §11, C6) : ajoute la capacité `client_portal`.
-- SEULE dans sa migration : une valeur d'enum PostgreSQL ne peut être UTILISÉE dans la
-- transaction qui l'ajoute (migrate.sh applique chaque fichier en --single-transaction).
-- Les migrations suivantes (00297 : câblage catalogue + backfill) la consomment.
--
-- Rôle : distingue le monde « superviseur d'autrui » (Cabinet / Regul, avec portail
-- tiers) du monde Entreprise (sans portail). Cabinet ✓ · Régulateur ✓ · Entreprise ✗.
alter type public.org_capability add value if not exists 'client_portal';
