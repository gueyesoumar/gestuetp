-- Migration 00151 (UP) : durcissement verify_probative_chain
-- Constat audit sécurité #2 (moyen) : la fonction SECURITY DEFINER
-- verify_probative_chain() était exécutable par tout rôle `authenticated`
-- (grant hérité de 00138), donc appelable en direct via PostgREST
-- (/rest/v1/rpc/verify_probative_chain) par un compte client (assujetti),
-- qui récupérait ainsi les métadonnées d'intégrité de la chaîne globale
-- (compteur d'actes + état ok/broken) réservées au staff régulateur.
-- Seuls les Edge Functions probative-seal / probative-log l'appellent, en
-- service_role. On restreint donc l'exécution à service_role.
--
-- IMPORTANT : CREATE FUNCTION accorde EXECUTE à PUBLIC par défaut. Révoquer
-- seulement `authenticated` est insuffisant (le rôle hérite du grant PUBLIC).
-- On révoque donc à PUBLIC, anon ET authenticated. Idempotent : ré-exécutable
-- sans risque.

revoke execute on function public.verify_probative_chain() from public;
revoke execute on function public.verify_probative_chain() from anon;
revoke execute on function public.verify_probative_chain() from authenticated;
grant execute on function public.verify_probative_chain() to service_role;
