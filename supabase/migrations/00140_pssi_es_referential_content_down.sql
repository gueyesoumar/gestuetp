-- Rollback 00140 : NO-OP volontaire.
-- Le contenu PSSI-ES préexistait côté Comply (créé via l'app avant cette
-- migration) ; un DELETE ici effacerait des données de production légitimes.
-- On ne réverse donc pas un seed de contenu. Pour purger côté Regul uniquement,
-- supprimer manuellement domains/controls du framework 00000000-...-017.
select 1;
