import { useMemo, useState } from 'react'
import { useCabinetFeatureFlags, type CabinetFlag } from './useCabinetFeatureFlags'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { useToast } from '../../hooks/useToast'

interface Props {
  cabinetId: string
}

type SegState = 'inherit' | 'on' | 'off'

function effectiveState(flag: CabinetFlag): { enabled: boolean; forced: boolean } {
  if (flag.override_enabled !== null) return { enabled: flag.override_enabled, forced: true }
  return { enabled: flag.is_globally_enabled, forced: false }
}

function segOf(flag: CabinetFlag): SegState {
  if (flag.override_enabled === null) return 'inherit'
  return flag.override_enabled ? 'on' : 'off'
}

export function CabinetFeatureFlagsTab({ cabinetId }: Props) {
  const { flags, loading, error, setOverride, resetOverride } = useCabinetFeatureFlags(cabinetId)
  const [pending, setPending] = useState<{ flag: CabinetFlag; target: SegState } | null>(null)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()

  const counts = useMemo(() => ({
    inherited: flags.filter((f) => f.override_enabled === null).length,
    forcedOn: flags.filter((f) => f.override_enabled === true).length,
    forcedOff: flags.filter((f) => f.override_enabled === false).length,
  }), [flags])

  const askChange = (flag: CabinetFlag, target: SegState) => {
    if (target === segOf(flag)) return
    setPending({ flag, target })
    setReason('')
  }

  const submit = async () => {
    if (!pending || !reason.trim()) return
    setSubmitting(true)
    let ok = false
    if (pending.target === 'inherit') {
      ok = await resetOverride(pending.flag.slug, reason)
    } else {
      ok = await setOverride(pending.flag.slug, pending.target === 'on', reason)
    }
    setSubmitting(false)
    if (ok) {
      toast.success(
        pending.target === 'inherit' ? 'Override réinitialisé' :
        pending.target === 'on' ? 'Flag forcé ON pour ce cabinet' :
        'Flag forcé OFF pour ce cabinet',
        { description: pending.flag.slug },
      )
      setPending(null)
      setReason('')
    } else {
      toast.error('Mise à jour impossible')
    }
  }

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-lg border border-gold-200 bg-gold-50 text-[12.5px]">
        <span><b className="font-semibold text-forest-900">{flags.length} flags</b></span>
        <span><b className="font-semibold text-forest-900">{counts.inherited}</b> hérités</span>
        <span style={{ color: 'var(--color-forest-700, #2D6A4F)' }}><b className="font-semibold text-green-700">{counts.forcedOn}</b> forcés ON</span>
        <span className="text-red-600"><b className="font-semibold">{counts.forcedOff}</b> forcés OFF</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {flags.map((f, idx) => {
          const eff = effectiveState(f)
          const seg = segOf(f)
          const rowBg = seg === 'on' ? 'bg-green-50/30' : seg === 'off' ? 'bg-red-50/30' : ''
          return (
            <div key={f.flag_id} className={`grid grid-cols-[1fr_auto_auto] gap-4 items-center px-5 py-3.5 ${idx < flags.length - 1 ? 'border-b border-gray-100' : ''} ${rowBg}`}>
              <div className="min-w-0">
                <div className="font-mono text-[11.5px] font-bold text-forest-900">{f.slug}</div>
                <div className="text-[13px] font-bold text-gray-900 mt-0.5">{f.name}</div>
                {f.description && <div className="text-[11.5px] text-gray-500 mt-0.5 leading-snug">{f.description}</div>}
                {f.override_reason && (
                  <div
                    className={`text-[11px] italic mt-1.5 leading-relaxed ${f.override_enabled ? 'text-green-700' : 'text-red-600'}`}
                    title={f.override_reason}
                  >
                    {f.override_enabled ? 'Forcé ON' : 'Forcé OFF'}{' — '}<span className="opacity-80">&laquo;&nbsp;{f.override_reason.length > 80 ? `${f.override_reason.slice(0, 80)}…` : f.override_reason}&nbsp;&raquo;</span>
                  </div>
                )}
                {!f.override_reason && (
                  <div className="text-[10.5px] text-gray-400 mt-1 italic">Global : {f.is_globally_enabled ? 'ON' : 'OFF'}</div>
                )}
              </div>
              <StatePill enabled={eff.enabled} forced={eff.forced} />
              <SegmentedControl current={seg} onChange={(target) => askChange(f, target)} />
            </div>
          )
        })}
      </div>

      {pending && (
        <ReasonModal
          flag={pending.flag}
          target={pending.target}
          reason={reason}
          onChangeReason={setReason}
          submitting={submitting}
          onCancel={() => { setPending(null); setReason('') }}
          onSubmit={submit}
        />
      )}
    </div>
  )
}

