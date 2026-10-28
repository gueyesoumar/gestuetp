import { lazy, Suspense, type ComponentType } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './features/auth/AuthContext'
import { EditionProvider, useEdition } from './features/edition/EditionContext'
import { APP_MODULES } from './features/edition/moduleRegistry'
import { riskOverviewEnabled } from './features/risk/riskOverviewFlag'
import { MfaGate } from './features/auth/mfa/MfaGate'
import { PasswordExpiryGate } from './features/auth/PasswordExpiryGate'
import { OnboardingWelcome } from './features/onboarding/OnboardingWelcome'
import { BrandingProvider } from './features/branding/BrandingContext'
import { DemoLensProvider } from './features/demo/DemoLensContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { FullscreenLoader } from './components/FullscreenLoader'
import { TenantAccessGuard } from './components/TenantAccessGuard'
import { ClientProtectedRoute } from './components/ClientProtectedRoute'
import { AdminProtectedRoute } from './components/AdminProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import { ClientLayout } from './features/client-portal/layout/ClientLayout'
import { AdminLayout } from './features/admin/AdminLayout'
import { RecorderProvider } from './features/support/recorder/RecorderContext'
import { LoginPage } from './pages/LoginPage'

// Code-splitting (P1 perf) : chaque PAGE est chargee en chunk separe a la demande,
// pour que le bundle initial ne contienne que le shell (providers, guards, layouts)
// et la page courante. Les pages exposent un export NOMME -> helper qui l'adapte en
// export default attendu par React.lazy. LoginPage reste statique (premier rendu).
function lazyPage(loader: () => Promise<Record<string, unknown>>, name: string) {
  return lazy(async () => ({ default: (await loader())[name] as ComponentType }))
}

