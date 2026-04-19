-- Migration: cabinet_clients (DOWN)

drop trigger if exists trg_cabinet_clients_updated_at on public.cabinet_clients;
drop policy if exists "cabinet_clients_select_cabinet" on public.cabinet_clients;
drop policy if exists "cabinet_clients_update_cabinet" on public.cabinet_clients;
drop policy if exists "cabinet_clients_insert_cabinet" on public.cabinet_clients;
drop policy if exists "cabinet_clients_delete_cabinet" on public.cabinet_clients;
drop table if exists public.cabinet_clients cascade;
