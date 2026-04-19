-- Migration: comments (DOWN)

drop trigger if exists trg_comments_updated_at on public.comments;
drop policy if exists "comments_select_team" on public.comments;
drop policy if exists "comments_insert_team" on public.comments;
drop policy if exists "comments_select_client" on public.comments;
drop policy if exists "comments_insert_client" on public.comments;
drop policy if exists "comments_update_author" on public.comments;
drop table if exists public.comments cascade;
