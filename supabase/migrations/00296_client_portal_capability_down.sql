-- Les valeurs d'enum PostgreSQL ne se retirent pas sans recréer le type (coûteux,
-- casse les dépendances FK/colonnes). `client_portal` est laissée en place — inoffensive
-- tant qu'aucune org ne la porte. Le down des migrations suivantes (00297) retire les
-- entitlements et le câblage catalogue associés.
select 1;
