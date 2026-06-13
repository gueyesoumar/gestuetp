import { createContext, useContext, useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { subscribeErrors, type CapturedError } from '../../../lib/errorBuffer'
import { RecordingHud } from './RecordingHud'

export interface RecordedEvent {
  ts: number
  kind: 'click' | 'nav' | 'error'
  label: string
  detail?: string
}

interface RecorderState {
  recording: boolean
  events: RecordedEvent[]
  lastTrace: RecordedEvent[] | null
  start: () => void
  stop: () => void
  cancel: () => void
  clearTrace: () => void
}

const RecorderCtx = createContext<RecorderState | null>(null)

export function useRecorder(): RecorderState {
  const ctx = useContext(RecorderCtx)
  if (!ctx) throw new Error('useRecorder doit etre utilise dans RecorderProvider')
  return ctx
}

const MAX_EVENTS = 100

/** Minimisation : redige emails + longues suites de chiffres et tronque le libelle capte. */
function sanitizeLabel(raw: string): string {
  return raw
    .replace(/[\w.+-]+@[\w.-]+\.\w+/g, '[email]')
    .replace(/\d{4,}/g, '[num]')
    .slice(0, 40)
}

export function RecorderProvider({ children }: { children: ReactNode }): JSX.Element {
  const [recording, setRecording] = useState(false)
  const [events, setEvents] = useState<RecordedEvent[]>([])
  const [lastTrace, setLastTrace] = useState<RecordedEvent[] | null>(null)
  const eventsRef = useRef<RecordedEvent[]>([])
  const recordingRef = useRef(false)
  const location = useLocation()
  const navigate = useNavigate()
  const pathRef = useRef(location.pathname)
  const originRef = useRef(location.pathname)

  const add = useCallback((e: RecordedEvent): void => {
    if (eventsRef.current.length >= MAX_EVENTS) return
    eventsRef.current = [...eventsRef.current, e]
    setEvents(eventsRef.current)
  }, [])

  // Navigation : le provider est sous le Router, on lit useLocation (pas de patch d'historique).
  useEffect(() => {
    pathRef.current = location.pathname
    if (recordingRef.current) add({ ts: Date.now(), kind: 'nav', label: 'Navigation', detail: location.pathname })
  }, [location, add])

  // Clics : listener global en phase capture, actif seulement pendant l'enregistrement.
  useEffect(() => {
    if (!recording) return
    const onClick = (ev: MouseEvent): void => {
      const target = ev.target as HTMLElement | null
      // Ne pas capturer les clics sur le HUD d'enregistrement lui-meme.
      if (target?.closest('[data-recorder-hud]')) return
      const el = (target?.closest('button, a, [role="button"], [role="tab"], [role="menuitem"]') as HTMLElement | null) ?? target
      if (!el) return
      const label = sanitizeLabel((el.getAttribute('aria-label') || el.textContent || el.tagName).trim())
      add({ ts: Date.now(), kind: 'click', label: 'Clic', detail: label })
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [recording, add])

  // Erreurs : abonnement au buffer (deja sans secret), actif seulement pendant l'enregistrement.
  useEffect(() => {
    if (!recording) return
    return subscribeErrors((e: CapturedError) => {
      add({
        ts: Date.now(),
        kind: 'error',
        label: e.type === 'network' ? 'Erreur réseau' : 'Erreur',
        detail: `${e.message}${e.detail ? ' · ' + e.detail : ''}`,
      })
    })
  }, [recording, add])

  const start = useCallback((): void => {
    originRef.current = pathRef.current
    eventsRef.current = [{ ts: Date.now(), kind: 'nav', label: 'Page de départ', detail: pathRef.current }]
    setEvents(eventsRef.current)
    setLastTrace(null)
    recordingRef.current = true
    setRecording(true)
  }, [])

  const stop = useCallback((): void => {
    recordingRef.current = false
    setRecording(false)
    setLastTrace(eventsRef.current)
    // Retour au centre d'aide d'ou l'enregistrement a ete lance.
    navigate(originRef.current)
  }, [navigate])

  const cancel = useCallback((): void => {
    recordingRef.current = false
    setRecording(false)
    eventsRef.current = []
    setEvents([])
    setLastTrace(null)
  }, [])

  const clearTrace = useCallback((): void => setLastTrace(null), [])

  return (
    <RecorderCtx.Provider value={{ recording, events, lastTrace, start, stop, cancel, clearTrace }}>
      {children}
      <RecordingHud />
    </RecorderCtx.Provider>
  )
}
