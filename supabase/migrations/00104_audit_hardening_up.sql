-- Migration: audit_hardening (UP)
-- Description: Renforcements suite a l'audit des Vagues 1-4.
--
-- 1. control_comments.author_id : passe a nullable + ON DELETE SET NULL
--    Raison : preserver l'audit trail. Si un user est supprime, ses commentaires
--    restent visibles avec author_id = NULL plutot que d'etre cascade-supprimes.
--
-- 2. control_comments : trigger anti-resurrection.
--    Raison : la policy UPDATE actuelle laisse l'auteur remettre deleted_at = NULL
--    sur un commentaire soft-supprime. Un trigger BEFORE UPDATE empeche cela
--    (les RLS WITH CHECK ne peuvent pas comparer OLD vs NEW).
--
-- 3. assessment_findings : CHECK length() sur description / risk / recommendation.
--    Raison : eviter le DoS storage par insertion de textes excessifs (CLAUDE.md §3).

-- 1. control_comments.author_id : SET NULL on delete + nullable
alter table public.control_comments
  drop constraint if exists control_comments_author_id_fkey;

alter table public.control_comments
  alter column author_id drop not null;

alter table public.control_comments
  add constraint control_comments_author_id_fkey
    foreign key (author_id) references public.users(id) on delete set null;

comment on column public.control_comments.author_id is
  'Auteur du commentaire. NULL si le user a ete supprime (preserve audit trail).';

-- 2. Trigger anti-resurrection
create or replace function public.prevent_control_comment_resurrection()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.deleted_at is not null and new.deleted_at is null then
    raise exception 'Cannot resurrect a soft-deleted comment'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger trg_control_comments_prevent_resurrection
  before update on public.control_comments
  for each row execute function public.prevent_control_comment_resurrection();

comment on function public.prevent_control_comment_resurrection() is
  'Empeche la remise de deleted_at a NULL apres un soft delete (RLS WITH CHECK ne peut pas comparer OLD/NEW).';

-- 3. CHECK length() sur assessment_findings
alter table public.assessment_findings
  add constraint chk_assessment_findings_description_length
    check (length(description) <= 10000);

alter table public.assessment_findings
  add constraint chk_assessment_findings_risk_length
    check (risk is null or length(risk) <= 5000);

alter table public.assessment_findings
  add constraint chk_assessment_findings_recommendation_length
    check (recommendation is null or length(recommendation) <= 5000);
