import { useState } from 'react'
import { FileText, Presentation, FileSpreadsheet } from 'lucide-react'
import { useFeatureFlag } from '../../../hooks/useFeatureFlag'

const FORMATS = [
  { key: 'pdf', label: 'PDF', icon: FileText, premium: false },
  { key: 'pptx', label: 'PPTX', icon: Presentation, premium: true },
  { key: 'word', label: 'Word', icon: FileSpreadsheet, premium: true },
] as const

const CONTENT_OPTIONS = [
  { key: 'synthese', label: 'Synth\u00e8se' },
  { key: 'detail', label: 'D\u00e9tail des constats' },
  { key: 'radar', label: 'Graphique radar' },
  { key: 'plan_actions', label: 'Plan d\u2019actions' },
  { key: 'soa', label: 'D\u00e9claration d\u2019applicabilit\u00e9 (SoA)' },
  { key: 'annexes', label: 'Annexes' },
] as const

const PERSONALIZATION_OPTIONS = [
  { key: 'client_logo', label: 'Logo client' },
  { key: 'brand_charter', label: 'Charte graphique' },
] as const

interface Props {
  missionId: string
  missionName: string
}

export function ReportGenerator({ missionId, missionName }: Props): JSX.Element {
  const [format, setFormat] = useState<string>('pdf')
  const [content, setContent] = useState<Set<string>>(new Set(['synthese', 'detail', 'radar', 'plan_actions']))
  const [personalization, setPersonalization] = useState<Set<string>>(new Set(['client_logo']))
  const formatsFlag = useFeatureFlag('export_report_formats')
  const availableFormats = FORMATS.filter((f) => !f.premium || (!formatsFlag.loading && formatsFlag.enabled))

  const toggleContent = (key: string): void => {
    setContent((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const togglePersonalization = (key: string): void => {
    setPersonalization((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const handleGenerate = (type: 'audit' | 'comex'): void => {
    console.log(`[ReportGenerator] G\u00e9n\u00e9rer rapport ${type}`, {
      missionId,
      missionName,
      format,
      content: Array.from(content),
      personalization: Array.from(personalization),
    })
  }

  return (
    <div>
      <h4 className="text-sm font-bold text-gray-900 mb-3">G&eacute;n&eacute;ration de rapport</h4>

      {/* Format selector */}
      <div className="mb-4">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Format</p>
        <div className="flex gap-2">
          {availableFormats.map((f) => {
            const Icon = f.icon
            return (
              <button key={f.key} type="button" onClick={() => setFormat(f.key)}
                className={`flex items-center gap-1.5 px-4 py-2 border-2 rounded-xl text-[12px] font-semibold transition-all ${
                  format === f.key ? 'border-forest-700 bg-forest-50 text-forest-700' : 'border-gray-200 text-gray-400 hover:border-gray-300'
                }`}>
                <Icon size={14} /> {f.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content checkboxes */}
      <div className="mb-4">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Contenu</p>
        <div className="grid grid-cols-3 gap-2">
          {CONTENT_OPTIONS.map((opt) => (
            <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={content.has(opt.key)} onChange={() => toggleContent(opt.key)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-forest-700 focus:ring-forest-500" />
              <span className="text-xs text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Personalization */}
      <div className="mb-4">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Personnalisation</p>
        <div className="flex gap-4">
          {PERSONALIZATION_OPTIONS.map((opt) => (
            <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={personalization.has(opt.key)} onChange={() => togglePersonalization(opt.key)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-forest-700 focus:ring-forest-500" />
              <span className="text-xs text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Generate buttons */}
      <div className="flex gap-3">
        <button onClick={() => handleGenerate('audit')}
          className="px-5 py-2.5 bg-forest-700 text-white rounded-lg text-[13px] font-semibold hover:bg-forest-900 transition-colors flex items-center gap-1.5">
          <FileText size={14} /> G&eacute;n&eacute;rer le rapport d&rsquo;audit
        </button>
        <button onClick={() => handleGenerate('comex')}
          className="px-5 py-2.5 bg-white text-forest-700 border-2 border-forest-700 rounded-lg text-[13px] font-semibold hover:bg-forest-50 transition-colors flex items-center gap-1.5">
          <Presentation size={14} /> G&eacute;n&eacute;rer la synth&egrave;se COMEX
        </button>
      </div>
    </div>
  )
}
