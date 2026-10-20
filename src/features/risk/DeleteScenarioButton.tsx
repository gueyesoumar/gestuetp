import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'

interface Props {
  title: string
  onConfirm: () => void | Promise<void>
}

/** Suppression d'un scénario avec confirmation (ConfirmDialog, action irréversible). */
export function DeleteScenarioButton({ title, onConfirm }: Props): JSX.Element {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const confirm = async (): Promise<void> => {
    setBusy(true)
    try {
      await onConfirm()
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-gray-400 hover:text-red-600" aria-label="Supprimer"><Trash2 size={14} /></button>
      <ConfirmDialog
        open={open}
        variant="danger"
        title="Supprimer ce scénario ?"
        message={<>Le scénario <b>{title}</b> et son analyse seront définitivement supprimés. Cette action est irréversible.</>}
        confirmLabel="Supprimer"
        busy={busy}
        onConfirm={() => void confirm()}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
