import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { useDemoSandbox } from './useDemoSandbox'
import { useDemoLens } from './DemoLensContext'
import { DemoControlPopover } from './DemoControlPopover'
import { DemoDiscovery } from './DemoDiscovery'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../hooks/useToast'

type ConfirmKind = 'regenerate' | 'cleanup' | 'configure'

const CONFIRMS: Record<ConfirmKind, { title: string; message: string; confirmLabel: string; variant: 'default' | 'danger' }> = {
  regenerate: { title: "Régénérer l'espace de démo ?", message: "Les données de démonstration actuelles seront supprimées et remplacées par un nouvel espace d'exemple.", confirmLabel: 'Régénérer', variant: 'default' },
  cleanup: { title: "Supprimer l'espace de démo ?", message: 'Toutes les données de démonstration seront effacées. Vos données réelles ne sont pas touchées. Cette action est irréversible.', confirmLabel: 'Supprimer', variant: 'danger' },
  configure: { title: 'Quitter la démo ?', message: "L'espace de démonstration sera supprimé et vous serez redirigé vers la configuration de votre cabinet.", confirmLabel: 'Quitter et configurer', variant: 'default' },
}

/**
 * Indicateur « Mode démo » — pastille compacte + popover de contrôle (remplace
 * l'ancien bandeau pleine largeur). Un seul montage (AppLayout) couvre toutes les
 * pages. Regroupe la bascule LENTILLE et les actions ; toute action destructrice
 * passe par une confirmation + un toast. Ne rend rien sans bac à sable.
 */
export function DemoModeBanner(): JSX.Element | null {
  const navigate = useNavigate()
  const toast = useToast()
  const { hasDemo, loading, teardown, deleting, seed, seeding } = useDemoSandbox()
  const { lensOn, setLensOn } = useDemoLens()
  const [open, setOpen] = useState(false)
  const [discoverOpen, setDiscoverOpen] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // À la première existence d'une démo (par navigateur), ouvre le parcours de découverte.
  useEffect(() => {
    if (!hasDemo) return
    try {
      if (localStorage.getItem('gestu.demo.discovery.started') === '1') return
      localStorage.setItem('gestu.demo.discovery.started', '1')
      setDiscoverOpen(true)
    } catch { /* localStorage indisponible */ }
  }, [hasDemo])

  if (loading || !hasDemo) return null
  const busy = deleting || seeding

  const regenerate = async (): Promise<void> => {
    const cleared = await teardown()
    if (!cleared) { toast.error('La régénération a échoué. Réessayez.'); return }
    const ok = await seed('prefilled')
    if (ok) { setLensOn(true); toast.success('Espace de démo régénéré') }
    else toast.error('La régénération a échoué. Réessayez.')
  }

  const cleanup = async (then?: () => void): Promise<void> => {
    const ok = await teardown()
    if (ok) { setLensOn(false); toast.success('Espace de démo supprimé', { description: 'Vous êtes de retour sur votre cabinet réel.' }); then?.() }
    else toast.error('La suppression a échoué. Réessayez.')
  }

  const runConfirm = async (): Promise<void> => {
    const kind = confirm
    if (kind === 'regenerate') await regenerate()
    else if (kind === 'cleanup') await cleanup()
    else if (kind === 'configure') await cleanup(() => navigate('/organisation'))
    setConfirm(null)
  }

  const openConfirm = (kind: ConfirmKind): void => { setOpen(false); setConfirm(kind) }

  return (
    <div className="mb-3 flex justify-end">
      <div ref={wrapRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="inline-flex items-center gap-2 rounded-full bg-forest-900 py-1.5 pl-2.5 pr-3 text-[12px] font-semibold text-white shadow-md hover:bg-forest-700"
        >
          <span className="h-[7px] w-[7px] rounded-full bg-gold-500 shadow-[0_0_0_3px_rgba(212,168,67,0.28)]" aria-hidden="true" />
          Mode démo
          <ChevronDown size={13} className={`opacity-70 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <DemoControlPopover
            lensOn={lensOn}
            busy={busy}
            onDiscover={() => { setOpen(false); setDiscoverOpen(true) }}
            onToggleLens={() => setLensOn(!lensOn)}
            onRegenerate={() => openConfirm('regenerate')}
            onConfigure={() => openConfirm('configure')}
            onCleanup={() => openConfirm('cleanup')}
          />
        )}
      </div>

      <DemoDiscovery open={discoverOpen} onClose={() => setDiscoverOpen(false)} />

      {confirm && (
        <ConfirmDialog
          open
          title={CONFIRMS[confirm].title}
          message={CONFIRMS[confirm].message}
          confirmLabel={CONFIRMS[confirm].confirmLabel}
          variant={CONFIRMS[confirm].variant}
          busy={busy}
          onConfirm={() => void runConfirm()}
          onClose={() => { if (!busy) setConfirm(null) }}
        />
      )}
    </div>
  )
}
