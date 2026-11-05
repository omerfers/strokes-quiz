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

export function isCorrectGuess(guess: string, title: string): boolean {
  const value = normalize(guess);
  if (!value) return false;
  return value === normalize(title) || value === normalize(title.replace(/\(.*?\)/g, ""));
}