const RiskPage = lazyPage(() => import('./features/risk/RiskPage'), 'RiskPage')
const RiskRegisterPage = lazyPage(() => import('./features/risk/RiskRegisterPage'), 'RiskRegisterPage')
const RiskCriteriaPage = lazyPage(() => import('./features/risk/RiskCriteriaPage'), 'RiskCriteriaPage')
const RiskPlanPage = lazyPage(() => import('./features/risk/RiskPlanPage'), 'RiskPlanPage')
const RiskAcceptancesPage = lazyPage(() => import('./features/risk/RiskAcceptancesPage'), 'RiskAcceptancesPage')
const RiskReviewPage = lazyPage(() => import('./features/risk/RiskReviewPage'), 'RiskReviewPage')
const RiskSimulatorPage = lazyPage(() => import('./features/risk/RiskSimulatorPage'), 'RiskSimulatorPage')
const RiskPortfolioPage = lazyPage(() => import('./features/risk/RiskPortfolioPage'), 'RiskPortfolioPage')
const RiskExecutivePage = lazyPage(() => import('./features/risk/RiskExecutivePage'), 'RiskExecutivePage')
const VendorRegisterPage = lazyPage(() => import('./features/vendor/VendorRegisterPage'), 'VendorRegisterPage')
const SupervisionAssignmentsPage = lazyPage(() => import('./features/risk/SupervisionAssignmentsPage'), 'SupervisionAssignmentsPage')
const ScenarioTemplatesPage = lazyPage(() => import('./features/risk/ScenarioTemplatesPage'), 'ScenarioTemplatesPage')
const SectorsSettingsPage = lazyPage(() => import('./features/sectors/SectorsSettingsPage'), 'SectorsSettingsPage')
const PolicyBoardPage = lazyPage(() => import('./features/policy/PolicyBoardPage'), 'PolicyBoardPage')
const PolicyCoveragePage = lazyPage(() => import('./features/policy/PolicyCoveragePage'), 'PolicyCoveragePage')
const HubPage = lazyPage(() => import('./pages/HubPage'), 'HubPage')
const DashboardPage = lazyPage(() => import('./pages/DashboardPage'), 'DashboardPage')
const ContinuousCompliancePage = lazyPage(() => import('./pages/ContinuousCompliancePage'), 'ContinuousCompliancePage')
const OrganizationPage = lazyPage(() => import('./pages/OrganizationPage'), 'OrganizationPage')
const FrameworksPage = lazyPage(() => import('./pages/FrameworksPage'), 'FrameworksPage')
const FrameworkDetailPage = lazyPage(() => import('./pages/FrameworkDetailPage'), 'FrameworkDetailPage')
const FrameworkComparisonPage = lazyPage(() => import('./pages/FrameworkComparisonPage'), 'FrameworkComparisonPage')
const MissionsListPage = lazyPage(() => import('./pages/MissionsListPage'), 'MissionsListPage')
const MissionCreatePage = lazyPage(() => import('./pages/MissionCreatePage'), 'MissionCreatePage')
const MissionDetailPage = lazyPage(() => import('./pages/MissionDetailPage'), 'MissionDetailPage')
const ClientsListPage = lazyPage(() => import('./pages/ClientsListPage'), 'ClientsListPage')
const ClientCreatePage = lazyPage(() => import('./pages/ClientCreatePage'), 'ClientCreatePage')
const ClientDetailPage = lazyPage(() => import('./pages/ClientDetailPage'), 'ClientDetailPage')
const NotificationsPage = lazyPage(() => import('./pages/NotificationsPage'), 'NotificationsPage')
const SupportCenterPage = lazyPage(() => import('./pages/SupportCenterPage'), 'SupportCenterPage')
const CabinetSupportPage = lazyPage(() => import('./pages/CabinetSupportPage'), 'CabinetSupportPage')
const QuestionnaireClientPage = lazyPage(() => import('./pages/QuestionnaireClientPage'), 'QuestionnaireClientPage')
const ClientDashboardPage = lazyPage(() => import('./features/client-portal/dashboard/ClientDashboardPage'), 'ClientDashboardPage')
const ClientMissionsPage = lazyPage(() => import('./features/client-portal/missions/ClientMissionsPage'), 'ClientMissionsPage')
const ClientMissionDetailPage = lazyPage(() => import('./features/client-portal/missions/ClientMissionDetailPage'), 'ClientMissionDetailPage')
const ClientDocumentsPage = lazyPage(() => import('./features/client-portal/ClientDocumentsPage'), 'ClientDocumentsPage')
const ClientDirectivesPage = lazyPage(() => import('./features/client-portal/directives/ClientDirectivesPage'), 'ClientDirectivesPage')
const ClientVendorAssessmentsPage = lazyPage(() => import('./features/client-portal/vendor/ClientVendorAssessmentsPage'), 'ClientVendorAssessmentsPage')
const ClientSupportCenterPage = lazyPage(() => import('./features/client-portal/ClientSupportCenterPage'), 'ClientSupportCenterPage')
const ClientNotificationsPage = lazyPage(() => import('./features/client-portal/ClientNotificationsPage'), 'ClientNotificationsPage')
const SetPasswordPage = lazyPage(() => import('./pages/SetPasswordPage'), 'SetPasswordPage')
const UnsubscribePage = lazyPage(() => import('./pages/UnsubscribePage'), 'UnsubscribePage')
const AccountPage = lazyPage(() => import('./pages/AccountPage'), 'AccountPage')
const AdminDashboardPage = lazyPage(() => import('./pages/admin/AdminDashboardPage'), 'AdminDashboardPage')
const CabinetsListPage = lazyPage(() => import('./pages/admin/CabinetsListPage'), 'CabinetsListPage')
const CabinetDetailPage = lazyPage(() => import('./pages/admin/CabinetDetailPage'), 'CabinetDetailPage')
const UsersSearchPage = lazyPage(() => import('./pages/admin/UsersSearchPage'), 'UsersSearchPage')
const UserDetailPage = lazyPage(() => import('./pages/admin/UserDetailPage'), 'UserDetailPage')
const AdminAuditLogPage = lazyPage(() => import('./pages/admin/AdminAuditLogPage'), 'AdminAuditLogPage')
const AdminPlansPage = lazyPage(() => import('./pages/admin/AdminPlansPage'), 'AdminPlansPage')
const MonitoringPage = lazyPage(() => import('./pages/admin/MonitoringPage'), 'MonitoringPage')
const AdminSupportPage = lazyPage(() => import('./pages/admin/AdminSupportPage'), 'AdminSupportPage')
const AdminHelpPage = lazyPage(() => import('./pages/admin/AdminHelpPage'), 'AdminHelpPage')
const FrameworksAdminListPage = lazyPage(() => import('./pages/admin/FrameworksAdminListPage'), 'FrameworksAdminListPage')
const AdminFrameworkCreatePage = lazyPage(() => import('./pages/admin/AdminFrameworkCreatePage'), 'AdminFrameworkCreatePage')
const AdminFrameworkDetailPage = lazyPage(() => import('./pages/admin/AdminFrameworkDetailPage'), 'AdminFrameworkDetailPage')
const AdminPasswordPolicyPage = lazyPage(() => import('./pages/admin/AdminPasswordPolicyPage'), 'AdminPasswordPolicyPage')
const SupervisionPage = lazyPage(() => import('./pages/SupervisionPage'), 'SupervisionPage')
const EntityDetailPage = lazyPage(() => import('./pages/EntityDetailPage'), 'EntityDetailPage')
const CampaignDetailPage = lazyPage(() => import('./pages/CampaignDetailPage'), 'CampaignDetailPage')
const SubsidiariesPage = lazyPage(() => import('./features/group-module/SubsidiariesPage'), 'SubsidiariesPage')
const SubsidiaryDetailPage = lazyPage(() => import('./features/group-module/SubsidiaryDetailPage'), 'SubsidiaryDetailPage')
const ContinuousReviewsPage = lazyPage(() => import('./features/group-module/ContinuousReviewsPage'), 'ContinuousReviewsPage')
const TransversalPlansPage = lazyPage(() => import('./features/group-module/TransversalPlansPage'), 'TransversalPlansPage')
// Pages Regul - montées sous le shell unifié quand l'édition résolue est « regul ».
const RegulDashboard = lazyPage(() => import('./features/regul/RegulDashboard'), 'RegulDashboard')
const RegulMissionsListPage = lazyPage(() => import('./features/regul/RegulMissionsListPage'), 'RegulMissionsListPage')
const RegulMissionCreatePage = lazyPage(() => import('./features/regul/RegulMissionCreatePage'), 'RegulMissionCreatePage')
const RegulMeasuresPage = lazyPage(() => import('./features/regul/RegulMeasuresPage'), 'RegulMeasuresPage')
const RegulReferentielsPage = lazyPage(() => import('./features/regul/RegulReferentielsPage'), 'RegulReferentielsPage')
const RegulIncidentsPage = lazyPage(() => import('./features/regul/incidents/RegulIncidentsPage'), 'RegulIncidentsPage')
const AssujettiIncidentsPage = lazyPage(() => import('./features/regul/incidents/AssujettiIncidentsPage'), 'AssujettiIncidentsPage')

