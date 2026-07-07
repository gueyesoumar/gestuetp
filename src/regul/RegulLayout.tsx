import { Outlet } from 'react-router-dom'
import { RegulSidebar } from './RegulSidebar'

/** Coquille de l'application Gëstu Regul — distincte de l'app Comply. */
export function RegulLayout(): JSX.Element {
  return (
    <div className="flex h-screen bg-page-bg">
      <RegulSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-6 py-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-forest-700">Console régulateur</span>
          <span className="text-[12px] text-gray-400">Superviseur de conformité cyber</span>
        </div>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
