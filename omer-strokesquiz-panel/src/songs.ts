import { Field, PanelData } from '@grafana/data';
import catalog from './catalog.json';
import { getClipUrl } from './audio';
import { Song } from './types';
interface CatalogEntry {
  id: string;
  title: string;
  album: string;
  albumKey: string;
  year: number;
  startOffsetSeconds: number;
}
export const BUILT_IN_SONGS: Song[] = (catalog as CatalogEntry[]).map((entry) => ({
  ...entry,
  clipUrl: getClipUrl(entry.id),
}));
function readField(
  frame: {
    fields: Field[];
  },
  name: string
): Field | undefined {
  return frame.fields.find((f) => f.name.toLowerCase() === name.toLowerCase());
}
function toStringValue(field: Field | undefined, index: number): string {
  if (!field) {
    return '';
  }
  const value = field.values[index];
  return value === null || value === undefined ? '' : String(value);
}
function toNumberValue(field: Field | undefined, index: number, fallback: number): number {
  if (!field) {
    return fallback;
  }
  const value = Number(field.values[index]);
  return Number.isFinite(value) ? value : fallback;
}
export function resolveSongs(data: PanelData | undefined): {
  songs: Song[];
  source: 'datasource' | 'builtin';
} {
  const frame = data?.series?.[0];
  const idField = frame && readField(frame, 'id');
  const titleField = frame && readField(frame, 'title');
  if (!frame || !idField || !titleField) {
    return { songs: BUILT_IN_SONGS, source: 'builtin' };
  }
  const albumField = readField(frame, 'album');
  const yearField = readField(frame, 'year');
  const offsetField = readField(frame, 'startOffsetSeconds');
  const rows: Song[] = [];
  for (let i = 0; i < frame.length; i++) {
    const id = toStringValue(idField, i);
    const title = toStringValue(titleField, i);
    if (!id || !title) {
      continue;
    }
    const album = toStringValue(albumField, i);
    const local = BUILT_IN_SONGS.find((s) => s.id === id);
    const albumKey = local?.albumKey ?? album.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    rows.push({
      id,
      title,
      album: album || local?.album || '',
      albumKey,
      year: toNumberValue(yearField, i, local?.year ?? 0),
      startOffsetSeconds: toNumberValue(offsetField, i, local?.startOffsetSeconds ?? 0),
      clipUrl: getClipUrl(id),
    });
  }
  if (rows.length === 0) {
    return { songs: BUILT_IN_SONGS, source: 'builtin' };
  }
  return { songs: rows, source: 'datasource' };
}
