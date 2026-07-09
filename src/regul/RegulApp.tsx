import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { ClientProtectedRoute } from '../components/ClientProtectedRoute'
import { LoginPage } from '../pages/LoginPage'
import { SetPasswordPage } from '../pages/SetPasswordPage'
import { AccountPage } from '../pages/AccountPage'
import { RegulLayout } from './RegulLayout'
import { RegulDashboard } from './RegulDashboard'
import { RegulMissionsListPage } from './RegulMissionsListPage'
import { RegulMissionCreatePage } from './RegulMissionCreatePage'
import { RegulMeasuresPage } from './RegulMeasuresPage'
import { RegulReferentielsPage } from './RegulReferentielsPage'
import { RegulIncidentsPage } from './incidents/RegulIncidentsPage'
import { SubsidiariesPage } from '../features/group-module/SubsidiariesPage'
import { SubsidiaryDetailPage } from '../features/group-module/SubsidiaryDetailPage'
import { MissionDetailPage } from '../pages/MissionDetailPage'
import { ClientLayout } from '../features/client-portal/layout/ClientLayout'
import { ClientDashboardPage } from '../features/client-portal/dashboard/ClientDashboardPage'
import { ClientMissionsPage } from '../features/client-portal/missions/ClientMissionsPage'
import { ClientMissionDetailPage } from '../features/client-portal/missions/ClientMissionDetailPage'
import { ClientDocumentsPage } from '../features/client-portal/ClientDocumentsPage'
import { ClientNotificationsPage } from '../features/client-portal/ClientNotificationsPage'
import { ClientSupportCenterPage } from '../features/client-portal/ClientSupportCenterPage'

/**
 * Application Gëstu Regul — produit à part entière (montée quand
 * VITE_PRODUCT=regul). Réutilise le moteur partagé (gestion d'entités, auth)
 * sous une coquille et une architecture de navigation propres au régulateur.
 * Comply n'est jamais rendu ici.
 */
export function RegulApp(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/set-password" element={<SetPasswordPage />} />

      <Route
        element={
          <ProtectedRoute>
            <RegulLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<RegulDashboard />} />
        <Route path="assujettis" element={<SubsidiariesPage />} />
        <Route path="assujettis/:id" element={<SubsidiaryDetailPage />} />
        <Route path="controles" element={<RegulMissionsListPage />} />
        <Route path="controles/nouvelle" element={<RegulMissionCreatePage />} />
        <Route path="controles/:id" element={<MissionDetailPage />} />
        <Route path="constats" element={<RegulMeasuresPage />} />
        <Route path="incidents" element={<RegulIncidentsPage />} />
        <Route path="referentiels" element={<RegulReferentielsPage />} />
        <Route path="compte" element={<AccountPage />} />
      </Route>

      {/* Portail assujetti — espace strictement cloisonné (M7). Réutilise le
          portail client et le moteur RLS cp_* partagés ; un assujetti (role=client)
          ne voit que ses propres missions/constats/mesures via client_mission_access. */}
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
        <Route path="aide" element={<ClientSupportCenterPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
