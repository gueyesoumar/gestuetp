# Configuration opérationnelle — Relances graduées

Ce document décrit les étapes à effectuer après le déploiement du chantier #4
(relances graduées sur les demandes de preuves).

## 1. Variables d'environnement Edge Functions

À configurer dans Supabase Dashboard → Settings → Edge Functions :

| Variable | Valeur | Note |
|----------|--------|------|
| `RESEND_API_KEY` | clé API Resend | Déjà présente (utilisée par `_shared/resend.ts`) |
| `RESEND_FROM_EMAIL` | `Gëstu Comply <noreply@gestucomply.com>` | Optionnel, fallback prévu |
| `APP_BASE_URL` | `https://app.gestucomply.com` | URL publique de l'application — utilisée pour les liens dans les emails |

## 2. Migrations à appliquer

```bash
supabase db push
```

Vérifier que les migrations 00064, 00065, 00066 sont bien appliquées.

```sql
-- Vérification rapide
SELECT count(*) FROM public.email_preferences;
SELECT column_name FROM information_schema.columns
  WHERE table_name = 'mission_evidence_requests'
    AND column_name IN ('due_date', 'last_reminder_at');
```

## 3. Déploiement des Edge Functions

```bash
supabase functions deploy evidence-reminders
supabase functions deploy email-preferences
```

## 4. Activation du cron (pg_cron + pg_net)

Dans Supabase Dashboard → Database → Extensions, activer :
- `pg_cron`
- `pg_net`

Puis exécuter dans le SQL Editor :

```sql
-- Planifie l'appel quotidien à 07:00 UTC.
-- Remplacer SUPABASE_PROJECT_REF par la ref du projet.
-- Remplacer SERVICE_ROLE_KEY par la clé service-role.
SELECT cron.schedule(
  'evidence-reminders-daily',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://SUPABASE_PROJECT_REF.functions.supabase.co/evidence-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Pour vérifier les jobs planifiés :

```sql
SELECT * FROM cron.job;
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

Pour supprimer le job :

```sql
SELECT cron.unschedule('evidence-reminders-daily');
```

## 5. Configuration DNS du domaine d'envoi

Sans SPF / DKIM / DMARC, les emails partent en spam. À configurer une seule fois sur
`gestucomply.com` (ou le domaine d'envoi choisi) :

- **SPF** : `v=spf1 include:_spf.resend.com ~all`
- **DKIM** : suivre les instructions Resend Dashboard → Domains → Add domain
- **DMARC** : `v=DMARC1; p=quarantine; rua=mailto:postmaster@gestucomply.com`

Vérifier la délivrabilité avec [mail-tester.com](https://www.mail-tester.com/) avant la mise en prod.

## 6. Tests manuels

### Forcer une relance immédiate (sans attendre la cron)

Insérer une demande à `created_at = now() - 4 days` pour simuler J+3 :

```sql
UPDATE public.mission_evidence_requests
SET created_at = now() - interval '4 days'
WHERE id = 'UUID_TEST';
```

Puis invoquer manuellement la fonction :

```bash
curl -X POST \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  https://SUPABASE_PROJECT_REF.functions.supabase.co/evidence-reminders
```

Vérifier le retour `{ sent, skipped, failed }` et la trace dans `email_log` :

```sql
SELECT * FROM public.email_log ORDER BY sent_at DESC LIMIT 5;
```

### Tester le désabonnement

1. Récupérer un token : `SELECT unsubscribe_token FROM email_preferences WHERE user_id = '...';`
2. Ouvrir `https://app.gestucomply.com/unsubscribe?token=<token>` dans un navigateur privé
3. Désactiver un toggle → vérifier en SQL : `SELECT reminders_enabled FROM email_preferences WHERE user_id = '...';`

## 7. Surveillance

Une absence d'envois pendant 48 h peut signaler un cron arrêté :

```sql
SELECT max(sent_at) FROM public.email_log WHERE type LIKE 'reminder_%';
```

À industrialiser plus tard via une métrique Grafana ou un check Statuscake.
