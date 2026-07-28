-- Migration 00151 (DOWN) : rollback du durcissement verify_probative_chain
-- Restaure l'état 00138 : grant EXECUTE à PUBLIC (défaut de CREATE FUNCTION)
-- + le grant explicite à authenticated.

grant execute on function public.verify_probative_chain() to public;
grant execute on function public.verify_probative_chain() to authenticated;
