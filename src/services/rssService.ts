
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

export interface RssItem {
  title: string;
  link: string;
  content: string;
  contentSnippet?: string;
  pubDate: string;
  isoDate: string;
}

export interface RssFeed {
  title: string;
  description: string;
  items: RssItem[];
}

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const cache = new Map<string, { data: RssFeed; timestamp: number }>();

export const RssService = {
  getFeed: async (url: string): Promise<RssFeed | null> => {
    if (!url) return null;

    // Check cache
    const cached = cache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Call Cloud Function to bypass CORS
      const fetchRssFeed = httpsCallable(functions, 'fetchRssFeed');
      const result = await fetchRssFeed({ url });
      const { content } = result.data as { content: string };

      if (!content) return null;

      // Parse XML on client
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(content, "text/xml");
      
      const channel = xmlDoc.querySelector("channel");
      if (!channel) return null;

      const title = channel.querySelector("title")?.textContent || "RSS Feed";
      const description = channel.querySelector("description")?.textContent || "";
      
      const items: RssItem[] = Array.from(xmlDoc.querySelectorAll("item")).map(item => {
        const title = item.querySelector("title")?.textContent || "No Title";
        const link = item.querySelector("link")?.textContent || "#";
        const description = item.querySelector("description")?.textContent || "";
        const pubDate = item.querySelector("pubDate")?.textContent || "";
        
        // Strip HTML from description for snippet
        const div = document.createElement("div");
        div.innerHTML = description;
        const contentSnippet = div.textContent || description;

        return {
          title,
          link,
          content: description,
          contentSnippet,
          pubDate,
          isoDate: pubDate // Simple mapping
        };
      }).slice(0, 10); // Limit to 10 items

      const feed: RssFeed = {
        title,
        description,
        items
      };

      // Update cache
      cache.set(url, { data: feed, timestamp: Date.now() });

      return feed;
    } catch (error) {
      console.error('RSS Service Error:', error);
      return null;
    }
  }
};
