import { Routes, Route, Link, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { LogOut, User, Building2 } from 'lucide-react';
import { auth } from '../lib/firebase';
import { AdminShell } from '../components/organisms/AdminShell';
import { InlineFeedback } from '../components/atoms/InlineFeedback';
import { MenuListView } from '../components/organisms/MenuListView';
import { MenuEditor } from '../components/organisms/MenuEditor';
import { SlideListView } from '../components/organisms/SlideListView';
import { SlideEditor } from '../components/organisms/SlideEditor';
import { MediaAssetsView } from '../components/organisms/MediaAssetsView';
import { ScreenListView } from '../components/organisms/ScreenListView';
import { ScreenSetupPage as ScreenEditor } from '../components/journey/ScreenSetupPage';
import { DashboardOverview } from '../components/organisms/DashboardOverview';
import { SubscriptionManager } from '../components/organisms/SubscriptionManager';
import { DesignerMarketplace } from '../components/organisms/DesignerMarketplace';
import { JobDetailView } from '../components/organisms/JobDetailView';
import { MyAccountView } from '../components/organisms/settings/MyAccountView';
import { OrganizationView } from '../components/organisms/settings/OrganizationView';
import { HelpPage } from './HelpPage';
import { KnowledgeBase } from './KnowledgeBase';
import { ArticleView } from './ArticleView';
import { MasterDashboard } from './MasterDashboard';
import { QRAnalyticsView } from '../components/organisms/QRAnalyticsView';
import { LocationsPage } from './LocationsPage';
import { useState } from 'react';

import { useAuthStore } from '../store/useAuthStore';
import { useConfigStore } from '../store/useConfigStore';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isImpersonating, stopImpersonation, userProfile } = useAuthStore();
  const resetConfigStore = useConfigStore((state) => state.reset);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError(null);
    try {
      if (isImpersonating) {
        stopImpersonation();
        navigate('/super-admin'); // Go back to super admin dashboard
        return;
      }
      resetConfigStore();
      await signOut(auth);
      navigate('/login');
    } catch {
      setLogoutError('Sign out failed. Try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <AdminShell
      account={<div className="space-y-2 border-t border-surface-highlight pt-4">
        <p className="text-sm text-text-secondary break-all">{userProfile?.displayName || userProfile?.email || 'Your account'}</p>
        <button type="button" onClick={handleLogout} disabled={loggingOut} className="ui-button ui-button-secondary w-full">
          <LogOut size={18} aria-hidden="true" />{loggingOut ? 'Signing out…' : isImpersonating ? 'Return to administration' : 'Sign out'}
        </button>
        <InlineFeedback message={logoutError} tone="error" />
      </div>}
      banner={isImpersonating ? <div role="status" className="bg-red-950 text-white px-4 py-2 flex flex-wrap gap-3 items-center justify-between">
        <span>Viewing as {userProfile?.email}</span>
        <button type="button" className="ui-button ui-button-secondary" onClick={() => { stopImpersonation(); navigate('/super-admin'); }}>Exit impersonation</button>
      </div> : undefined}
    >
        <Routes>
          <Route path="/" element={<DashboardOverview />} />
          <Route path="/menus" element={<div className="p-4 sm:p-8"><MenuListView /></div>} />
          <Route path="/menus/new" element={<div className="p-4 sm:p-8"><MenuEditor /></div>} />
          <Route path="/menus/:menuId" element={<div className="p-4 sm:p-8"><MenuEditor /></div>} />
          
          <Route path="/slides" element={<div className="p-4 sm:p-8"><SlideListView /></div>} />
          <Route path="/slides/:slideId" element={<SlideEditor />} />
          
          <Route path="/media" element={<div className="p-4 sm:p-8"><MediaAssetsView /></div>} />
          
          {/* Screens Module Routes */}
          <Route path="/screens" element={<ScreenListView />} />
          <Route path="/screens/new" element={<ScreenEditor />} />
          <Route path="/screens/:screenId" element={<ScreenEditor />} />
          
          {/* Locations Module Routes */}
          <Route path="/locations" element={<LocationsPage />} />
          <Route path="/locations/:locationId" element={<LocationsPage />} />
          
          <Route path="/master-dashboard" element={<MasterDashboard />} />
          <Route path="/analytics/*" element={<QRAnalyticsView />} />
          
          <Route path="/designers" element={<div className="p-4 sm:p-8"><DesignerMarketplace /></div>} />
          <Route path="/designers/jobs/:jobId" element={<div className="p-4 sm:p-8"><JobDetailView /></div>} />

          <Route path="/subscription" element={<SubscriptionManager />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/kb" element={<KnowledgeBase />} />
          <Route path="/kb/:articleId" element={<ArticleView />} />

          {/* Settings Routes */}
          <Route path="/settings" element={<Navigate to="/admin/settings/my-account" replace />} />
          <Route path="/settings/*" element={
            <div className="p-4 sm:p-8 max-w-6xl mx-auto">
              {/* Settings Header */}
              <div className="flex flex-wrap gap-4 items-center justify-between mb-8">
                <h1 className="text-2xl font-bold text-primary">Settings</h1>
                <div className="flex gap-2 bg-surface p-1 rounded-lg border border-surface-highlight">
                  <Link 
                    to="/admin/settings/my-account" 
                    className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${location.pathname.includes('/my-account') ? 'bg-primary text-white' : 'text-text hover:bg-surface-highlight'}`}
                  >
                    <User size={16} />
                    My Account
                  </Link>
                  <Link 
                    to="/admin/settings/organization" 
                    className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${location.pathname.includes('/organization') ? 'bg-primary text-white' : 'text-text hover:bg-surface-highlight'}`}
                  >
                    <Building2 size={16} />
                    Organization
                  </Link>
                </div>
              </div>

              <Routes>
                <Route path="my-account" element={<MyAccountView />} />
                <Route path="organization" element={<OrganizationView />} />
              </Routes>
            </div>
          } />
        </Routes>
    </AdminShell>
  );
};
