interface MissionCalendarStepProps {
  startDate: string
  endDate: string
  totalControls: number
  teamSize: number
  onStartDate: (date: string) => void
  onEndDate: (date: string) => void
}

export function MissionCalendarStep({ startDate, endDate, totalControls, teamSize, onStartDate, onEndDate }: MissionCalendarStepProps) {
  const auditors = Math.max(teamSize, 1)
  const scopingDays = Math.max(2, Math.ceil(totalControls / 30))
  const fieldworkDays = Math.max(3, Math.ceil(totalControls / (auditors * 5)))
  const reviewDays = Math.max(2, Math.ceil(fieldworkDays * 0.3))
  const clientDays = Math.max(2, Math.ceil(reviewDays * 0.5))
  const totalDays = scopingDays + fieldworkDays + reviewDays + clientDays

  const phases = [
    { label: 'Cadrage', days: scopingDays, color: 'bg-gray-400' },
    { label: 'Travaux', days: fieldworkDays, color: 'bg-forest-500' },
    { label: 'Revue', days: reviewDays, color: 'bg-gold-500' },
    { label: 'Client', days: clientDays, color: 'bg-forest-300' },
  ]

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900">Planifiez le calendrier</h3>
      <p className="mt-1 text-[13px] text-gray-500">Définissez les dates et consultez l'estimation par phase</p>

      <div className="mt-4 grid grid-cols-2 gap-3.5">
        <div>
          <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Date de début</label>
          <input type="date" value={startDate} onChange={(e) => onStartDate(e.target.value)} className="w-full" />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Date de fin</label>
          <input type="date" value={endDate} onChange={(e) => onEndDate(e.target.value)} className="w-full" />
        </div>
      </div>

      <div className="mt-5 rounded-[10px] border border-gold-200 bg-gold-50 px-4 py-3.5">
        <div className="text-[12px] font-semibold text-gold-600 mb-2.5">
          Estimation automatique ({totalControls} contrôles, {auditors} auditeur{auditors > 1 ? 's' : ''})
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {phases.map((p) => (
            <div key={p.label}>
              <div className="text-[16px] font-extrabold text-gold-600">{p.days}j</div>
              <div className="text-[10px] text-gray-400">{p.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <div className="text-[13px] font-semibold text-gray-900 mb-2">Timeline prévisionnelle</div>
        <div className="flex rounded-lg overflow-hidden h-7">
          {phases.map((p) => (
            <div
              key={p.label}
              className={`flex items-center justify-center text-[10px] font-semibold text-white ${p.color}`}
              style={{ flex: p.days }}
            >
              {p.days}j
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-2 text-[11px] text-gray-500">
          {phases.map((p) => (
            <span key={p.label} className="flex items-center gap-1.5">
              <span className={`inline-block w-2 h-2 rounded-sm ${p.color}`} />
              {p.label}
            </span>
          ))}
          <span className="ml-auto font-semibold text-gray-700">Total : {totalDays}j</span>
        </div>
      </div>
    </div>
  )
}
