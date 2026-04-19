interface AlertCardProps {
  label: string
  value: number | string
  sub: string
  variant: 'urgent' | 'warn' | 'info'
}

const styles = {
  urgent: 'bg-red-50 border-red-200 [&_.al]:text-error [&_.as]:text-red-800',
  warn: 'bg-gold-50 border-gold-200 [&_.al]:text-gold-600 [&_.as]:text-gold-600',
  info: 'bg-forest-50 border-forest-100 [&_.al]:text-forest-700 [&_.as]:text-forest-500',
}

export function AlertCard({ label, value, sub, variant }: AlertCardProps) {
  return (
    <div className={`rounded-xl border p-4 ${styles[variant]}`}>
      <div className="al text-[11px] font-semibold uppercase tracking-wide">{label}</div>
      <div className="al mt-1 text-[22px] font-extrabold">{value}</div>
      <div className="as mt-0.5 text-[12px]">{sub}</div>
    </div>
  )
}

interface AlertCardsRowProps {
  pendingReviews: number
  clientRejections: number
  questionnaireProgress?: string
}

export function AlertCardsRow({ pendingReviews, clientRejections, questionnaireProgress }: AlertCardsRowProps) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-3.5">
      {clientRejections > 0 && (
        <AlertCard variant="urgent" label="Urgent" value={clientRejections} sub="Contr&ocirc;les rejet&eacute;s par le client" />
      )}
      {clientRejections === 0 && (
        <AlertCard variant="info" label="Aucun rejet" value="0" sub="Tous les contr&ocirc;les valid&eacute;s" />
      )}
      <AlertCard variant="warn" label="&Agrave; revoir" value={pendingReviews} sub="Contr&ocirc;les soumis en attente" />
      <AlertCard variant="info" label="R&eacute;ponses client" value={questionnaireProgress ?? '\u2014'} sub="Questionnaires en cours" />
    </div>
  )
}
