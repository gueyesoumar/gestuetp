import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { DashboardView, PlatformRolePermissions } from '../../types/database.types'

const ALL_VIEWS: DashboardView[] = ['executive', 'pilotage', 'operationnel']
const DEFAULT_VIEW: DashboardView = 'operationnel'

interface UseDashboardViewsResult {
  allowedViews: DashboardView[]
  defaultView: DashboardView
  loading: boolean
}

export function useDashboardViews(): UseDashboardViewsResult {
  const { profile } = useAuth()
  const [allowedViews, setAllowedViews] = useState<DashboardView[]>(ALL_VIEWS)
  const [defaultView, setDefaultView] = useState<DashboardView>(DEFAULT_VIEW)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) {
      setLoading(false)
      return
    }

    const abortController = new AbortController()

    supabase
      .from('user_platform_roles')
      .select('platform_roles(permissions)')
      .eq('user_id', profile.id)
      .abortSignal(abortController.signal)
      .then(({ data, error }) => {
        if (abortController.signal.aborted) return
        if (error) {
          console.warn('useDashboardViews:', error.message)
          setLoading(false)
          return
        }

        // Merge views from all roles the user has
        const viewsSet = new Set<DashboardView>()
        let resolvedDefault: DashboardView | null = null

        type Row = { platform_roles: { permissions: PlatformRolePermissions } | null }
        for (const row of (data ?? []) as unknown as Row[]) {
          const role = row.platform_roles
          if (!role?.permissions) continue

          const views = role.permissions.dashboard_views
          if (views && views.length > 0) {
            for (const v of views) viewsSet.add(v)
            if (!resolvedDefault && role.permissions.default_dashboard_view) {
              resolvedDefault = role.permissions.default_dashboard_view
            }
          }
        }

        if (viewsSet.size > 0) {
          // Sort in canonical order
          const sorted = ALL_VIEWS.filter((v) => viewsSet.has(v))
          setAllowedViews(sorted)
          setDefaultView(resolvedDefault && viewsSet.has(resolvedDefault) ? resolvedDefault : sorted[0])
        } else {
          // No dashboard_views configured — allow all (backward compat)
          setAllowedViews(ALL_VIEWS)
          setDefaultView(DEFAULT_VIEW)
        }

        setLoading(false)
      })

    return () => abortController.abort()
  }, [profile?.id])

  return { allowedViews, defaultView, loading }
}
