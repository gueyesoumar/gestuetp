import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../../lib/supabase'
import type { ActionStatus } from '../../../../types/database.types'

export interface ClientActionItemData {
  id: string
  title: string
  description: string | null
  priority: string
  dueDate: string | null
  status: ActionStatus
  controlCode: string | null
}

interface UseClientActionItemsReturn {
  items: ClientActionItemData[]
  loading: boolean
  updateStatus: (itemId: string, status: ActionStatus) => Promise<boolean>
  updating: boolean
}

export function useClientActionItems(missionId: string): UseClientActionItemsReturn {
  const [items, setItems] = useState<ClientActionItemData[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const fetchData = useCallback(async (signal?: AbortSignal): Promise<void> => {
    setLoading(true)
    try {
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    if (signal?.aborted) return
    if (!token) { setLoading(false); return }

    const baseUrl = import.meta.env.VITE_SUPABASE_URL
    const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY
    const headers = { 'apikey': apikey, 'Authorization': `Bearer ${token}` }

    const res = await fetch(
      `${baseUrl}/rest/v1/client_action_items?mission_id=eq.${missionId}&select=id,title,description,priority,due_date,status,control_id&order=priority,due_date`,
      { headers, signal }
    )
    if (signal?.aborted) return
    if (!res.ok) { setItems([]); setLoading(false); return }
    const data = await res.json() as Record<string, unknown>[]
    if (signal?.aborted) return

    // Fetch control codes
    const controlIds = [...new Set(data.map((d) => d.control_id as string).filter(Boolean))]
    let controlMap: Record<string, string> = {}
    if (controlIds.length > 0) {
      const ctrlRes = await fetch(`${baseUrl}/rest/v1/controls?id=in.(${controlIds.join(',')})&select=id,code`, { headers, signal })
      if (ctrlRes.ok) {
        const controls = await ctrlRes.json() as { id: string; code: string }[]
        controlMap = Object.fromEntries(controls.map((c) => [c.id, c.code]))
      }
    }

    if (signal?.aborted) return
    setItems(data.map((d) => ({
      id: d.id as string,
      title: d.title as string,
      description: (d.description as string) ?? null,
      priority: (d.priority as string) ?? 'medium',
      dueDate: (d.due_date as string) ?? null,
      status: (d.status as ActionStatus) ?? 'open',
      controlCode: controlMap[d.control_id as string] ?? null,
    })))
    setLoading(false)
    } catch {
      // Abort lors d'un démontage/navigation : on ignore (pas une vraie erreur)
      if (signal?.aborted) return
      setItems([])
      setLoading(false)
    }
  }, [missionId])

  useEffect(() => {
    const ac = new AbortController()
    void fetchData(ac.signal)
    return () => ac.abort()
  }, [fetchData])

  const updateStatus = useCallback(async (itemId: string, status: ActionStatus): Promise<boolean> => {
    setUpdating(true)
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    if (!token) { setUpdating(false); return false }

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/client_action_items?id=eq.${itemId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ status }),
    })

    setUpdating(false)
    if (res.ok) { fetchData(); return true }
    return false
  }, [fetchData])

  return { items, loading, updateStatus, updating }
}
