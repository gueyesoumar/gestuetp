-- Migration: base de connaissances editable (DOWN)

drop trigger if exists trg_help_articles_updated_at on public.help_articles;
drop table if exists public.help_articles;
