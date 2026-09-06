import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

interface SuperAdminRouteProps {
  children: ReactNode;
}

export const SuperAdminRoute = ({ children }: SuperAdminRouteProps) => {
  const { user, userProfile, loading } = useAuthStore();

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-background text-text">Loading...</div>;
  }

  if (!user || userProfile?.platformRole !== 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};
