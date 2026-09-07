import type { PlaylistEntry } from '../types/schema';

/**
 * Normalize a playlist that may contain legacy string IDs or new PlaylistEntry objects
 * into a consistent PlaylistEntry[] format.
 */
export function normalizePlaylist(playlist: (PlaylistEntry | string)[]): PlaylistEntry[] {
  if (!playlist) return [];
  return playlist.map(entry => {
    if (typeof entry === 'string') {
      return { slideId: entry };
    }
    return entry;
  });
}
