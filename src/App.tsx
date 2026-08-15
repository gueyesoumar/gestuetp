import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './features/auth/AuthContext'
import { EditionProvider, useEdition } from './features/edition/EditionContext'
import { MfaGate } from './features/auth/mfa/MfaGate'
import { BrandingProvider } from './features/branding/BrandingContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ClientProtectedRoute } from './components/ClientProtectedRoute'
import { AdminProtectedRoute } from './components/AdminProtectedRoute'
import { OrgAdminRoute } from './components/OrgAdminRoute'
import { AuditTrailPage } from './features/audit/AuditTrailPage'
import { RiskPage } from './features/risk/RiskPage'
import { RiskRegisterPage } from './features/risk/RiskRegisterPage'
import { PolicyBoardPage } from './features/policy/PolicyBoardPage'
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
import { NotificationsPage } from './pages/NotificationsPage'
import { SupportCenterPage } from './pages/SupportCenterPage'
import { CabinetSupportPage } from './pages/CabinetSupportPage'
import { QuestionnaireClientPage } from './pages/QuestionnaireClientPage'
import { ClientDashboardPage } from './features/client-portal/dashboard/ClientDashboardPage'
import { ClientMissionsPage } from './features/client-portal/missions/ClientMissionsPage'
import { ClientMissionDetailPage } from './features/client-portal/missions/ClientMissionDetailPage'
import { ClientDocumentsPage } from './features/client-portal/ClientDocumentsPage'
import { ClientSupportCenterPage } from './features/client-portal/ClientSupportCenterPage'
import { RecorderProvider } from './features/support/recorder/RecorderContext'
import { ClientNotificationsPage } from './features/client-portal/ClientNotificationsPage'
import { SetPasswordPage } from './pages/SetPasswordPage'
import { UnsubscribePage } from './pages/UnsubscribePage'
import { AccountPage } from './pages/AccountPage'
import { AdminLayout } from './features/admin/AdminLayout'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { CabinetsListPage } from './pages/admin/CabinetsListPage'
import { CabinetDetailPage } from './pages/admin/CabinetDetailPage'
import { UsersSearchPage } from './pages/admin/UsersSearchPage'
import { UserDetailPage } from './pages/admin/UserDetailPage'
import { AdminAuditLogPage } from './pages/admin/AdminAuditLogPage'
import { AdminPlansPage } from './pages/admin/AdminPlansPage'
import { MonitoringPage } from './pages/admin/MonitoringPage'
import { AdminSupportPage } from './pages/admin/AdminSupportPage'
import { FrameworksAdminListPage } from './pages/admin/FrameworksAdminListPage'
import { AdminFrameworkCreatePage } from './pages/admin/AdminFrameworkCreatePage'
import { AdminFrameworkDetailPage } from './pages/admin/AdminFrameworkDetailPage'
import { SupervisionPage } from './pages/SupervisionPage'
import { EntityDetailPage } from './pages/EntityDetailPage'
import { CampaignDetailPage } from './pages/CampaignDetailPage'
import { SubsidiariesPage } from './features/group-module/SubsidiariesPage'
import { SubsidiaryDetailPage } from './features/group-module/SubsidiaryDetailPage'
import { ContinuousReviewsPage } from './features/group-module/ContinuousReviewsPage'
import { TransversalPlansPage } from './features/group-module/TransversalPlansPage'
// Pages Regul — montées sous le shell unifié quand l'édition résolue est « regul ».
import { RegulDashboard } from './regul/RegulDashboard'
import { RegulMissionsListPage } from './regul/RegulMissionsListPage'
import { RegulMissionCreatePage } from './regul/RegulMissionCreatePage'
import { RegulMeasuresPage } from './regul/RegulMeasuresPage'
import { RegulReferentielsPage } from './regul/RegulReferentielsPage'
import { RegulIncidentsPage } from './regul/incidents/RegulIncidentsPage'
import { AssujettiIncidentsPage } from './regul/incidents/AssujettiIncidentsPage'