function StatePill({ enabled, forced }: { enabled: boolean; forced: boolean }) {
  const cls = enabled ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
  const tag = forced ? 'Forcé' : 'Hérité'
  const tagCls = forced
    ? 'bg-gold-500 text-forest-900'
    : enabled ? 'bg-green-700 text-white opacity-60' : 'bg-gray-500 text-white opacity-60'
  return (
    <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${cls}`}>
      <span className={`px-1.5 py-0.5 rounded-full text-[9.5px] uppercase tracking-wider font-bold ${tagCls}`}>{tag}</span>
      {enabled ? 'Actif' : 'Désactivé'}
    </span>
  )
}

function SegmentedControl({ current, onChange }: { current: SegState; onChange: (v: SegState) => void }) {
  const Btn = ({ v, label, activeBg }: { v: SegState; label: string; activeBg: string }) => {
    const isActive = current === v
    return (
      <button
        type="button"
        onClick={() => onChange(v)}
        className={`px-2.5 py-1.5 rounded-md text-[10.5px] font-bold uppercase tracking-wider transition-colors ${
          isActive ? activeBg : 'text-gray-500 hover:bg-white hover:text-gray-700'
        }`}
      >
        {label}
      </button>
    )
  }
  return (
    <div className="inline-flex gap-0.5 bg-gray-100 border border-gray-200 rounded-lg p-0.5">
      <Btn v="inherit" label="Hériter" activeBg="bg-white text-forest-900 shadow-sm" />
      <Btn v="on" label="Forcer ON" activeBg="bg-green-600 text-white" />
      <Btn v="off" label="Forcer OFF" activeBg="bg-red-600 text-white" />
    </div>
  )
}

function ReasonModal({ flag, target, reason, onChangeReason, submitting, onCancel, onSubmit }: {
  flag: CabinetFlag; target: SegState; reason: string; onChangeReason: (v: string) => void; submitting: boolean; onCancel: () => void; onSubmit: () => void
}) {
  const titleVerb = target === 'inherit' ? 'Réinitialiser (hériter)' : target === 'on' ? 'Forcer ON' : 'Forcer OFF'
  const submitLabel = target === 'inherit' ? 'Réinitialiser' : target === 'on' ? 'Forcer ON' : 'Forcer OFF'
  const danger = target === 'off'
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-[14.5px] font-bold text-gray-900">{titleVerb} — <code className="font-mono">{flag.slug}</code></h3>
          <p className="text-[12px] text-gray-500 mt-1">Pour ce cabinet uniquement. Le flag global reste à <b>{flag.is_globally_enabled ? 'ON' : 'OFF'}</b>.</p>
        </div>
        <div className="px-5 py-4">
          <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">Motif <span className="text-red-500">*</span></label>
          <textarea value={reason} onChange={(e) => onChangeReason(e.target.value)} rows={3} placeholder="Pourquoi cette modification ?" className="w-full" disabled={submitting} />
          <p className="mt-2 text-[11px] text-gray-400">Le motif est tracé indéfiniment dans l&apos;audit log du cabinet.</p>
        </div>
        <div className="px-5 py-3 bg-page-bg border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onCancel} disabled={submitting} className="px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">Annuler</button>
          <button
            onClick={onSubmit}
            disabled={submitting || !reason.trim()}
            className={`px-3.5 py-2 text-[12.5px] font-semibold rounded-lg text-white disabled:opacity-50 ${danger ? 'bg-red-600 hover:bg-red-700' : target === 'on' ? 'bg-green-600 hover:bg-green-700' : 'bg-forest-700 hover:bg-forest-900'}`}
          >
            {submitting ? 'En cours…' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
