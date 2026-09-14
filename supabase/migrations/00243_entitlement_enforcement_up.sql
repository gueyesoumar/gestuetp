-- Migration 00243 (UP) : enforcement dur (RFC 0008 P3 / INC 4)
--
-- Mécanisme d'enforcement côté serveur, DÉPLOYÉ EN SOFT (aucun changement de
-- comportement) : la politique globale décide quelles clés sont « dures », et
-- entitlement_allows() tranche. Les edges appellent le helper require-entitlement.
-- L'ACTIVATION (passer une clé en 'hard') est un acte délibéré séparé, fait après
-- le pré-vol gate_coverage_audit().

-- 1. Politique globale soft/hard par clé -----------------------------------------
create table if not exists public.entitlement_gate_policy (
  key         text primary key,
  enforcement text not null default 'soft' check (enforcement in ('soft', 'hard')),
  updated_at  timestamptz not null default now()
);
comment on table public.entitlement_gate_policy is
  'RFC 0008 P3 : politique GLOBALE d''enforcement par clé d''entitlement. hard = vérifié côté serveur ; soft = UX seulement. Toggle sans déploiement.';

insert into public.entitlement_gate_policy (key, enforcement) values
  ('measures', 'soft'),
  ('incidents', 'soft'),
  ('risk', 'soft'),
  ('ai_credits', 'soft'),
  ('seats', 'soft'),
  ('missions', 'soft')
on conflict (key) do nothing;

-- Lecture authenticated (config non sensible, sert aux indices UI) ; écritures service_role.
alter table public.entitlement_gate_policy enable row level security;
drop policy if exists entitlement_gate_policy_read on public.entitlement_gate_policy;
create policy entitlement_gate_policy_read on public.entitlement_gate_policy
  for select to authenticated using (true);

-- 2. Décision d'accès (service_role only) ----------------------------------------
create or replace function public.entitlement_allows(p_org uuid, p_key text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_enf text;
begin
  select enforcement into v_enf from public.entitlement_gate_policy where key = p_key;
  -- soft (ou clé inconnue) : aucun enforcement.
  if coalesce(v_enf, 'soft') <> 'hard' then return true; end if;
  -- hard : accès seulement si droit actif / essai non expiré.
  return exists (
    select 1 from public.org_entitlements e
    where e.organization_id = p_org and e.key = p_key
      and (e.status = 'active'
           or (e.status = 'trial' and (e.trial_ends_at is null or e.trial_ends_at > now())))
  );
end $$;
comment on function public.entitlement_allows(uuid, text) is
  'RFC 0008 P3 : true si l''action est autorisée (clé soft, ou clé hard avec droit actif). Réservé service_role.';
-- Pas de fuite « qui a quoi » : réservé au contexte serveur.
revoke execute on function public.entitlement_allows(uuid, text) from public;
revoke execute on function public.entitlement_allows(uuid, text) from authenticated;

-- 3. Pré-vol : orgs qui seraient NOUVELLEMENT bloquées par un gate --------------
create or replace function public.gate_coverage_audit(p_key text)
returns table(organization_id uuid, org_name text, usage_count bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  -- 'measures' : régulateurs ayant émis des mesures mais sans le droit 'measures'.
  if p_key = 'measures' then
    return query
      select o.id, o.name, count(*)::bigint
      from public.regulatory_measures m
      join public.users u on u.id = m.issued_by
      join public.organizations o on o.id = u.organization_id
      where not exists (
        select 1 from public.org_entitlements e
        where e.organization_id = o.id and e.key = 'measures'
          and (e.status = 'active' or (e.status = 'trial' and (e.trial_ends_at is null or e.trial_ends_at > now())))
      )
      group by o.id, o.name;
  end if;
  -- Autres clés : câblage de leur edge dans un incrément ultérieur → audit vide ici.
  return;
end $$;
comment on function public.gate_coverage_audit(text) is
  'RFC 0008 P3 pré-vol : orgs utilisant déjà une fonctionnalité sans en avoir le droit (seraient bloquées si la clé passe en hard). 0 ligne = activation sûre.';
