import { useState } from 'react'
import { CircleCheck, CircleX } from 'lucide-react'
import type { Question, QuestionnaireSkipReason } from '../../types/database.types'

interface WizardQuestionCardProps {
  question: Question
  sectionLabel: string
  value: unknown
  skipReason?: QuestionnaireSkipReason | null
  isPrefilled?: boolean
  onChange: (value: unknown) => void
  onSkip?: (reason: QuestionnaireSkipReason | null) => void
  readOnly?: boolean
}

const SKIP_OPTIONS: { reason: QuestionnaireSkipReason; label: string }[] = [
  { reason: 'rssi_validation', label: 'À valider avec le RSSI' },
  { reason: 'no_object', label: 'Sans objet' },
  { reason: 'unknown', label: 'Je ne sais pas' },
]

const SECTION_ICONS: Record<string, string> = {
  GOV: '\uD83D\uDCDA',
  MAT: '\uD83D\uDCC8',
  OPS: '\uD83D\uDD27',
  INC: '\uD83D\uDEA8',
  ATT: '\uD83C\uDFAF',
}

export function WizardQuestionCard({ question, sectionLabel, value, skipReason, isPrefilled, onChange, onSkip, readOnly }: WizardQuestionCardProps) {
  const sectionCode = question.code.split('-')[0]
  const icon = SECTION_ICONS[sectionCode] ?? '\u2753'
  const skipped = skipReason !== null && skipReason !== undefined

  const handleSkipClick = (reason: QuestionnaireSkipReason) => {
    if (!onSkip || readOnly) return
    onSkip(skipReason === reason ? null : reason)
  }

  return (
    <div className="px-6 py-7">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-forest-700 bg-forest-100 px-2.5 py-1 rounded-full">
          {icon} {sectionLabel}
        </span>
        {isPrefilled && (
          <span className="text-[10px] font-bold text-forest-700 bg-forest-50 border border-forest-300 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
            \u2713 Pr\u00e9-rempli depuis la fiche client
          </span>
        )}
        {!question.is_required && (
          <span className="text-[10px] font-bold text-gold-700 bg-gold-50 border border-gold-300 px-2 py-0.5 rounded-full">
            Optionnel
          </span>
        )}
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-1.5 leading-snug">{question.text}</h2>
      {question.description && (
        <p className="text-[13px] text-gray-300 mb-5 leading-relaxed">{question.description}</p>
      )}
      {skipped && (
        <div className="mb-3 p-2.5 bg-gold-50 border border-gold-300 rounded-lg text-xs text-gold-700">
          <strong>Question marqu\u00e9e :</strong> {SKIP_OPTIONS.find((o) => o.reason === skipReason)?.label}
          <span className="text-[11px] text-gold-600 ml-2">(cliquez \u00e0 nouveau sur la m\u00eame puce pour r\u00e9activer)</span>
        </div>
      )}

      {question.question_type === 'boolean' && (
        <BooleanAnswer value={value as boolean | null} onChange={onChange} readOnly={readOnly} />
      )}
      {question.question_type === 'single_choice' && isScale(question.options) && (
        <ScaleAnswer options={question.options as string[]} value={value as string | null} onChange={onChange} readOnly={readOnly} />
      )}
      {question.question_type === 'single_choice' && !isScale(question.options) && (
        <ChoiceAnswer options={question.options as string[]} value={value as string | null} onChange={onChange} readOnly={readOnly} />
      )}
      {question.question_type === 'multiple_choice' && (
        <MultiSelectAnswer options={question.options as string[]} value={(value ?? []) as string[]} onChange={onChange} readOnly={readOnly} />
      )}
      {question.question_type === 'text' && (
        <TextAnswer value={(value ?? '') as string} onChange={onChange} readOnly={readOnly} />
      )}

      {/* Follow-up for boolean YES */}
      {question.question_type === 'boolean' && value === true && question.code === 'GOV-01' && (
        <FollowUp label="Qui est le RSSI ? (nom et rattachement)" readOnly={readOnly} />
      )}
      {question.question_type === 'single_choice' && typeof value === 'string' && value.startsWith('Oui') && question.code === 'GOV-03' && (
        <FollowUp label="Date d&rsquo;expiration de la certification" type="date" readOnly={readOnly} />
      )}

      {/* Skip chips */}
      {!readOnly && onSkip && (
        <div className="mt-5 pt-4 border-t border-dashed border-gray-200">
          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-2">
            Vous ne pouvez pas répondre maintenant ?
          </p>
          <div className="flex gap-2 flex-wrap">
            {SKIP_OPTIONS.map((opt) => {
              const active = skipReason === opt.reason
              return (
                <button
                  key={opt.reason}
                  type="button"
                  onClick={() => handleSkipClick(opt.reason)}
                  className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                    active
                      ? 'bg-gold-500 border-gold-500 text-forest-900'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gold-300 hover:bg-gold-50'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function BooleanAnswer({ value, onChange, readOnly }: { value: boolean | null; onChange: (v: boolean) => void; readOnly?: boolean }) {
  return (
    <div className="flex gap-3">
      <button onClick={() => !readOnly && onChange(true)} disabled={readOnly}
        className={`flex-1 py-4 border-2 rounded-xl text-center transition-all ${
          value === true ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-forest-300 hover:bg-forest-50'
        }`}>
        <div className="flex justify-center mb-1"><CircleCheck size={24} className="text-green-500" /></div>
        <p className={`text-[13px] font-semibold ${value === true ? 'text-green-700' : 'text-gray-700'}`}>Oui</p>
      </button>
      <button onClick={() => !readOnly && onChange(false)} disabled={readOnly}
        className={`flex-1 py-4 border-2 rounded-xl text-center transition-all ${
          value === false ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-forest-300 hover:bg-forest-50'
        }`}>
        <div className="flex justify-center mb-1"><CircleX size={24} className="text-red-500" /></div>
        <p className={`text-[13px] font-semibold ${value === false ? 'text-red-700' : 'text-gray-700'}`}>Non</p>
      </button>
    </div>
  )
}

function ChoiceAnswer({ options, value, onChange, readOnly }: { options: string[]; value: string | null; onChange: (v: string) => void; readOnly?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => (
        <button key={opt} onClick={() => !readOnly && onChange(opt)} disabled={readOnly}
          className={`w-full text-left px-4 py-3.5 border-2 rounded-xl transition-all ${
            value === opt ? 'border-forest-700 bg-forest-50' : 'border-gray-200 hover:border-forest-300 hover:bg-forest-50'
          }`}>
          <span className={`text-[13px] ${value === opt ? 'font-semibold text-forest-900' : 'text-gray-700'}`}>{opt}</span>
        </button>
      ))}
    </div>
  )
}

function ScaleAnswer({ options, value, onChange, readOnly }: { options: string[]; value: string | null; onChange: (v: string) => void; readOnly?: boolean }) {
  return (
    <div className="flex gap-2">
      {options.map((opt, i) => {
        const num = i + 1
        const label = opt.split(' \u2014 ')[1] ?? opt.split(':')[0] ?? opt
        return (
          <button key={opt} onClick={() => !readOnly && onChange(opt)} disabled={readOnly}
            className={`flex-1 py-3 px-2 border-2 rounded-xl text-center transition-all ${
              value === opt ? 'border-forest-700 bg-forest-50' : 'border-gray-200 hover:border-forest-300'
            }`}>
            <p className={`text-xl font-bold ${value === opt ? 'text-forest-700' : 'text-gray-500'}`}>{num}</p>
            <p className="text-[9px] text-gray-400 mt-1 leading-tight">{label.trim()}</p>
          </button>
        )
      })}
    </div>
  )
}

function MultiSelectAnswer({ options, value, onChange, readOnly }: { options: string[]; value: string[]; onChange: (v: string[]) => void; readOnly?: boolean }) {
  const toggle = (opt: string) => {
    if (readOnly) return
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt))
    else onChange([...value, opt])
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button key={opt} onClick={() => toggle(opt)}
          className={`px-4 py-2.5 border-2 rounded-xl text-[13px] transition-all ${
            value.includes(opt) ? 'border-forest-700 bg-forest-100 text-forest-900 font-medium' : 'border-gray-200 text-gray-600 hover:border-forest-300 hover:bg-forest-50'
          }`}>
          {opt}
        </button>
      ))}
    </div>
  )
}

function TextAnswer({ value, onChange, readOnly }: { value: string; onChange: (v: string) => void; readOnly?: boolean }) {
  return (
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} disabled={readOnly}
      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-[13px] outline-none focus:border-forest-500 disabled:bg-gray-50" />
  )
}

function FollowUp({ label, type = 'text', readOnly }: { label: string; type?: string; readOnly?: boolean }) {
  const [val, setVal] = useState('')
  return (
    <div className="mt-4 p-4 bg-gold-50 border border-gold-200 rounded-xl">
      <p className="text-xs font-semibold text-gold-600 mb-2">&#8618; {label}</p>
      <input type={type} value={val} onChange={(e) => setVal(e.target.value)} disabled={readOnly}
        className="w-full px-3 py-2 border border-gold-200 rounded-lg text-[13px] outline-none focus:border-forest-500" />
    </div>
  )
}

function isScale(options: string[] | null): boolean {
  if (!options || options.length < 3 || options.length > 6) return false
  return options[0].includes('\u2014') || options[0].match(/^\d/) !== null
}
