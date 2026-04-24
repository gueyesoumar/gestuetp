import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './features/auth/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ClientProtectedRoute } from './components/ClientProtectedRoute'
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
import { SupervisionPage } from './pages/SupervisionPage'
import { EntityDetailPage } from './pages/EntityDetailPage'
import { CampaignDetailPage } from './pages/CampaignDetailPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/set-password" element={<SetPasswordPage />} />

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
    </BrowserRouter>
  )
}

export default App
