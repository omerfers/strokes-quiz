export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export function buildQueue<T>(songs: T[], rounds: number): T[] {
  if (songs.length === 0) {
    return [];
  }
  const requested = Number.isFinite(rounds) ? Math.floor(rounds) : 1;
  const target = Math.max(1, requested);
  const queue: T[] = [];
  let pool: T[] = [];
  while (queue.length < target) {
    if (pool.length === 0) {
      pool = shuffle(songs);
    }
    const next = pool.pop();
    if (next === undefined) {
      break;
    }
    queue.push(next);
  }
  return queue;
}
