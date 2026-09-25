import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import './driver-theme.css'
import { TOUR_DEFS } from './tourDefs'

// Moteur de tours guidés (RFC 0011, Lot 3). Écoute l'événement `onboarding:tour`
// (émis par launchTour depuis le widget) et déroule le tour driver.js correspondant.
// Si le tour cible une autre page, on navigue puis on attend le montage avant d'ancrer.
export function OnboardingTours(): null {
  const navigate = useNavigate()
  const location = useLocation()
  const pathRef = useRef(location.pathname)
  pathRef.current = location.pathname

  useEffect(() => {
    const onTour = (e: Event): void => {
      const id = (e as CustomEvent<string>).detail
      const def = TOUR_DEFS[id]
      if (!def) return

      const run = (): void => {
        // Fond assombri teinté avec la couleur de marque (surchargée par la marque blanche).
        const overlayColor = getComputedStyle(document.documentElement).getPropertyValue('--color-forest-900').trim() || '#12241C'
        const d = driver({
          showProgress: def.steps.length > 1,
          progressText: '{{current}} sur {{total}}',
          allowClose: true,
          overlayColor,
          overlayOpacity: 0.6,
          stagePadding: 6,
          stageRadius: 10,
          nextBtnText: 'Suivant',
          prevBtnText: 'Précédent',
          doneBtnText: 'Terminer',
          popoverClass: 'gestu-tour',
          steps: def.steps.map((s) => ({ element: s.element, popover: s.popover })),
        })
        d.drive()
      }

      if (def.route && pathRef.current !== def.route) {
        navigate(def.route)
        window.setTimeout(run, 450) // laisser la page cible se monter avant l'ancrage
      } else {
        run()
      }
    }

    window.addEventListener('onboarding:tour', onTour as EventListener)
    return () => window.removeEventListener('onboarding:tour', onTour as EventListener)
  }, [navigate])

  return null
}
