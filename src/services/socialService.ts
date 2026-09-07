
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

export interface SocialPost {
  id: string;
  platform: 'instagram' | 'facebook';
  caption: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  permalink: string;
  timestamp: string;
  username: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
}

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const cache = new Map<string, { data: SocialPost[]; timestamp: number }>();

export const SocialService = {
  getFeed: async (platform: string, accountHandle: string): Promise<SocialPost[]> => {
    const key = `${platform}:${accountHandle}`;
    
    // Check cache
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const fetchSocialFeed = httpsCallable(functions, 'fetchSocialFeed');
      const result = await fetchSocialFeed({ platform, account: accountHandle });
      const data = result.data as { posts: SocialPost[] };
      
      if (data?.posts) {
        cache.set(key, { data: data.posts, timestamp: Date.now() });
        return data.posts;
      }
      return [];
    } catch (error) {
      console.error('SocialService Error:', error);
      // Return empty array on error to allow UI to handle gracefully
      return [];
    }
  }
};
