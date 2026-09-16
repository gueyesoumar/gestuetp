import { useCronStatus, type CronJob } from '../useCronStatus'

/** Fenêtre de fraîcheur attendue selon le schedule (heuristique). */
function isStale(job: CronJob): boolean {
  if (!job.active) return false
  if (!job.last_run_at) return true
  const ageH = (Date.now() - new Date(job.last_run_at).getTime()) / 3_600_000
  const hourly = /^(\*|\*\/\d+|0) \* \* \* \*$/.test(job.schedule.trim())
  return ageH > (hourly ? 2 : 26)
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'jamais'
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (m < 1) return "à l'instant"
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h} h`
  return `il y a ${Math.floor(h / 24)} j`
}

function Pill({ job }: { job: CronJob }) {
  if (!job.last_run_at) return <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-600">Jamais</span>
  if (isStale(job)) return <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-600">Périmé</span>
  if (job.last_status && job.last_status !== 'succeeded') return <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-600">Échec</span>
  return <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green-50 text-green-700">OK</span>
}

export function CronWatchdog() {
  const { jobs, loading, error } = useCronStatus()
  const alerts = jobs.filter((j) => !j.last_run_at || isStale(j) || (j.last_status && j.last_status !== 'succeeded')).length

  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <header className="flex items-center px-4 py-3 border-b border-gray-200">
        <span className="text-[13px] font-bold text-gray-900">Tâches planifiées — watchdog</span>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-gray-400 font-semibold">dead-man&apos;s switch</span>
        {alerts > 0 && <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 tabular-nums">{alerts}</span>}
      </header>
      {error ? (
        <div className="px-4 py-6 text-center text-[12px] text-gray-400">{error}</div>
      ) : loading ? (
        <div className="px-4 py-6 text-center text-[12px] text-gray-400">Chargement…</div>
      ) : jobs.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12px] text-gray-400">Aucune tâche planifiée.</div>
      ) : (
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-[10.5px] uppercase tracking-wider text-gray-300 font-semibold">
              <th className="text-left px-4 py-2 border-b border-gray-100">Tâche</th>
              <th className="text-left px-4 py-2 border-b border-gray-100">Dernier run</th>
              <th className="text-right px-4 py-2 border-b border-gray-100">Durée</th>
              <th className="text-right px-4 py-2 border-b border-gray-100">Statut</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.jobname} className="hover:bg-page-bg">
                <td className="px-4 py-2.5 border-b border-gray-100">
                  <div className="font-semibold text-gray-900">{j.jobname}</div>
                  <div className="text-[10.5px] text-gray-400 font-mono">{j.schedule}{j.active ? '' : ' · inactif'}</div>
                </td>
                <td className="px-4 py-2.5 border-b border-gray-100 text-[12px] text-gray-600 tabular-nums">{timeAgo(j.last_run_at)}</td>
                <td className="px-4 py-2.5 border-b border-gray-100 text-right text-[11.5px] text-gray-500 tabular-nums">{j.last_duration_ms != null ? `${(j.last_duration_ms / 1000).toFixed(1)} s` : '—'}</td>
                <td className="px-4 py-2.5 border-b border-gray-100 text-right"><Pill job={j} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
