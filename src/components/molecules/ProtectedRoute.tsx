import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { safeWorkspaceDestination } from '../../lib/customerJourney';
import { useAuthStore } from '../../store/useAuthStore';
export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, userProfile, organization, loading } = useAuthStore();
  const location = useLocation();
  if (loading) return <main className="min-h-screen bg-background text-text flex items-center justify-center"><p role="status">Loading your workspace…</p></main>;
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search + location.hash)}`} replace />;
  // Require only the owner's basic restaurant details. TV connection and optional tips never block work.
  if (userProfile?.platformRole !== 'admin' && userProfile?.platformRole !== 'designer' && (!organization || (organization.ownerId === user.uid && !organization.isSetupComplete && !organization.industry))) return <Navigate to={`/onboarding?redirect=${encodeURIComponent(safeWorkspaceDestination(location.pathname + location.search) || "/admin")}`} replace />;
  return <>{children}</>;
};
