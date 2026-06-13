import { createContext, useContext, useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
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

export function RecorderProvider({ children }: { children: ReactNode }): JSX.Element {
  const [recording, setRecording] = useState(false)
  const [events, setEvents] = useState<RecordedEvent[]>([])
  const [lastTrace, setLastTrace] = useState<RecordedEvent[] | null>(null)
  const eventsRef = useRef<RecordedEvent[]>([])
  const recordingRef = useRef(false)
  const location = useLocation()
  const pathRef = useRef(location.pathname)

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
      const el = (target?.closest('button, a, [role="button"], [role="tab"], [role="menuitem"]') as HTMLElement | null) ?? target
      if (!el) return
      const label = (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 60)
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
  }, [])

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
