-- Les valeurs d'enum PostgreSQL ne se retirent pas sans recréer le type (coûteux,
-- casse les dépendances). `continuous_compliance` est laissée en place - inoffensive
-- tant qu'aucune org ne la porte. Le down de 00299 retire les tables du framework.
select 1;
