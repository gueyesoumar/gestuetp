import { Outlet } from 'react-router-dom'
import { ClientSidebar } from './ClientSidebar'

export function ClientLayout(): JSX.Element {
  return (
    <div className="flex h-screen bg-page-bg">
      <ClientSidebar />
      <main className="flex-1 overflow-y-auto p-6 lg:p-7">
        <Outlet />
      </main>
    </div>
  )
}
