import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useEdition } from '../../features/edition/EditionContext'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppLayout() {
  const { profile } = useAuth()
  const { edition } = useEdition()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isRegul = edition === 'regul'

  return (
    <div className="flex h-screen bg-page-bg">
      <Sidebar
        profile={profile}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          onMenuToggle={() => setSidebarOpen((prev) => !prev)}
        />

        {isRegul && (
          <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-6 py-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-forest-700">Console r&eacute;gulateur</span>
            <span className="text-[12px] text-gray-400">Superviseur de conformit&eacute; cyber</span>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
