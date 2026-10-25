import { readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import catalog from '../catalog.json';
const CLIP_DIR = join(__dirname, 'clips');
const AUDIO = /\.(mp3|m4a|ogg|wav)$/i;
const ids = new Set(catalog.map((song) => song.id));
const files = readdirSync(CLIP_DIR).filter((file) => AUDIO.test(file));
const clipIds = files.map((file) => file.slice(0, -extname(file).length));
describe('bundled clips', () => {
  it('ships at least one clip', () => {
    expect(files.length).toBeGreaterThan(0);
  });
  it('names every clip after a catalog song', () => {
    const orphans = clipIds.filter((id) => !ids.has(id));
    expect(orphans).toEqual([]);
  });
  it('does not bundle the same song twice', () => {
    expect(new Set(clipIds).size).toBe(clipIds.length);
  });
  it('has audio for all but at most one catalog song', () => {
    const missing = catalog.filter((song) => !clipIds.includes(song.id));
    expect(missing.length).toBeLessThanOrEqual(1);
  });
});
