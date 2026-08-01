-- Seed: 023 — Controls risk_level
-- Description : Affecte des niveaux de risque inhérent (1-5) aux contrôles
-- des référentiels seedés (ISO 27001:2022, NIST CSF, PSSI-ES).
--
-- Échelle :
--   1 = très faible (procédural, faible impact si défaillant)
--   2 = faible (organisationnel, RH, sensibilisation)
--   3 = modéré (DEFAULT — politiques générales, gouvernance)
--   4 = élevé (technique critique, accès, monitoring)
--   5 = critique (exposition directe ou impact majeur en cas de défaillance)
--
-- Cible : seules les valeurs ≠ default (3) sont définies. Tout contrôle non
-- listé garde la valeur par défaut.
--
-- Idempotent : peut être ré-exécuté sans effet de bord (UPDATE WHERE).

-- ============================================================
-- ISO 27001:2022 — Annexe A
-- ============================================================

-- A.5 Organizational — descendre certains à 2 (procédural light)
update public.controls set risk_level = 2 where code in ('A.5.4', 'A.5.5', 'A.5.6');
-- 5.4 management responsibilities, 5.5 contact with authorities, 5.6 contact with special interest groups

-- A.5 Organizational — monter à 4 (incident response, classification, supply chain)
update public.controls set risk_level = 4 where code in (
  'A.5.7',   -- Threat intelligence
  'A.5.12',  -- Classification of information
  'A.5.15',  -- Access control
  'A.5.16',  -- Identity management
  'A.5.17',  -- Authentication information
  'A.5.18',  -- Access rights
  'A.5.19',  -- Information security in supplier relationships
  'A.5.20',  -- Addressing information security within supplier agreements
  'A.5.23',  -- Information security for use of cloud services
  'A.5.24',  -- Information security incident management planning
  'A.5.25',  -- Assessment and decision on information security events
  'A.5.26',  -- Response to information security incidents
  'A.5.27',  -- Learning from information security incidents
  'A.5.30',  -- ICT readiness for business continuity
  'A.5.34'   -- Privacy and protection of PII
);

-- A.5 Organizational — monter à 5 (legal/compliance critique)
update public.controls set risk_level = 5 where code in (
  'A.5.31',  -- Legal, statutory, regulatory and contractual requirements
  'A.5.33'   -- Protection of records
);

-- A.6 People — descendre à 2 (procédural HR / sensibilisation)
update public.controls set risk_level = 2 where code in (
  'A.6.1',   -- Screening
  'A.6.2',   -- Terms and conditions of employment
  'A.6.4',   -- Disciplinary process
  'A.6.5',   -- Responsibilities after termination or change of employment
  'A.6.6'    -- Confidentiality or non-disclosure agreements
);
-- A.6.3 awareness, A.6.7 remote working, A.6.8 reporting events restent à 3

-- A.7 Physical — monter à 4 (monitoring physique critique)
update public.controls set risk_level = 4 where code in (
  'A.7.4',   -- Physical security monitoring
  'A.7.5',   -- Protecting against physical and environmental threats
  'A.7.10'   -- Storage media
);

-- A.8 Technological — défaut → 4 (presque tous techniques critiques)
update public.controls set risk_level = 4 where code like 'A.8.%' and risk_level = 3;

-- A.8 Technological — monter à 5 (les plus critiques : auth, crypto, malware, vuln, backup)
update public.controls set risk_level = 5 where code in (
  'A.8.2',   -- Privileged access rights
  'A.8.5',   -- Secure authentication
  'A.8.7',   -- Protection against malware
  'A.8.8',   -- Management of technical vulnerabilities
  'A.8.12',  -- Data leakage prevention
  'A.8.13',  -- Information backup
  'A.8.16',  -- Monitoring activities
  'A.8.20',  -- Networks security
  'A.8.22',  -- Segregation of networks
  'A.8.24',  -- Use of cryptography
  'A.8.28'   -- Secure coding
);

-- ============================================================
-- NIST CSF v2.0
-- ============================================================
-- Codes : GV.* (Govern), ID.* (Identify), PR.* (Protect), DE.* (Detect),
--         RS.* (Respond), RC.* (Recover)

-- Govern — modéré sauf supply chain
update public.controls set risk_level = 4 where code = 'GV.SC';  -- Cybersecurity Supply Chain Risk Management

-- Identify — risk assessment et asset management critiques
update public.controls set risk_level = 4 where code in (
  'ID.AM',  -- Asset Management
  'ID.RA'   -- Risk Assessment
);

-- Protect — toutes les fonctions PR à 4 (prévention)
update public.controls set risk_level = 4 where code like 'PR.%';
-- Cas critique : Data Security
update public.controls set risk_level = 5 where code = 'PR.DS';
-- Authentication & Access Control critique
update public.controls set risk_level = 5 where code = 'PR.AA';

-- Detect — détection critique
update public.controls set risk_level = 5 where code in (
  'DE.AE',  -- Adverse Event Analysis
  'DE.CM'   -- Continuous Monitoring
);

-- Respond — réponse critique
update public.controls set risk_level = 4 where code like 'RS.%';
update public.controls set risk_level = 5 where code = 'RS.MI';  -- Incident Mitigation

-- Recover — récupération
update public.controls set risk_level = 4 where code like 'RC.%';

-- ============================================================
-- PSSI-ES (référentiel sénégalais)
-- ============================================================
-- Codes : 'REG X-Y' où X = numéro objectif

-- REG 1 (formation AQSSI) → 2 (sensibilisation)
update public.controls set risk_level = 2 where code like 'REG 1-%';

-- REG 2 (sélection personnel) → 2
update public.controls set risk_level = 2 where code like 'REG 2-%';

-- REG 7 (fournisseurs) → 4
update public.controls set risk_level = 4 where code like 'REG 7-%';

-- REG 8 (périmètres physiques) → 4
update public.controls set risk_level = 4 where code like 'REG 8-%';

-- REG 11-13 (exploitation, opérations, sécurité) → 4
update public.controls set risk_level = 4 where code like 'REG 11-%' or code like 'REG 12-%' or code like 'REG 13-%';

-- REG 14 (continuité, reprise) → 4
update public.controls set risk_level = 4 where code like 'REG 14-%';

-- REG 15 (conformité) → 4
update public.controls set risk_level = 4 where code like 'REG 15-%';

-- REG 16 (gestion incidents) → 5
update public.controls set risk_level = 5 where code like 'REG 16-%';

-- REG 17 (sécurité accès) → 5
update public.controls set risk_level = 5 where code like 'REG 17-%';

-- ============================================================
-- Verification (informational only — comment out for prod runs)
-- ============================================================
-- select code, risk_level from public.controls
-- where risk_level != 3
-- order by risk_level desc, code;
