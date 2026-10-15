-- 00315 - Gëstu Risk / RFC 0017 Lot 6 : journalisation risk.* dans la piste d'audit.
-- Réutilise le trigger générique public.log_activity_change(target_type) (00180) :
-- chaque create/update/delete est scellé dans activity_log (chaîne de hash par org,
-- append-only) et visible dans /piste-audit (permission can_view_audit_trail).
-- Aucune nouvelle logique ; verbes génériques (created/updated/deleted). Les
-- événements sémantiques fins (re-cotation, acceptation invalidée) = raffinement ultérieur.

create trigger trg_activity_risk_scenarios
  after insert or update or delete on public.risk_scenarios
  for each row execute function public.log_activity_change('risk_scenario');

create trigger trg_activity_risk_treatment_actions
  after insert or update or delete on public.risk_treatment_actions
  for each row execute function public.log_activity_change('risk_treatment');

create trigger trg_activity_risk_acceptances
  after insert or update or delete on public.risk_acceptances
  for each row execute function public.log_activity_change('risk_acceptance');

create trigger trg_activity_risk_reviews
  after insert or update or delete on public.risk_reviews
  for each row execute function public.log_activity_change('risk_review');

create trigger trg_activity_risk_criteria
  after insert or update or delete on public.risk_criteria
  for each row execute function public.log_activity_change('risk_criteria');
