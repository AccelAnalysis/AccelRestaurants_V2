import { useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import type { OrgRole } from '../types/schema';

export const usePermissions = () => {
  const { user, userProfile } = useAuthStore();

  const canManageLocation = useCallback((locationId: string, memberRole?: OrgRole, memberLocationIds?: string[]) => {
    if (!user) return false;
    if (userProfile?.platformRole === 'admin') return true; // Super Admin
    
    // If we don't know the role, we can't permit (unless we default to something)
    if (!memberRole) return false;

    if (memberRole === 'orgAdmin') return true;
    
    if (memberRole === 'locationAdmin') {
      return memberLocationIds?.includes(locationId) || false;
    }

    return false;
  }, [user, userProfile]);

  const canManageResource = useCallback((resourceLocationIds: string[], memberRole?: OrgRole, memberLocationIds?: string[]) => {
    if (!user) return false;
    if (userProfile?.platformRole === 'admin') return true;
    if (!memberRole) return false;
    if (memberRole === 'orgAdmin') return true;

    if (memberRole === 'locationAdmin') {
      // Can manage if resource has no location (global)? Maybe not for location admin?
      // Let's say NO for now to be safe. Location admins manage THEIR locations.
      if (!resourceLocationIds || resourceLocationIds.length === 0) return false; 

      // Check if every location in resource is in member's allowed list
      return resourceLocationIds.every(id => memberLocationIds?.includes(id));
    }

    return false;
  }, [user, userProfile]);

  const canViewResource = useCallback((resourceLocationIds: string[], memberRole?: OrgRole, memberLocationIds?: string[]) => {
    if (!user) return false;
    if (userProfile?.platformRole === 'admin') return true;
    if (!memberRole) return false;
    if (memberRole === 'orgAdmin') return true;

    if (memberRole === 'locationAdmin' || memberRole === 'locationUser') {
      // Global items visible?
      if (!resourceLocationIds || resourceLocationIds.length === 0) return true;
      
      // Visible if overlaps with member's locations
      return resourceLocationIds.some(id => memberLocationIds?.includes(id));
    }

    // Default 'user' role behavior - can view everything?
    // If OrgRole is 'user', they usually see everything in the org.
    if (memberRole === 'user') return true;

    return false;
  }, [user, userProfile]);

  return {
    canManageLocation,
    canManageResource,
    canViewResource
  };
};
