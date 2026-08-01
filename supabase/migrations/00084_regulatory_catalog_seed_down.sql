-- Migration 00084: Catalogue des exigences réglementaires (seed → migration) — DOWN
--
-- Retire les 21 entrées ajoutées par la migration UP. PSSI-ES n'est pas
-- supprimée ici (elle est posée par 00050 et son own _down s'en charge).

DELETE FROM public.regulatory_catalog
WHERE short_name IN (
  'CDP-SN', 'CYBER-SN', 'SINFO-SN', 'BANK-SN', 'DEC721-SN',
  'BCEAO-CI', 'BCEAO-SSI', 'BCEAO-PAY', 'BCEAO-GOV', 'UEMOA-LCB',
  'CIMA-GOV',
  'CEDEAO-DP', 'CEDEAO-TE',
  'RGPD', 'PCI-DSS', 'BALE-III', 'ISO27001-REQ', 'SOC2'
);
