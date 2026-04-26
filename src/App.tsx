import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './features/auth/AuthContext'
import { BrandingProvider } from './features/branding/BrandingContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ClientProtectedRoute } from './components/ClientProtectedRoute'
import { AdminProtectedRoute } from './components/AdminProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import { ClientLayout } from './features/client-portal/layout/ClientLayout'
import { LoginPage } from './pages/LoginPage'
import { HubPage } from './pages/HubPage'
import { DashboardPage } from './pages/DashboardPage'
import { OrganizationPage } from './pages/OrganizationPage'
import { MembersPage } from './pages/MembersPage'
import { FrameworksPage } from './pages/FrameworksPage'
import { FrameworkDetailPage } from './pages/FrameworkDetailPage'
import { FrameworkComparisonPage } from './pages/FrameworkComparisonPage'
import { MissionsListPage } from './pages/MissionsListPage'
import { MissionCreatePage } from './pages/MissionCreatePage'
import { MissionDetailPage } from './pages/MissionDetailPage'
import { ClientsListPage } from './pages/ClientsListPage'
import { ClientCreatePage } from './pages/ClientCreatePage'
import { ClientDetailPage } from './pages/ClientDetailPage'
import { ProfilePage } from './pages/ProfilePage'
import { NotificationsPage } from './pages/NotificationsPage'
import { QuestionnaireClientPage } from './pages/QuestionnaireClientPage'
import { ClientDashboardPage } from './features/client-portal/dashboard/ClientDashboardPage'
import { ClientMissionsPage } from './features/client-portal/missions/ClientMissionsPage'
import { ClientMissionDetailPage } from './features/client-portal/missions/ClientMissionDetailPage'
import { ClientDocumentsPage } from './features/client-portal/ClientDocumentsPage'
import { ClientNotificationsPage } from './features/client-portal/ClientNotificationsPage'
import { SetPasswordPage } from './pages/SetPasswordPage'
import { UnsubscribePage } from './pages/UnsubscribePage'
import { AdminLayout } from './features/admin/AdminLayout'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { CabinetsListPage } from './pages/admin/CabinetsListPage'
import { CabinetDetailPage } from './pages/admin/CabinetDetailPage'
import { UsersSearchPage } from './pages/admin/UsersSearchPage'
import { UserDetailPage } from './pages/admin/UserDetailPage'
import { AdminAuditLogPage } from './pages/admin/AdminAuditLogPage'
import { FeatureFlagsPage } from './pages/admin/FeatureFlagsPage'
import { MonitoringPage } from './pages/admin/MonitoringPage'
import { FrameworksAdminListPage } from './pages/admin/FrameworksAdminListPage'
import { AdminFrameworkCreatePage } from './pages/admin/AdminFrameworkCreatePage'
import { AdminFrameworkDetailPage } from './pages/admin/AdminFrameworkDetailPage'
import { SupervisionPage } from './pages/SupervisionPage'
import { EntityDetailPage } from './pages/EntityDetailPage'
import { CampaignDetailPage } from './pages/CampaignDetailPage'

function App() {
  return (
    <BrowserRouter>
      <BrandingProvider>
      <AuthProvider>
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          expand={false}
          toastOptions={{
            classNames: {
              toast: 'gestu-toast',
              title: 'gestu-toast-title',
              description: 'gestu-toast-desc',
              actionButton: 'gestu-toast-action',
            },
          }}
        />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/set-password" element={<SetPasswordPage />} />
          <Route path="/unsubscribe" element={<UnsubscribePage />} />

          {/* Hub — product selection (auditors only) */}
          <Route
            path="/hub"
            element={
              <ProtectedRoute>
                <HubPage />
              </ProtectedRoute>
            }
          />

          {/* Auditor routes (Comply product) */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="profil" element={<ProfilePage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="organisation" element={<OrganizationPage />} />
            <Route path="membres" element={<MembersPage />} />
            <Route path="referentiels" element={<FrameworksPage />} />
            <Route path="referentiels/comparer" element={<FrameworkComparisonPage />} />
            <Route path="referentiels/:slug" element={<FrameworkDetailPage />} />
            <Route path="supervision" element={<SupervisionPage />} />
            <Route path="supervision/entites/:id" element={<EntityDetailPage />} />
            <Route path="supervision/campagnes/:id" element={<CampaignDetailPage />} />
            <Route path="clients" element={<ClientsListPage />} />
            <Route path="clients/nouveau" element={<ClientCreatePage />} />
            <Route path="clients/:id" element={<ClientDetailPage />} />
            <Route path="missions" element={<MissionsListPage />} />
            <Route path="missions/nouvelle" element={<MissionCreatePage />} />
            <Route path="missions/:id" element={<MissionDetailPage />} />
            <Route path="questionnaire/:id" element={<QuestionnaireClientPage />} />
          </Route>

          {/* Super-admin routes (Gëstu platform owner) */}
          <Route
            path="/admin"
            element={
              <AdminProtectedRoute>
                <AdminLayout />
              </AdminProtectedRoute>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="cabinets" element={<CabinetsListPage />} />
            <Route path="cabinets/:id" element={<CabinetDetailPage />} />
            <Route path="utilisateurs" element={<UsersSearchPage />} />
            <Route path="utilisateurs/:id" element={<UserDetailPage />} />
            <Route path="feature-flags" element={<FeatureFlagsPage />} />
            <Route path="monitoring" element={<MonitoringPage />} />
            <Route path="frameworks" element={<FrameworksAdminListPage />} />
            <Route path="frameworks/nouveau" element={<AdminFrameworkCreatePage />} />
            <Route path="frameworks/:slug" element={<AdminFrameworkDetailPage />} />
            <Route path="audit-log" element={<AdminAuditLogPage />} />
          </Route>

          {/* Client portal routes */}
          <Route
            path="/client"
            element={
              <ClientProtectedRoute>
                <ClientLayout />
              </ClientProtectedRoute>
            }
          >
            <Route index element={<ClientDashboardPage />} />
            <Route path="missions" element={<ClientMissionsPage />} />
            <Route path="missions/:id" element={<ClientMissionDetailPage />} />
            <Route path="documents" element={<ClientDocumentsPage />} />
            <Route path="notifications" element={<ClientNotificationsPage />} />
          </Route>
        </Routes>
      </AuthProvider>
      </BrandingProvider>
    </BrowserRouter>
  )
}

export default App
