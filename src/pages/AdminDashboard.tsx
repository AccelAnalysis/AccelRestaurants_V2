import { Routes, Route, Link, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { LogOut, Settings, User, Building2, HelpCircle, Palette, LayoutDashboard, FileText, Presentation, Image, Monitor, TrendingUp, Menu, MapPin } from 'lucide-react';
import { auth } from '../lib/firebase';
import logo from '../assets/logo.png';
import { MenuListView } from '../components/organisms/MenuListView';
import { MenuEditor } from '../components/organisms/MenuEditor';
import { SlideListView } from '../components/organisms/SlideListView';
import { SlideEditor } from '../components/organisms/SlideEditor';
import { MediaAssetsView } from '../components/organisms/MediaAssetsView';
import { ScreenListView } from '../components/organisms/ScreenListView';
import { ScreenEditor } from '../components/organisms/ScreenEditor';
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
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
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
      alert('Failed to log out');
    }
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-background text-text flex flex-col">
      {isImpersonating && (
        <div className="bg-red-600 text-white px-4 py-2 flex justify-between items-center shadow-md z-50">
          <div className="flex items-center gap-2">
            <User size={16} />
            <span className="font-medium">Viewing as: {userProfile?.email} ({userProfile?.displayName})</span>
          </div>
          <button 
            onClick={() => {
              stopImpersonation();
              navigate('/super-admin');
            }}
            className="bg-white text-red-600 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider hover:bg-red-50 transition-colors"
          >
            Exit Impersonation
          </button>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-surface border-b border-surface-highlight h-16 flex items-center justify-between px-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-surface-highlight rounded text-text transition-colors"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <img src={logo} alt="AccelRestaurants" className="h-8 w-auto object-contain" />
            <span className="text-xl font-bold text-primary">AccelRestaurants</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Add any header actions here if needed */}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64 p-6' : 'w-0 p-0 overflow-hidden'} glass border-r-0 flex flex-col transition-all duration-300 ease-in-out`}>
        <nav className="flex-1 space-y-2 min-w-[200px]">
          <Link to="/admin" className={`block px-4 py-2 rounded text-text ${location.pathname === '/admin' ? 'bg-surface-highlight/50 font-medium' : 'hover:bg-surface-highlight/30'}`}>
            <div className="flex items-center gap-2">
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </div>
          </Link>
          <Link to="/admin/master-dashboard" className={`block px-4 py-2 rounded text-text ${location.pathname === '/admin/master-dashboard' ? 'bg-surface-highlight/50 font-medium' : 'hover:bg-surface-highlight/30'}`}>
            <div className="flex items-center gap-2">
              <TrendingUp size={18} />
              <span>Master Dashboard</span>
            </div>
          </Link>
          <Link to="/admin/screens" className={`block px-4 py-2 rounded text-text ${isActive('/admin/screens') ? 'bg-surface-highlight/50 font-medium' : 'hover:bg-surface-highlight/30'}`}>
            <div className="flex items-center gap-2">
              <Monitor size={18} />
              <span>Screens</span>
            </div>
          </Link>
          <Link to="/admin/locations" className={`block px-4 py-2 rounded text-text ${isActive('/admin/locations') ? 'bg-surface-highlight/50 font-medium' : 'hover:bg-surface-highlight/30'}`}>
            <div className="flex items-center gap-2">
              <MapPin size={18} />
              <span>Locations</span>
            </div>
          </Link>
          <Link to="/admin/designers" className={`block px-4 py-2 rounded text-text ${isActive('/admin/designers') ? 'bg-surface-highlight/50 font-medium' : 'hover:bg-surface-highlight/30'}`}>
            <div className="flex items-center gap-2">
              <Palette size={18} />
              <span>Designer Market</span>
            </div>
          </Link>
          <Link to="/admin/menus" className={`block px-4 py-2 rounded text-text ${isActive('/admin/menus') ? 'bg-surface-highlight/50 font-medium' : 'hover:bg-surface-highlight/30'}`}>
            <div className="flex items-center gap-2">
              <FileText size={18} />
              <span>Menus</span>
            </div>
          </Link>
          <Link to="/admin/slides" className={`block px-4 py-2 rounded text-text ${isActive('/admin/slides') ? 'bg-surface-highlight/50 font-medium' : 'hover:bg-surface-highlight/30'}`}>
            <div className="flex items-center gap-2">
              <Presentation size={18} />
              <span>Slides</span>
            </div>
          </Link>
          <Link to="/admin/media" className={`block px-4 py-2 rounded text-text ${isActive('/admin/media') ? 'bg-surface-highlight/50 font-medium' : 'hover:bg-surface-highlight/30'}`}>
            <div className="flex items-center gap-2">
              <Image size={18} />
              <span>Media Assets</span>
            </div>
          </Link>
          <Link to="/admin/analytics" className={`block px-4 py-2 rounded text-text ${isActive('/admin/analytics') ? 'bg-surface-highlight/50 font-medium' : 'hover:bg-surface-highlight/30'}`}>
            <div className="flex items-center gap-2">
              <TrendingUp size={18} />
              <span>Analytics</span>
            </div>
          </Link>
          
          <div className="pt-4 mt-4 border-t border-surface-highlight/30">
            <h3 className="px-4 text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Settings & Support</h3>
            <Link to="/admin/settings/my-account" className={`block px-4 py-2 rounded text-text ${isActive('/admin/settings') ? 'bg-surface-highlight/50 font-medium' : 'hover:bg-surface-highlight/30'}`}>
              <div className="flex items-center gap-2">
                <Settings size={18} />
                <span>Settings</span>
              </div>
            </Link>
            <Link to="/admin/help" className={`block px-4 py-2 rounded text-text ${isActive('/admin/help') ? 'bg-surface-highlight/50 font-medium' : 'hover:bg-surface-highlight/30'}`}>
              <div className="flex items-center gap-2">
                <HelpCircle size={18} />
                <span>Help & Support</span>
              </div>
            </Link>
          </div>
        </nav>
        <div className="mt-auto pt-6 border-t border-surface-highlight/30 min-w-[200px]">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">Logged in as Admin</p>
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-surface-highlight/30 rounded text-text-muted hover:text-text transition-colors"
              title="Log Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-0 overflow-auto">
        <Routes>
          <Route path="/" element={<DashboardOverview />} />
          <Route path="/menus" element={<div className="p-8"><MenuListView /></div>} />
          <Route path="/menus/new" element={<div className="p-8"><MenuEditor /></div>} />
          <Route path="/menus/:menuId" element={<div className="p-8"><MenuEditor /></div>} />
          
          <Route path="/slides" element={<div className="p-8"><SlideListView /></div>} />
          <Route path="/slides/:slideId" element={<SlideEditor />} />
          
          <Route path="/media" element={<div className="p-8"><MediaAssetsView /></div>} />
          
          {/* Screens Module Routes */}
          <Route path="/screens" element={<ScreenListView />} />
          <Route path="/screens/new" element={<ScreenEditor />} />
          <Route path="/screens/:screenId" element={<ScreenEditor />} />
          
          {/* Locations Module Routes */}
          <Route path="/locations" element={<LocationsPage />} />
          <Route path="/locations/:locationId" element={<LocationsPage />} />
          
          <Route path="/master-dashboard" element={<MasterDashboard />} />
          <Route path="/analytics" element={<div className="p-8"><QRAnalyticsView /></div>} />
          
          <Route path="/designers" element={<div className="p-8"><DesignerMarketplace /></div>} />
          <Route path="/designers/jobs/:jobId" element={<div className="p-8"><JobDetailView /></div>} />

          <Route path="/subscription" element={<SubscriptionManager />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/kb" element={<KnowledgeBase />} />
          <Route path="/kb/:articleId" element={<ArticleView />} />

          {/* Settings Routes */}
          <Route path="/settings" element={<Navigate to="/admin/settings/my-account" replace />} />
          <Route path="/settings/*" element={
            <div className="p-8 max-w-6xl mx-auto">
              {/* Settings Header */}
              <div className="flex items-center justify-between mb-8">
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
      </main>
      </div>
    </div>
  );
};
