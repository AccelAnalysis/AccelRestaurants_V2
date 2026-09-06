import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/molecules/ProtectedRoute';
import { DesignerRoute } from './components/molecules/DesignerRoute';
import { SuperAdminRoute } from './components/molecules/SuperAdminRoute';
import { useAuthListener } from './hooks/useAuthListener';
import { useConfigStore } from './store/useConfigStore';

// Lazy load pages to split bundles
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard').then(module => ({ default: module.SuperAdminDashboard })));
const DesignerDashboard = lazy(() => import('./pages/DesignerDashboard').then(module => ({ default: module.DesignerDashboard })));
const PlayerScreen = lazy(() => import('./pages/PlayerScreen').then(module => ({ default: module.PlayerScreen })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })));
const JoinPage = lazy(() => import('./pages/JoinPage').then(module => ({ default: module.JoinPage })));
const PairingPage = lazy(() => import('./pages/PairingPage').then(module => ({ default: module.PairingPage })));
const LandingPage = lazy(() => import('./pages/LandingPage').then(module => ({ default: module.LandingPage })));
const PricingPage = lazy(() => import('./pages/PricingPage').then(module => ({ default: module.PricingPage })));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then(module => ({ default: module.OnboardingPage })));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy').then(module => ({ default: module.PrivacyPolicy })));
const TermsOfService = lazy(() => import('./pages/TermsOfService').then(module => ({ default: module.TermsOfService })));
const RedirectTracker = lazy(() => import('./pages/RedirectTracker').then(module => ({ default: module.RedirectTracker })));
const TemplateEditor = lazy(() => import('./components/organisms/TemplateEditor').then(module => ({ default: module.TemplateEditor })));

function App() {
  useAuthListener();
  const { fetchConfigs } = useConfigStore();

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  return (
    <Router>
      <Suspense fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="animate-pulse">Loading App...</div>
        </div>
      }>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/templates/new"
            element={
              <SuperAdminRoute>
                <TemplateEditor />
              </SuperAdminRoute>
            }
          />
          <Route
            path="/super-admin/templates/:templateId"
            element={
              <SuperAdminRoute>
                <TemplateEditor />
              </SuperAdminRoute>
            }
          />
          <Route
            path="/super-admin/*"
            element={
              <SuperAdminRoute>
                <SuperAdminDashboard />
              </SuperAdminRoute>
            }
          />
          <Route path="/player/:screenId" element={<PlayerScreen />} />
          <Route path="/pair/:screenId" element={<PairingPage />} />
          <Route path="/r" element={<RedirectTracker />} />
          <Route
            path="/designer/*"
            element={
              <DesignerRoute>
                <DesignerDashboard />
              </DesignerRoute>
            }
          />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
