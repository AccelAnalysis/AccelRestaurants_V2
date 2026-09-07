import { useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';

export const useLocationPermissions = () => {
  const { userProfile, organization } = useAuthStore();

  const permissions = useMemo(() => {
    if (!userProfile || !organization) {
      return {
        canViewLocation: false,
        canEditLocation: false,
        canControlAudio: false,
        canManageScreens: false
      };
    }

    // Check if user is org owner or admin
    const isOwner = organization.ownerId === userProfile.uid;
    const isAdmin = userProfile.platformRole === 'admin';
    
    // Owners and admins have full permissions
    if (isOwner || isAdmin) {
      return {
        canViewLocation: true,
        canEditLocation: true,
        canControlAudio: true,
        canManageScreens: true
      };
    }

    // Regular users have view-only permissions
    return {
      canViewLocation: true,
      canEditLocation: false,
      canControlAudio: false,
      canManageScreens: false
    };
  }, [userProfile, organization]);

  return permissions;
};
