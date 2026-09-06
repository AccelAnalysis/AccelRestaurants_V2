/**
 * Global constants for the AccelRestaurants application.
 */

// In a real multi-tenant application, this would be determined by the user's authenticated context.
export const DEMO_ORG_ID = 'demo-org-123';

export const STORAGE_PATHS = {
  ORGANIZATION_ASSETS: (orgId: string) => `organizations/${orgId}/assets/`,
  SLIDE_BACKGROUNDS: (slideId: string) => `slides/${slideId}/backgrounds/`,
  SLIDE_ASSETS: (slideId: string) => `slides/${slideId}/assets/`,
};

export const FIRESTORE_COLLECTIONS = {
  ORGANIZATIONS: 'organizations',
  SCREENS: 'screens',
  SLIDES: 'slides',
  MENUS: 'menus',
  CAMPAIGNS: 'campaigns',
  DESIGNERS: 'designers',
  DESIGN_JOBS: 'designJobs',
};
