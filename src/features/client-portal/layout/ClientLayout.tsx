import { Outlet } from 'react-router-dom'
import { ClientSidebar } from './ClientSidebar'
import { CrossCabinetBanner } from '../../branding/CrossCabinetBanner'

export function ClientLayout(): JSX.Element {
  return (
    <div className="flex h-screen bg-page-bg">
      <ClientSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <CrossCabinetBanner />
        <main className="flex-1 overflow-y-auto p-6 lg:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