// Arbre de routes UNIFIÉ du shell ETP (RFC 0001 §5-6 ; RFC 0002 P2). Les CAPACITÉS
// de l'org (résolues au runtime) choisissent les routes-modules montées sous le même
// AppLayout : Comply (clients/missions/supervision) ou Regul (assujettis/contrôles/
// constats/incidents). Plus de fork d'application séparée (RegulApp supprimé) ni de
// branchement sur l'édition ; le chrome (Hub, compte, notifications, admin, portail)
// est partagé. Pré-auth : capacités vides → Comply (comme le déploiement principal).
function AppRoutes(): JSX.Element {
  const { hasCapability } = useEdition()
  const isRegul = hasCapability('supervision')
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/set-password" element={<SetPasswordPage />} />
      <Route path="/unsubscribe" element={<UnsubscribePage />} />

      {/* Hub — entrée unique pour tout le staff (RFC §5-6) */}
      <Route path="/hub" element={<ProtectedRoute><HubPage /></ProtectedRoute>} />

      {/* Compte — page profil dédiée, partagée (hors chrome) */}
      <Route path="/compte" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />

      {/* Routes-modules sous le shell unifié — l'édition résolue choisit le jeu monté */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={isRegul ? <RegulDashboard /> : <DashboardPage />} />
        <Route path="profil" element={<Navigate to="/compte" replace />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="organisation" element={<OrganizationPage />} />
        <Route path="membres" element={<MembersPage />} />
        <Route path="piste-audit" element={<OrgAdminRoute><AuditTrailPage /></OrgAdminRoute>} />
        <Route path="risque" element={hasCapability('risk') ? <RiskPage /> : <Navigate to="/" replace />} />
        <Route path="risque/registre" element={hasCapability('risk') ? <RiskRegisterPage /> : <Navigate to="/" replace />} />
        <Route path="politiques" element={hasCapability('policy') ? <PolicyBoardPage /> : <Navigate to="/" replace />} />
        <Route path="aide" element={<SupportCenterPage />} />
        {isRegul ? (
          <>
            <Route path="referentiels" element={<RegulReferentielsPage />} />
            <Route path="assujettis" element={<SubsidiariesPage />} />
            <Route path="assujettis/:id" element={<SubsidiaryDetailPage />} />
            <Route path="controles" element={<RegulMissionsListPage />} />
            <Route path="controles/nouvelle" element={<RegulMissionCreatePage />} />
            <Route path="controles/:id" element={<MissionDetailPage />} />
            <Route path="constats" element={<RegulMeasuresPage />} />
            <Route path="incidents" element={<RegulIncidentsPage />} />
          </>
        ) : (
          <>
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
            <Route path="demandes-support" element={<CabinetSupportPage />} />
            {/* Module Groupe */}
            <Route path="filiales" element={<SubsidiariesPage />} />
            <Route path="filiales/:id" element={<SubsidiaryDetailPage />} />
            <Route path="revues" element={<ContinuousReviewsPage />} />
            <Route path="plans-transverses" element={<TransversalPlansPage />} />
          </>
        )}
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
        <Route path="plans" element={<AdminPlansPage />} />
        <Route path="monitoring" element={<MonitoringPage />} />
        <Route path="support" element={<AdminSupportPage />} />
        <Route path="frameworks" element={<FrameworksAdminListPage />} />
        <Route path="frameworks/nouveau" element={<AdminFrameworkCreatePage />} />
        <Route path="frameworks/:slug" element={<AdminFrameworkDetailPage />} />
        <Route path="audit-log" element={<AdminAuditLogPage />} />
      </Route>

      {/* Portail client / assujetti — cloisonné (RLS cp_*) */}
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
        {isRegul && <Route path="incidents" element={<AssujettiIncidentsPage />} />}
        <Route path="documents" element={<ClientDocumentsPage />} />
        <Route path="notifications" element={<ClientNotificationsPage />} />
        <Route path="aide" element={<ClientSupportCenterPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

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
        <EditionProvider>
        <RecorderProvider>
        <MfaGate>
        <AppRoutes />
        </MfaGate>
        </RecorderProvider>
        </EditionProvider>
      </AuthProvider>
      </BrandingProvider>
    </BrowserRouter>
  )
}

export default App
