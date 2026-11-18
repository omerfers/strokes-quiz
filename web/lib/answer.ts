const IGNORED_WORDS = new Set(["the", "a", "an", "of", "in", "on", "at", "to", "and", "or"]);

function stripSmallWords(value: string): string {
  return value
    .split(/\s+/)
    .filter((word) => !IGNORED_WORDS.has(word))
    .join(" ");
}

export function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
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
  if (!title) return false;
  if (guess === title || guess.replace(/\s+/g, "") === title.replace(/\s+/g, "")) {
    return true;
  }
  const limit = title.length >= 10 ? 2 : title.length >= 4 ? 1 : 0;
  return editDistance(guess, title) <= limit;
}

function wordMatches(guess: string, title: string): boolean {
  if (guess.includes(" ") || guess.length < 6) return false;
  return title
    .split(/\s+/)
    .filter((word) => word.length >= 6)
    .some((word) => editDistance(guess, word) <= (word.length >= 10 ? 2 : 1));
}

function similarity(a: string, b: string): number {
  const longest = Math.max(a.length, b.length);
  return longest === 0 ? 0 : 1 - editDistance(a, b) / longest;
}

function tokenCoverage(guess: string, title: string): boolean {
  const guessWords = guess.split(/\s+/).filter(Boolean);
  const titleWords = title.split(/\s+/).filter(Boolean);
  if (guessWords.length === 0 || titleWords.length === 0) return false;
  let matchedChars = 0;
  let hasDistinctiveMatch = false;
  for (const titleWord of titleWords) {
    const hit = guessWords.some(
      (guessWord) => editDistance(guessWord, titleWord) <= (titleWord.length >= 10 ? 2 : 1),
    );
    if (hit) {
      matchedChars += titleWord.length;
      if (titleWord.length >= 6) hasDistinctiveMatch = true;
    }
  }
  const titleChars = titleWords.reduce((total, word) => total + word.length, 0);
  return hasDistinctiveMatch && matchedChars / titleChars >= 0.55;
}

export function isCorrectGuess(guess: string, title: string): boolean {
  const value = stripSmallWords(normalize(guess));
  if (!value) return false;
  const candidates = [
    stripSmallWords(normalize(title)),
    stripSmallWords(normalize(title.replace(/\(.*?\)/g, ""))),
  ];
  return candidates.some(
    (candidate) =>
      matches(value, candidate) ||
      wordMatches(value, candidate) ||
      tokenCoverage(value, candidate) ||
      similarity(value, candidate) >= 0.82,
  );
}
