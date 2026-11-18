export function normalizeAnswer(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
const IGNORED_WORDS = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'and', 'or']);
function stripSmallWords(value: string): string {
  return value
    .split(/\s+/)
    .filter((word) => !IGNORED_WORDS.has(word))
    .join(' ');
}
function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }
  return dp[a.length][b.length];
}
function matches(guess: string, title: string): boolean {
  if (!title) {
    return false;
  }
  if (guess === title || guess.replace(/\s+/g, '') === title.replace(/\s+/g, '')) {
    return true;
  }
  const limit = title.length >= 10 ? 2 : title.length >= 4 ? 1 : 0;
  return editDistance(guess, title) <= limit;
}
function wordMatches(guess: string, title: string): boolean {
  if (guess.includes(' ') || guess.length < 6) {
    return false;
  }
  return title
    .split(/\s+/)
    .filter((word) => word.length >= 6)
    .some((word) => editDistance(guess, word) <= (word.length >= 10 ? 2 : 1));
}
export function isCorrectGuess(guess: string, title: string): boolean {
  const g = stripSmallWords(normalizeAnswer(guess));
  if (!g) {
    return false;
  }
  const candidates = new Set([
    stripSmallWords(normalizeAnswer(title)),
    stripSmallWords(normalizeAnswer(title.replace(/\(.*?\)/g, ''))),
  ]);
  return [...candidates].some((candidate) => matches(g, candidate) || wordMatches(g, candidate));
}
export function wordCount(title: string): number {
  return title.split(/\s+/).filter(Boolean).length;
}
