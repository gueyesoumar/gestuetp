-- Migration: audit_hardening (DOWN)
-- Rollback du renforcement post-audit Vagues 1-4.

-- 3. Retirer les CHECK length sur assessment_findings
alter table public.assessment_findings
  drop constraint if exists chk_assessment_findings_recommendation_length;

alter table public.assessment_findings
  drop constraint if exists chk_assessment_findings_risk_length;

alter table public.assessment_findings
  drop constraint if exists chk_assessment_findings_description_length;

-- 2. Retirer le trigger anti-resurrection
drop trigger if exists trg_control_comments_prevent_resurrection on public.control_comments;
drop function if exists public.prevent_control_comment_resurrection();

-- 1. control_comments.author_id : retour a NOT NULL + ON DELETE CASCADE
-- Note : si des lignes ont author_id = NULL (apres suppression d'un user), elles
-- bloqueront le NOT NULL. Le rollback supprime ces lignes orphelines au prealable.
delete from public.control_comments where author_id is null;

alter table public.control_comments
  drop constraint if exists control_comments_author_id_fkey;

alter table public.control_comments
  alter column author_id set not null;

alter table public.control_comments
  add constraint control_comments_author_id_fkey
    foreign key (author_id) references public.users(id) on delete cascade;
