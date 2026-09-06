import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

interface DesignerRouteProps {
  children: ReactNode;
}

export const DesignerRoute = ({ children }: DesignerRouteProps) => {
  const { user, userProfile, loading } = useAuthStore();

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-background text-text">Loading...</div>;
  }

  // Allow if user is a designer OR a super admin (for testing/impersonation)
  if (!user || (userProfile?.platformRole !== 'designer' && userProfile?.platformRole !== 'admin')) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
