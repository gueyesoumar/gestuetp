-- 00339 (DOWN) : Postgres ne permet pas de retirer une valeur d'enum.
-- Rollback no-op (les valeurs 'supplier' / 'vendor' restent inertes si non utilisees).
select 1;
