#!/usr/bin/env node
/**
 * Copies real audio into the panel and renames it to song ids.
 *
 * Usage:
 *   node tools/import-clips.mjs "/path/to/folder"          # copy into the repo
 *   node tools/import-clips.mjs "/path/to/folder" --dry-run
 *
 * Files are matched to catalog titles by name (case, accents, punctuation and
 * "&"/"and" do not matter), because the panel looks clips up by song id.
 * Accepted formats: mp3, m4a, ogg, wav (same priority as src/audio/index.ts).
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLIPS = join(ROOT, 'omer-strokesquiz-panel', 'src', 'audio', 'clips');
const CATALOG = join(ROOT, 'omer-strokesquiz-panel', 'src', 'catalog.json');

const AUDIO_EXT = ['.mp3', '.m4a', '.ogg', '.wav'];
const PRIORITY = { '.mp3': 3, '.m4a': 2, '.ogg': 1, '.wav': 0 };

const args = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const dryRun = process.argv.includes('--dry-run');
const source = args[0];

if (!source) {
  console.error('Usage: node tools/import-clips.mjs "/path/to/folder" [--dry-run]');
  process.exit(1);
}
if (!existsSync(source) || !statSync(source).isDirectory()) {
  console.error(`Not a directory: ${source}`);
  process.exit(1);
}

/** Lowercase, strip accents, treat "&" as "and", drop everything non-alphanumeric. */
function normalize(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const songs = JSON.parse(readFileSync(CATALOG, 'utf8'));
const byTitle = new Map(songs.map((song) => [normalize(song.title), song]));
const byId = new Map(songs.map((song) => [song.id, song]));

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(full);
    }
    return [full];
  });
}

const files = walk(source).filter((file) => AUDIO_EXT.includes(extname(file).toLowerCase()));

if (files.length === 0) {
  console.error(`No ${AUDIO_EXT.join('/')} files found in ${source}`);
  process.exit(1);
}

mkdirSync(CLIPS, { recursive: true });

const copied = [];
const unchanged = [];
const unmatched = [];
const conflicts = [];

for (const file of files) {
  const ext = extname(file).toLowerCase();
  const name = basename(file, extname(file));
  const song = byTitle.get(normalize(name)) ?? byId.get(name);

  if (!song) {
    unmatched.push(relative(source, file));
    continue;
  }

  const dest = join(CLIPS, `${song.id}${ext}`);
  if (existsSync(dest)) {
    unchanged.push({ file: relative(source, file), id: song.id, reason: 'already imported' });
    continue;
  }

  // Prefer a higher-priority format if the same song arrives twice in one run.
  const existing = AUDIO_EXT.map((candidate) => join(CLIPS, `${song.id}${candidate}`)).find(existsSync);
  if (existing && PRIORITY[extname(existing).toLowerCase()] >= PRIORITY[ext]) {
    conflicts.push({ file: relative(source, file), kept: basename(existing) });
    continue;
  }

  if (!dryRun) {
    copyFileSync(file, dest);
  }
  copied.push({ id: song.id, title: song.title, from: basename(file), to: basename(dest) });
}

const missing = songs.filter((song) => !AUDIO_EXT.some((ext) => existsSync(join(CLIPS, `${song.id}${ext}`))));

console.log(`${dryRun ? '[dry run] ' : ''}source: ${source}`);
console.log(`files found: ${files.length}`);
console.log(`imported:    ${copied.length}${dryRun ? ' (not written)' : ''}`);
copied.forEach((entry) => console.log(`  ${entry.from}  ->  ${entry.to}`));

if (unchanged.length) {
  console.log(`already there: ${unchanged.length}`);
}
if (conflicts.length) {
  console.log(`skipped (lower priority): ${conflicts.length}`);
  conflicts.forEach((entry) => console.log(`  ${entry.file}  (kept ${entry.kept})`));
}
if (unmatched.length) {
  console.log(`unmatched:   ${unmatched.length}`);
  unmatched.forEach((file) => console.log(`  ${file}`));
}

console.log(`\ncatalog songs with audio: ${songs.length - missing.length}/${songs.length}`);
if (missing.length) {
  console.log(`no audio for: ${missing.map((song) => `${song.title} (${song.id})`).join(', ')}`);
}

process.exit(unmatched.length ? 2 : 0);
