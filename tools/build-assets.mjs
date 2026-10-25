#!/usr/bin/env node
/**
 * Single source of truth for the song catalog + placeholder audio.
 *
 * Run:  node tools/build-assets.mjs
 *
 * Writes:
 *   panel/src/catalog.json           - song metadata used by the panel (fallback + merge)
 *   datasource/src/songs.json        - the "mock JSON" the data source serves
 *   panel/src/audio/clips/<id>.wav   - placeholder clips (only created if missing)
 *
 * Real audio: drop <id>.mp3 (or .ogg/.m4a) into panel/src/audio/clips/ and it
 * wins over the .wav placeholder automatically (see src/audio/index.ts).
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PANEL = join(ROOT, 'omer-strokesquiz-panel');
const DS = join(ROOT, 'omer-strokesquiz-datasource');
const CLIPS = join(PANEL, 'src', 'audio', 'clips');

/**
 * Room on Fire tracks have a longer lead-in before the music actually starts,
 * so they get a non-zero startOffsetSeconds. Tweaked per track where needed.
 */
const ROOM_ON_FIRE_OFFSET = 1.2;

const catalog = [
  // Is This It (2001)
  { id: 'is-this-it', title: 'Is This It', album: 'Is This It', year: 2001 },
  { id: 'last-nite', title: 'Last Nite', album: 'Is This It', year: 2001 },
  { id: 'hard-to-explain', title: 'Hard to Explain', album: 'Is This It', year: 2001 },

  // Room on Fire (2003) - intro offset exception
  { id: 'what-ever-happened', title: 'What Ever Happened?', album: 'Room on Fire', year: 2003, startOffsetSeconds: 1.6 },
  { id: 'reptilia', title: 'Reptilia', album: 'Room on Fire', year: 2003, startOffsetSeconds: 1.0 },
  { id: '12-51', title: '12:51', album: 'Room on Fire', year: 2003, startOffsetSeconds: 1.3 },

  // First Impressions of Earth (2006)
  { id: 'you-only-live-once', title: 'You Only Live Once', album: 'First Impressions of Earth', year: 2006 },
  { id: 'juicebox', title: 'Juicebox', album: 'First Impressions of Earth', year: 2006 },
  { id: 'heart-in-a-cage', title: 'Heart in a Cage', album: 'First Impressions of Earth', year: 2006 },

  // Angles (2011)
  { id: 'machu-picchu', title: 'Machu Picchu', album: 'Angles', year: 2011 },
  { id: 'under-cover-of-darkness', title: 'Under Cover of Darkness', album: 'Angles', year: 2011 },
  { id: 'taken-for-a-fool', title: 'Taken for a Fool', album: 'Angles', year: 2011 },

  // Comedown Machine (2013)
  { id: 'tap-out', title: 'Tap Out', album: 'Comedown Machine', year: 2013 },
  { id: 'one-way-trigger', title: 'One Way Trigger', album: 'Comedown Machine', year: 2013 },
  { id: 'call-it-fate', title: 'Call It Fate, Call It Karma', album: 'Comedown Machine', year: 2013 },

  // The New Abnormal (2020)
  { id: 'the-adults-are-talking', title: 'The Adults Are Talking', album: 'The New Abnormal', year: 2020 },
  { id: 'at-the-door', title: 'At the Door', album: 'The New Abnormal', year: 2020 },
  { id: 'ode-to-the-mets', title: 'Ode to the Mets', album: 'The New Abnormal', year: 2020 },
].map((s) => ({
  ...s,
  // Room on Fire exception: fall back to the album default when not set explicitly.
  startOffsetSeconds: s.startOffsetSeconds ?? (s.album === 'Room on Fire' ? ROOM_ON_FIRE_OFFSET : 0),
  albumKey: s.album.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
}));

// ---------------------------------------------------------------- metadata ---
mkdirSync(join(PANEL, 'src'), { recursive: true });
mkdirSync(join(DS, 'src'), { recursive: true });

const meta = catalog.map(({ id, title, album, albumKey, year, startOffsetSeconds }) => ({
  id,
  title,
  album,
  albumKey,
  year,
  startOffsetSeconds,
}));

writeFileSync(join(PANEL, 'src', 'catalog.json'), JSON.stringify(meta, null, 2) + '\n');
writeFileSync(
  join(DS, 'src', 'songs.json'),
  JSON.stringify({ generatedBy: 'tools/build-assets.mjs', songs: meta }, null, 2) + '\n'
);

// ------------------------------------------------------- placeholder audio ---
// Distinct arpeggio per song so the quiz is actually playable in development.
mkdirSync(CLIPS, { recursive: true });

const SAMPLE_RATE = 16000;
const SECONDS = 20;

const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16];

function writeWav(path, samples) {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(dataSize, 40);
  samples.forEach((s, i) => {
    const clamped = Math.max(-1, Math.min(1, s));
    buf.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  });
  writeFileSync(path, buf);
}

function renderClip({ index, startOffsetSeconds }) {
  const total = SAMPLE_RATE * SECONDS;
  const out = new Float32Array(total);
  const leadIn = Math.floor(startOffsetSeconds * SAMPLE_RATE);
  const root = 146.83 * Math.pow(2, (PENTATONIC[index % PENTATONIC.length] || 0) / 12);
  const noteMs = 190 + (index % 5) * 25;
  const noteLen = Math.floor((SAMPLE_RATE * noteMs) / 1000);
  const bassStep = noteLen * 4;

  for (let start = leadIn, n = 0; start < total; start += noteLen, n++) {
    const degree = PENTATONIC[(n * 3 + index) % PENTATONIC.length];
    const freq = root * 2 * Math.pow(2, degree / 12);
    const end = Math.min(start + noteLen, total);
    for (let i = start; i < end; i++) {
      const t = (i - start) / SAMPLE_RATE;
      const env = Math.min(1, t * 60) * Math.exp(-t * 7);
      const wobble = 1 + 0.004 * Math.sin(2 * Math.PI * 5.5 * t);
      let v = 0.22 * Math.sin(2 * Math.PI * freq * wobble * t);
      v += 0.08 * Math.sin(2 * Math.PI * freq * 2 * t);
      v += 0.04 * Math.sin(2 * Math.PI * freq * 3 * t);
      out[i] += v * env;
    }
  }

  // simple bass pulse so the groove differs per song
  for (let start = leadIn; start < total; start += bassStep) {
    const end = Math.min(start + bassStep / 2, total);
    for (let i = start; i < end; i++) {
      const t = (i - start) / SAMPLE_RATE;
      const env = Math.min(1, t * 40) * Math.exp(-t * 4);
      out[i] += 0.18 * Math.sin(2 * Math.PI * (root / 2) * t) * env;
    }
  }

  // fade in/out so there are no clicks
  const fade = SAMPLE_RATE * 0.05;
  for (let i = 0; i < fade; i++) {
    out[i] *= i / fade;
    out[total - 1 - i] *= i / fade;
  }
  return out;
}

let created = 0;
catalog.forEach((song, index) => {
  const path = join(CLIPS, `${song.id}.wav`);
  if (existsSync(path)) {
    return;
  }
  writeWav(path, renderClip({ index, startOffsetSeconds: song.startOffsetSeconds }));
  created++;
});

console.log(`catalog: ${catalog.length} songs`);
console.log(`placeholder clips created: ${created} (skipped existing)`);
console.log(`room on fire offset: ${ROOM_ON_FIRE_OFFSET}s`);
