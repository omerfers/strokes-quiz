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
function stripArticles(value: string): string {
  return value.replace(/^(the|a|an)\s+/, '');
}
export function isCorrectGuess(guess: string, title: string): boolean {
  const g = normalizeAnswer(guess);
  const t = normalizeAnswer(title);
  if (!g) {
    return false;
  }
  if (g === t || g.replace(/\s+/g, '') === t.replace(/\s+/g, '')) {
    return true;
  }
  return stripArticles(g) === stripArticles(t);
}
export function maskTitle(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word[0].toUpperCase()}${'_'.repeat(Math.max(0, word.length - 1))}`)
    .join('   ');
}
export function wordCount(title: string): number {
  return title.split(/\s+/).filter(Boolean).length;
}
