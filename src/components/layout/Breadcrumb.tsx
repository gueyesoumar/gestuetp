import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const routeLabels: Record<string, string> = {
  '': 'Tableau de bord',
  'profil': 'Mon profil',
  'notifications': 'Notifications',
  'organisation': 'Organisation',
  'membres': 'Membres',
  'clients': 'Clients',
  'nouveau': 'Nouveau client',
  'nouvelle': 'Nouvelle mission',
  'referentiels': 'R\u00e9f\u00e9rentiels',
  'comparer': 'Comparer',
  'missions': 'Missions',
}

// Routes parentes qui ont des enfants dynamiques (UUID ou slug)
const dynamicParents = ['missions', 'clients', 'referentiels']

function isUuidOrSlug(segment: string): boolean {
  return !routeLabels[segment]
}

export function Breadcrumb() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)
  const [dynamicLabels, setDynamicLabels] = useState<Record<string, string>>({})

  useEffect(() => {
    const toResolve: { parent: string; id: string }[] = []

    segments.forEach((segment, idx) => {
      if (idx > 0 && isUuidOrSlug(segment) && dynamicParents.includes(segments[idx - 1])) {
        toResolve.push({ parent: segments[idx - 1], id: segment })
      }
    })

    if (toResolve.length === 0) return

    const abortController = new AbortController()

    const resolve = async () => {
      const labels: Record<string, string> = {}

      for (const { parent, id } of toResolve) {
        if (parent === 'missions') {
          const { data } = await supabase
            .from('missions')
            .select('name')
            .eq('id', id)
            .abortSignal(abortController.signal)
            .single()
          if (data) labels[id] = data.name
        } else if (parent === 'clients') {
          const { data } = await supabase
            .from('cabinet_clients')
            .select('client_name')
            .eq('id', id)
            .abortSignal(abortController.signal)
            .single()
          if (data) labels[id] = data.client_name
        } else if (parent === 'referentiels') {
          const { data } = await supabase
            .from('frameworks')
            .select('name')
            .eq('slug', id)
            .abortSignal(abortController.signal)
            .single()
          if (data) labels[id] = data.name
        }
      }

      if (!abortController.signal.aborted) {
        setDynamicLabels(labels)
      }
    }

    resolve()
    return () => abortController.abort()
  }, [location.pathname])

  if (segments.length === 0) {
    return (
      <nav className="flex items-center text-[13px]">
        <span className="font-semibold text-gray-900">Tableau de bord</span>
      </nav>
    )
  }

  return (
    <nav className="flex items-center gap-1.5 text-[13px]">
      {segments.map((segment, idx) => {
        const isLast = idx === segments.length - 1
        const path = '/' + segments.slice(0, idx + 1).join('/')
        const label = routeLabels[segment] ?? dynamicLabels[segment] ?? segment

        if (isLast) {
          return (
            <span key={path} className="font-semibold text-gray-900 truncate max-w-[220px]">
              {label}
            </span>
          )
        }

        return (
          <span key={path} className="flex items-center gap-1.5">
            <Link to={path} className="text-gray-400 hover:text-forest-700 transition-colors truncate max-w-[160px]">
              {label}
            </Link>
            <span className="text-gray-300">/</span>
          </span>
        )
      })}
    </nav>
  )
}
