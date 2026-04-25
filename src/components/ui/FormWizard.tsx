import { useState } from 'react'
import type { ReactNode } from 'react'

export interface WizardStep {
  key: string
  label: string
  content: ReactNode
  /**
   * Optional per-step validator. Returns true when the step is valid.
   * When false, the wizard refuses to advance and the caller is expected to
   * surface inline errors (e.g. via `forceShow()` on field hooks inside the validator).
   */
  validate?: () => boolean
}

interface FormWizardProps {
  steps: WizardStep[]
  onSubmit: () => void
  submitLabel?: string
  submitting?: boolean
}

export function FormWizard({ steps, onSubmit, submitLabel = 'Valider', submitting = false }: FormWizardProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [visited, setVisited] = useState<Set<number>>(new Set([0]))
  const [stepInvalid, setStepInvalid] = useState(false)

  const isLast = currentIndex === steps.length - 1

  const goNext = () => {
    const validator = steps[currentIndex].validate
    if (validator && !validator()) {
      setStepInvalid(true)
      return
    }
    setStepInvalid(false)
    if (isLast) {
      onSubmit()
      return
    }
    const next = currentIndex + 1
    setCurrentIndex(next)
    setVisited((prev) => new Set(prev).add(next))
  }

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setStepInvalid(false)
    }
  }

  const goTo = (index: number) => {
    if (visited.has(index) || index <= currentIndex) {
      setCurrentIndex(index)
      setStepInvalid(false)
    }
  }

  // Calculate the line fill height based on progress
  const lineProgress = steps.length > 1 ? (currentIndex / (steps.length - 1)) * 100 : 0

  return (
    <div className="flex rounded-xl border border-gray-200 bg-white overflow-hidden min-h-[480px]">
      {/* Sidebar with connected dots */}
      <div className="w-60 bg-white border-r border-gray-200 py-7 px-5 flex-shrink-0">
        <div className="relative">
          {/* Background line */}
          <div
            className="absolute left-[14px] top-[18px] w-[2px] bg-gray-200"
            style={{ height: `calc(100% - 36px)` }}
          />
          {/* Filled line */}
          <div
            className="absolute left-[14px] top-[18px] w-[2px] bg-forest-500 transition-all duration-300"
            style={{ height: `calc(${lineProgress}% - ${lineProgress > 0 ? 36 * (1 - lineProgress / 100) : 0}px)` }}
          />

          {/* Steps */}
          <div className="relative space-y-1">
            {steps.map((step, idx) => {
              const isActive = idx === currentIndex
              const isDone = idx < currentIndex
              const isVisited = visited.has(idx)
              const isInvalid = isActive && stepInvalid

              return (
                <button
                  key={step.key}
                  onClick={() => goTo(idx)}
                  disabled={!isVisited && idx > currentIndex}
                  className="flex w-full items-center gap-3.5 py-3 text-left transition-colors disabled:cursor-default"
                >
                  <span
                    className={`relative z-10 flex h-[30px] w-[30px] items-center justify-center rounded-full text-[11px] font-bold flex-shrink-0 transition-all duration-200 ${
                      isInvalid
                        ? 'bg-red-600 text-white shadow-[0_0_0_4px_rgba(254,226,226,1)]'
                        : isActive
                          ? 'bg-forest-700 text-white shadow-[0_0_0_4px_rgba(216,243,220,1)]'
                          : isDone
                            ? 'bg-success text-white'
                            : 'bg-white border-2 border-gray-200 text-gray-300'
                    }`}
                  >
                    {isInvalid ? '!' : isDone ? '\u2713' : idx + 1}
                  </span>
                  <span
                    className={`text-[13px] transition-colors ${
                      isInvalid
                        ? 'font-semibold text-red-600'
                        : isActive
                          ? 'font-semibold text-forest-900'
                          : isDone
                            ? 'font-medium text-success'
                            : isVisited
                              ? 'text-gray-600'
                              : 'text-gray-300'
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-7">
        <div className="flex-1">
          {steps[currentIndex].content}
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 pt-5 mt-5">
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="rounded-lg border border-gray-200 px-5 py-2.5 text-[13px] font-medium text-gray-600 hover:bg-forest-50 hover:border-forest-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Précédent
          </button>
          <div className="flex items-center gap-3">
            {stepInvalid && (
              <span className="text-[12px] font-medium text-red-600">Champs à corriger avant de poursuivre.</span>
            )}
            <button
              onClick={goNext}
              disabled={submitting}
              className="rounded-lg bg-forest-700 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-forest-900 transition-colors disabled:opacity-50"
            >
              {submitting
                ? 'Enregistrement...'
                : isLast
                  ? submitLabel
                  : 'Suivant →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
