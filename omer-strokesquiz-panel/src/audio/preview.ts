import type { Song } from '../types';

/** A 30 second iTunes preview plus the artwork that belongs to it. */
export interface Preview {
  url: string;
  artworkUrl?: string;
}

interface ItunesTrack {
  previewUrl?: string;
  artworkUrl100?: string;
  artistName?: string;
  trackName?: string;
}

const cache = new Map<string, Promise<Preview | undefined>>();

/**
 * Looks the preview up once per song and remembers it. The catalog carries the
 * iTunes track id, so this is a single lookup; the title search is only a
 * fallback for rows that came from the data source without an id.
 */
export function resolvePreview(song: Song): Promise<Preview | undefined> {
  if (!cache.has(song.id)) {
    cache.set(song.id, fetchPreview(song));
  }
  return cache.get(song.id)!;
}

async function fetchPreview(song: Song): Promise<Preview | undefined> {
  try {
    const track = song.itunesTrackId
      ? await lookupTrack(song.itunesTrackId)
      : await searchTrack(song);
    if (!track?.previewUrl) {
      return undefined;
    }
    return { url: track.previewUrl, artworkUrl: artworkUrl(track.artworkUrl100) };
  } catch {
    return undefined;
  }
}

async function lookupTrack(trackId: number): Promise<ItunesTrack | undefined> {
  const query = new URLSearchParams({ id: String(trackId), country: 'US' });
  const res = await fetch(`https://itunes.apple.com/lookup?${query}`);
  if (!res.ok) {
    return undefined;
  }
  const data = (await res.json()) as { results?: ItunesTrack[] };
  return data.results?.[0];
}

async function searchTrack(song: Song): Promise<ItunesTrack | undefined> {
  const query = new URLSearchParams({
    term: `The Strokes ${song.title}`,
    entity: 'song',
    limit: '10',
    country: 'US',
  });
  const res = await fetch(`https://itunes.apple.com/search?${query}`);
  if (!res.ok) {
    return undefined;
  }
  const data = (await res.json()) as { results?: ItunesTrack[] };
  const title = normalized(song.title);
  return data.results?.find((r) => r.artistName === 'The Strokes' && normalized(r.trackName ?? '') === title);
}

function normalized(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** iTunes hands out 100px art; the same image is served at any size. */
function artworkUrl(url?: string) {
  return url?.replace(/\/\d+x\d+bb\.(jpg|png)$/, '/600x600bb.$1');
}
