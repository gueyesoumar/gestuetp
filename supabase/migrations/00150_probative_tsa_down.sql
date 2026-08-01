-- 00150 (DOWN)
alter table public.probative_seals
  drop column if exists tst,
  drop column if exists tsa_url,
  drop column if exists tst_status;
