import { useState } from 'react'
import type { Question } from '../../types/database.types'

interface WizardQuestionCardProps {
  question: Question
  sectionLabel: string
  value: unknown
  onChange: (value: unknown) => void
  readOnly?: boolean
}

const SECTION_ICONS: Record<string, string> = {
  GOV: '\uD83D\uDCDA',
  MAT: '\uD83D\uDCC8',
  OPS: '\uD83D\uDD27',
  INC: '\uD83D\uDEA8',
  ATT: '\uD83C\uDFAF',
}

export function WizardQuestionCard({ question, sectionLabel, value, onChange, readOnly }: WizardQuestionCardProps) {
  const sectionCode = question.code.split('-')[0]
  const icon = SECTION_ICONS[sectionCode] ?? '\u2753'

  return (
    <div className="px-6 py-7">
      <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-forest-700 bg-forest-100 px-2.5 py-1 rounded-full mb-4">
        {icon} {sectionLabel}
      </span>
      <h2 className="text-lg font-bold text-gray-900 mb-1.5 leading-snug">{question.text}</h2>
      {question.description && (
        <p className="text-[13px] text-gray-300 mb-5 leading-relaxed">{question.description}</p>
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
        <p className="text-2xl mb-1">&#128994;</p>
        <p className={`text-[13px] font-semibold ${value === true ? 'text-green-700' : 'text-gray-700'}`}>Oui</p>
      </button>
      <button onClick={() => !readOnly && onChange(false)} disabled={readOnly}
        className={`flex-1 py-4 border-2 rounded-xl text-center transition-all ${
          value === false ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-forest-300 hover:bg-forest-50'
        }`}>
        <p className="text-2xl mb-1">&#128308;</p>
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
