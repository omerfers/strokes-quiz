import type { Song } from "./types";

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

export function resolvePreview(song: Song): Promise<Preview | undefined> {
  if (!cache.has(song.id)) cache.set(song.id, fetchPreview(song));
  return cache.get(song.id)!;
}

async function fetchPreview(song: Song): Promise<Preview | undefined> {
  try {
    const track = song.itunesTrackId ? await lookup(song.itunesTrackId) : await search(song);
    if (!track?.previewUrl) return undefined;
    return { url: track.previewUrl, artworkUrl: artwork(track.artworkUrl100) };
  } catch {
    return undefined;
  }
}

async function lookup(trackId: number): Promise<ItunesTrack | undefined> {
  const res = await fetch(`https://itunes.apple.com/lookup?id=${trackId}&country=US`);
  if (!res.ok) return undefined;
  const data = (await res.json()) as { results?: ItunesTrack[] };
  return data.results?.[0];
}

async function search(song: Song): Promise<ItunesTrack | undefined> {
  const term = encodeURIComponent(`The Strokes ${song.title}`);
  const res = await fetch(`https://itunes.apple.com/search?term=${term}&entity=song&limit=10&country=US`);
  if (!res.ok) return undefined;
  const data = (await res.json()) as { results?: ItunesTrack[] };
  const name = normalize(song.title);
  return data.results?.find((r) => r.artistName === "The Strokes" && normalize(r.trackName ?? "") === name);
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\(.*?\)|\[.*?\]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function artwork(url?: string) {
  return url?.replace(/\/\d+x\d+bb\.(jpg|png)$/, "/600x600bb.$1");
}
