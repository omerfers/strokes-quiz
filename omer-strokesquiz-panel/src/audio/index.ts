/**
 * Bundles every clip under ./clips and exposes it by song id.
 *
 * Format precedence: mp3 > m4a > ogg > wav, so a real mp3 always wins over the
 * checked-in wav placeholder.
 */
const PRIORITY: Record<string, number> = { mp3: 3, m4a: 2, ogg: 1, wav: 0 };

const modules = require.context('./clips', false, /\.(mp3|m4a|ogg|wav)$/);

const clips: Record<string, string> = {};

modules.keys().forEach((key) => {
  const fileName = key.replace('./', '');
  const dot = fileName.lastIndexOf('.');
  const id = fileName.slice(0, dot);
  const ext = fileName.slice(dot + 1).toLowerCase();

  const mod = modules(key);
  const url = typeof mod === 'string' ? mod : mod.default;
  if (!url) {
    return;
  }

  const currentExt = clips[id] ? Object.keys(PRIORITY).find((e) => clips[id].toLowerCase().endsWith(`.${e}`)) : undefined;
  const currentPriority = currentExt !== undefined ? PRIORITY[currentExt] : -1;

  if (!clips[id] || PRIORITY[ext] > currentPriority) {
    clips[id] = url;
  }
});

export function getClipUrl(songId: string): string | undefined {
  return clips[songId];
}

export function listBundledClips(): string[] {
  return Object.keys(clips);
}
