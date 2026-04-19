import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { CabinetDashboard } from '../features/dashboard/CabinetDashboard'
import { GroupeDashboard } from '../features/dashboard/GroupeDashboard'

type DashboardView = 'cabinet' | 'groupe'

export function DashboardPage() {
  const { profile } = useAuth()
  const [view, setView] = useState<DashboardView>('cabinet')
  const [hasGroupeRole, setHasGroupeRole] = useState(false)

  useEffect(() => {
    if (!profile?.organization_id) return
    const abortController = new AbortController()

    supabase
      .from('organizations')
      .select('types')
      .eq('id', profile.organization_id)
      .single()
      .abortSignal(abortController.signal)
      .then(({ data }) => {
        if (abortController.signal.aborted) return
        if (data?.types && (data.types as string[]).includes('groupe')) {
          setHasGroupeRole(true)
        }
      })

    return () => abortController.abort()
  }, [profile?.organization_id])

  return (
    <div>
      {hasGroupeRole && (
        <div className="flex justify-end mb-4">
          <div className="inline-flex bg-white border border-gray-200 rounded-[10px] p-[3px] gap-[2px]">
            <button
              onClick={() => setView('cabinet')}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                view === 'cabinet'
                  ? 'bg-forest-700 text-white font-semibold'
                  : 'text-gray-500 hover:bg-forest-50 hover:text-forest-700'
              }`}
            >
              Cabinet
            </button>
            <button
              onClick={() => setView('groupe')}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                view === 'groupe'
                  ? 'bg-forest-700 text-white font-semibold'
                  : 'text-gray-500 hover:bg-forest-50 hover:text-forest-700'
              }`}
            >
              Groupe
            </button>
          </div>
        </div>
      )}

      {view === 'cabinet' ? <CabinetDashboard /> : <GroupeDashboard />}
    </div>
  )
}
