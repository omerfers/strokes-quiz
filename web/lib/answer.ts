const ARTICLES = /^(the|a|an)\s+/;

export function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(ARTICLES, "")
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

export function isCorrectGuess(guess: string, title: string): boolean {
  const value = normalize(guess);
  if (!value) return false;
  return matches(value, normalize(title)) || matches(value, normalize(title.replace(/\(.*?\)/g, "")));
}
