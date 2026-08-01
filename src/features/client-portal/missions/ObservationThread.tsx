import { Clock, FileEdit } from 'lucide-react'
import type { ObservationWithAuthor } from './useControlObservations'

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function initials(name: string | null, fallback: string): string {
  return (name ?? fallback).split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

/** Fil d'observations client + réponses auditeur (extrait de ControlDetailDrawer, CLAUDE.md §2). */
export function ObservationThread({ observations }: { observations: ObservationWithAuthor[] }): JSX.Element {
  return (
    <div className="space-y-3 mb-4">
      {observations.map((obs) => (
        <div key={obs.id} className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Observation */}
          <div className="p-3 bg-forest-50">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-full bg-forest-700 text-white flex items-center justify-center text-[9px] font-semibold">
                {initials(obs.authorName, 'C')}
              </div>
              <span className="text-[11px] font-semibold text-gray-700">{obs.authorName ?? 'Client'}</span>
              <span className="text-[10px] text-gray-400 ml-auto">{formatDate(obs.observation_at)}</span>
            </div>
            <p className="text-[12px] text-gray-700 leading-relaxed whitespace-pre-wrap">{obs.observation_text}</p>
          </div>

          {/* Response */}
          {obs.response_text ? (
            <div className="p-3 bg-gold-50 border-t border-gold-200">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-full bg-gold-500 text-white flex items-center justify-center text-[9px] font-semibold">
                  {initials(obs.responderName, 'A')}
                </div>
                <span className="text-[11px] font-semibold text-gray-700">{obs.responderName ?? 'Auditeur'}</span>
                <span className="text-[10px] text-gray-400">{obs.response_at ? formatDate(obs.response_at) : ''}</span>
                {obs.response_action === 'modified' ? (
                  <span className="ml-auto text-[9px] font-medium text-forest-700 bg-forest-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <FileEdit size={10} /> Constat modifi{'é'}
                  </span>
                ) : (
                  <span className="ml-auto text-[9px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    Constat conserv{'é'}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-gray-700 leading-relaxed whitespace-pre-wrap">{obs.response_text}</p>
            </div>
          ) : (
            <div className="p-2.5 border-t border-dashed border-gray-200 bg-white flex items-center gap-2 text-[11px] text-gray-400">
              <Clock size={11} />
              En attente de r{'é'}ponse de l{'’'}auditeur
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
