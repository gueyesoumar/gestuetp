import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { LoginPage } from '../pages/LoginPage'
import { SetPasswordPage } from '../pages/SetPasswordPage'
import { AccountPage } from '../pages/AccountPage'
import { RegulLayout } from './RegulLayout'
import { RegulDashboard } from './RegulDashboard'
import { RegulMissionsListPage } from './RegulMissionsListPage'
import { RegulMissionCreatePage } from './RegulMissionCreatePage'
import { SubsidiariesPage } from '../features/group-module/SubsidiariesPage'
import { SubsidiaryDetailPage } from '../features/group-module/SubsidiaryDetailPage'
import { MissionDetailPage } from '../pages/MissionDetailPage'

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
        <Route path="compte" element={<AccountPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
