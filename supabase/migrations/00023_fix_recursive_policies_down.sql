-- Migration: Correction des policies RLS recursives (DOWN)
-- Restaure les anciennes policies (celles qui causaient la recursion)
-- Note: en pratique on ne voudra jamais revenir a ces policies recursives
-- Ce script est fourni pour conformite avec la regle up/down

-- Ce rollback ne restaure pas les anciennes policies car elles etaient bugguees.
-- Pour rollback complet, re-executer les migrations 00001 a 00021 depuis zero.

select 'Rollback 00023: les anciennes policies recursives ne sont pas restaurees volontairement.' as notice;