// Arbre de routes UNIFIÉ du shell ETP (RFC 0001 §5-6 ; RFC 0002 P2). Les CAPACITÉS
// de l'org (résolues au runtime) choisissent les routes-modules montées sous le même
// AppLayout : Comply (clients/missions/supervision) ou Regul (assujettis/contrôles/
// constats/incidents). Plus de fork d'application séparée (RegulApp supprimé) ni de
// branchement sur l'édition ; le chrome (Hub, compte, notifications, admin, portail)
// est partagé. Pré-auth : capacités vides → Comply (comme le déploiement principal).
function AppRoutes(): JSX.Element {
  const { hasCapability, loading: edLoading } = useEdition()
  // Modules actifs dérivés des CAPACITÉS via le registre (RFC 0013 C1) - plus de binaire isRegul.
  const activeKeys = new Set(APP_MODULES.filter((m) => m.enabled(hasCapability)).map((m) => m.key))
  const isSupervision = activeKeys.has('supervision-core')
  return (
    <Suspense fallback={<FullscreenLoader />}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/set-password" element={<SetPasswordPage />} />
      <Route path="/unsubscribe" element={<UnsubscribePage />} />

      {/* Hub - entrée unique pour tout le staff (RFC §5-6) */}
      <Route path="/hub" element={<ProtectedRoute><HubPage /></ProtectedRoute>} />

      {/* Routes-modules sous le shell unifié - l'édition résolue choisit le jeu monté */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={edLoading ? <FullscreenLoader /> : isSupervision ? <RegulDashboard /> : <DashboardPage />} />
        <Route path="compte" element={<AccountPage />} />
        <Route path="profil" element={<Navigate to="/compte" replace />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="organisation" element={<OrganizationPage />} />
        <Route path="membres" element={<Navigate to="/organisation?tab=membres" replace />} />
        <Route path="piste-audit" element={<Navigate to="/organisation?tab=piste-audit" replace />} />
        <Route path="risque" element={edLoading ? <FullscreenLoader /> : !hasCapability('risk') ? <Navigate to="/" replace /> : riskOverviewEnabled(hasCapability) ? <RiskPage /> : <Navigate to="/risque/synthese" replace />} />
        <Route path="risque/registre" element={edLoading ? <FullscreenLoader /> : hasCapability('risk') ? <RiskRegisterPage /> : <Navigate to="/" replace />} />
        <Route path="risque/criteres" element={edLoading ? <FullscreenLoader /> : hasCapability('risk') ? <RiskCriteriaPage /> : <Navigate to="/" replace />} />
        <Route path="risque/modeles" element={edLoading ? <FullscreenLoader /> : hasCapability('risk') ? <ScenarioTemplatesPage /> : <Navigate to="/" replace />} />
        <Route path="risque/secteurs" element={edLoading ? <FullscreenLoader /> : hasCapability('risk') ? <SectorsSettingsPage /> : <Navigate to="/" replace />} />
        <Route path="risque/plan" element={edLoading ? <FullscreenLoader /> : hasCapability('risk') ? <RiskPlanPage /> : <Navigate to="/" replace />} />
        <Route path="risque/acceptations" element={edLoading ? <FullscreenLoader /> : hasCapability('risk') ? <RiskAcceptancesPage /> : <Navigate to="/" replace />} />
        <Route path="risque/simulateur" element={edLoading ? <FullscreenLoader /> : hasCapability('risk') ? <RiskSimulatorPage /> : <Navigate to="/" replace />} />
        <Route path="risque/revue" element={edLoading ? <FullscreenLoader /> : hasCapability('risk') ? <RiskReviewPage /> : <Navigate to="/" replace />} />
        <Route path="fournisseurs" element={edLoading ? <FullscreenLoader /> : hasCapability('vendor') ? <VendorRegisterPage /> : <Navigate to="/" replace />} />
        <Route path="risque/synthese" element={edLoading ? <FullscreenLoader /> : hasCapability('risk') && (hasCapability('supervision') || hasCapability('client_portal')) ? <RiskExecutivePage /> : <Navigate to="/" replace />} />
        <Route path="risque/portefeuille" element={edLoading ? <FullscreenLoader /> : hasCapability('risk') && (hasCapability('supervision') || hasCapability('client_portal')) ? <RiskPortfolioPage /> : <Navigate to="/" replace />} />
        <Route path="risque/affectations" element={edLoading ? <FullscreenLoader /> : hasCapability('risk') && (hasCapability('supervision') || hasCapability('client_portal')) ? <SupervisionAssignmentsPage /> : <Navigate to="/" replace />} />
        <Route path="politiques" element={edLoading ? <FullscreenLoader /> : hasCapability('policy') ? <PolicyBoardPage /> : <Navigate to="/" replace />} />
        <Route path="politiques/couverture" element={edLoading ? <FullscreenLoader /> : hasCapability('policy') ? <PolicyCoveragePage /> : <Navigate to="/" replace />} />
        <Route path="conformite-continue" element={edLoading ? <FullscreenLoader /> : hasCapability('continuous_compliance') ? <ContinuousCompliancePage /> : <Navigate to="/" replace />} />
        <Route path="aide" element={<SupportCenterPage />} />
        {isSupervision && (
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
        )}
        {!isSupervision && (
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
        <Route path="aide" element={<AdminHelpPage />} />
        <Route path="frameworks" element={<FrameworksAdminListPage />} />
        <Route path="frameworks/nouveau" element={<AdminFrameworkCreatePage />} />
        <Route path="frameworks/:slug" element={<AdminFrameworkDetailPage />} />
        <Route path="audit-log" element={<AdminAuditLogPage />} />
        <Route path="securite" element={<AdminPasswordPolicyPage />} />
      </Route>

      {/* Portail client / assujetti - cloisonné (RLS cp_*) */}
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
        <Route path="directives" element={<ClientDirectivesPage />} />
        <Route path="evaluations" element={<ClientVendorAssessmentsPage />} />
        {isSupervision && <Route path="incidents" element={<AssujettiIncidentsPage />} />}
        <Route path="documents" element={<ClientDocumentsPage />} />
        <Route path="notifications" element={<ClientNotificationsPage />} />
        <Route path="aide" element={<ClientSupportCenterPage />} />
      </Route>

      {/* Tant que les capacités chargent, ne pas rediriger (sinon saut vers l'accueil au
          refresh d'une route Regul non encore montée) : on attend la résolution. */}
      <Route path="*" element={edLoading ? <FullscreenLoader /> : <Navigate to="/" replace />} />
    </Routes>
    </Suspense>
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
        <TenantAccessGuard>
        <DemoLensProvider>
        <EditionProvider>
        <RecorderProvider>
        <MfaGate>
        <PasswordExpiryGate>
        <AppRoutes />
        <OnboardingWelcome />
        </PasswordExpiryGate>
        </MfaGate>
        </RecorderProvider>
        </EditionProvider>
        </DemoLensProvider>
        </TenantAccessGuard>
      </AuthProvider>
      </BrandingProvider>
    </BrowserRouter>
  )
}

export default App
