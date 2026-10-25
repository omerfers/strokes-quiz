#!/usr/bin/env node
import { mkdirSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PANEL = join(ROOT, 'omer-strokesquiz-panel');
const DS = join(ROOT, 'omer-strokesquiz-datasource');
const CLIPS = join(PANEL, 'src', 'audio', 'clips');
const ROOM_ON_FIRE_OFFSET = 1.2;
const ROOM_ON_FIRE_OVERRIDES = {
  'what-ever-happened': 1.6,
  reptilia: 1.0,
  '12-51': 1.3,
};
const ALBUMS = [
  {
    album: 'Is This It',
    year: 2001,
    tracks: [
      'Is This It',
      'The Modern Age',
      'Soma',
      'Barely Legal',
      'Someday',
      'Alone, Together',
      'Last Nite',
      'Hard to Explain',
      'Trying Your Luck',
      'Take It or Leave It',
      'When It Started',
    ],
  },
  {
    album: 'Room on Fire',
    year: 2003,
    tracks: [
      'What Ever Happened?',
      'Reptilia',
      'Automatic Stop',
      '12:51',
      'You Talk Way Too Much',
      'Between Love & Hate',
      'Meet Me in the Bathroom',
      'Under Control',
      'The Way It Is',
      'The End Has No End',
      "I Can't Win",
    ],
  },
  {
    album: 'First Impressions of Earth',
    year: 2006,
    tracks: [
      'You Only Live Once',
      'Juicebox',
      'Heart in a Cage',
      'Razorblade',
      'On the Other Side',
      'Vision of Division',
      'Ask Me Anything',
      'Electricityscape',
      'Killing Lies',
      'Fear of Sleep',
      '15 Minutes',
      'Ize of the World',
      'Evening Sun',
      'Red Light',
    ],
  },
  {
    album: 'Angles',
    year: 2011,
    tracks: [
      'Machu Picchu',
      'Under Cover of Darkness',
      'Two Kinds of Happiness',
      "You're So Right",
      'Taken for a Fool',
      'Games',
      'Call Me Back',
      'Gratisfaction',
      'Metabolism',
      'Life Is Simple in the Moonlight',
    ],
  },
  {
    album: 'Comedown Machine',
    year: 2013,
    tracks: [
      'Tap Out',
      'All the Time',
      'One Way Trigger',
      'Welcome to Japan',
      "80's Comedown Machine",
      '50/50',
      'Slow Animals',
      'Partners in Crime',
      'Chances',
      'Happy Ending',
      'Call It Fate, Call It Karma',
    ],
  },
  {
    album: 'Future Present Past',
    year: 2016,
    kind: 'EP',
    tracks: ['Drag Queen', 'Oblivius', 'Threat of Joy'],
  },
  {
    album: 'The New Abnormal',
    year: 2020,
    tracks: [
      'The Adults Are Talking',
      'Selfless',
      'Brooklyn Bridge to Chorus',
      'Bad Decisions',
      'Eternal Summer',
      'At the Door',
      'Why Are Sundays So Depressing',
      'Not the Same Anymore',
      'Ode to the Mets',
    ],
  },
  {
    album: 'Reality Awaits',
    year: 2026,
    tracks: [
      'Psycho Shit',
      "Dine N'Dash",
      'Lonely in the Future',
      'Falling Out of Love',
      'Going to Babble On',
      'Going Shopping',
      "Liar's Remorse",
      'The Fruits of Conquest',
      'Tyrants of the Mellow Moon',
    ],
  },
];
const DEMO_PLACEHOLDERS = new Set([]);
function slugify(title) {
  const overrides = {
    "Dine N'Dash": 'dine-n-dash',
  };
  if (overrides[title]) {
    return overrides[title];
  }
  return title
    .toLowerCase()
    .replace(/['\u2019]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
const catalog = ALBUMS.flatMap(({ album, year, tracks, kind }) =>
  tracks.map((title) => {
    const id = slugify(title);
    const startOffsetSeconds = album === 'Room on Fire' ? (ROOM_ON_FIRE_OVERRIDES[id] ?? ROOM_ON_FIRE_OFFSET) : 0;
    return {
      id,
      title,
      album,
      albumKey: album.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      year,
      releaseType: kind ?? 'Album',
      startOffsetSeconds,
      demoPlaceholder: DEMO_PLACEHOLDERS.has(id),
    };
  })
);
const duplicates = catalog.map((s) => s.id).filter((id, i, all) => all.indexOf(id) !== i);
if (duplicates.length) {
  throw new Error(`Duplicate song ids: ${[...new Set(duplicates)].join(', ')}`);
}
mkdirSync(join(PANEL, 'src'), { recursive: true });
mkdirSync(join(DS, 'src'), { recursive: true });
const meta = catalog.map(({ id, title, album, albumKey, year, releaseType, startOffsetSeconds }) => ({
  id,
  title,
  album,
  albumKey,
  year,
  releaseType,
  startOffsetSeconds,
}));
writeFileSync(join(PANEL, 'src', 'catalog.json'), JSON.stringify(meta, null, 2) + '\n');
writeFileSync(
  join(DS, 'src', 'songs.json'),
  JSON.stringify({ generatedBy: 'tools/build-assets.mjs', songs: meta }, null, 2) + '\n'
);
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
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(dataSize, 40);
  samples.forEach((s, i) => {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), 44 + i * 2);
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
  for (let start = leadIn; start < total; start += bassStep) {
    const end = Math.min(start + bassStep / 2, total);
    for (let i = start; i < end; i++) {
      const t = (i - start) / SAMPLE_RATE;
      const env = Math.min(1, t * 40) * Math.exp(-t * 4);
      out[i] += 0.18 * Math.sin(2 * Math.PI * (root / 2) * t) * env;
    }
  }
  const fade = SAMPLE_RATE * 0.05;
  for (let i = 0; i < fade; i++) {
    out[i] *= i / fade;
    out[total - 1 - i] *= i / fade;
  }
  return out;
}
let created = 0;
catalog
  .filter((song) => song.demoPlaceholder)
  .forEach((song, index) => {
    const path = join(CLIPS, `${song.id}.wav`);
    if (existsSync(path)) {
      return;
    }
    writeWav(path, renderClip({ index, startOffsetSeconds: song.startOffsetSeconds }));
    created++;
  });
const perAlbum = ALBUMS.map((a) => `${a.album}: ${a.tracks.length}`).join(', ');
console.log(`catalog: ${catalog.length} songs across ${ALBUMS.length} releases`);
console.log(perAlbum);
console.log(`placeholder clips created: ${created} (skipped existing)`);
console.log(`demo placeholders: ${DEMO_PLACEHOLDERS.size}`);
console.log(`room on fire default offset: ${ROOM_ON_FIRE_OFFSET}s`);
const knownIds = new Set(catalog.map((song) => song.id));
const orphans = readdirSync(CLIPS)
  .filter((file) => /\.(mp3|m4a|ogg|wav)$/i.test(file))
  .map((file) => file.replace(/\.[^.]+$/, ''))
  .filter((id) => !knownIds.has(id));
if (orphans.length) {
  console.warn(`warning: clips with no matching song id: ${orphans.join(', ')}`);
}
