import { isCorrectGuess, normalizeAnswer } from './answer';
describe('normalizeAnswer', () => {
  it('lowercases and strips punctuation', () => {
    expect(normalizeAnswer('  Last Nite! ')).toBe('last nite');
  });
  it('keeps numbers so "12:51" survives as "12 51"', () => {
    expect(normalizeAnswer('12:51')).toBe('12 51');
  });
  it('strips accents', () => {
    expect(normalizeAnswer('Café')).toBe('cafe');
  });
});
describe('isCorrectGuess', () => {
  it('accepts an exact match regardless of case', () => {
    expect(isCorrectGuess('reptilia', 'Reptilia')).toBe(true);
  });
  it('accepts the title without a leading article', () => {
    expect(isCorrectGuess('adults are talking', 'The Adults Are Talking')).toBe(true);
    expect(isCorrectGuess('The Adults Are Talking', 'The Adults Are Talking')).toBe(true);
  });
  it('accepts spacing variants of numbered titles', () => {
    expect(isCorrectGuess('12 51', '12:51')).toBe(true);
    expect(isCorrectGuess('1251', '12:51')).toBe(true);
  });
  it('rejects wrong answers and empty input', () => {
    expect(isCorrectGuess('juicebox', 'Reptilia')).toBe(false);
    expect(isCorrectGuess('   ', 'Reptilia')).toBe(false);
  });
  it('rejects partial titles', () => {
    expect(isCorrectGuess('reptil', 'Reptilia')).toBe(false);
  });
  it('accepts a single missing letter', () => {
    expect(isCorrectGuess('conqust', 'Conquest')).toBe(true);
    expect(isCorrectGuess('machin', 'Machine')).toBe(true);
  });
  it('accepts a transposed pair', () => {
    expect(isCorrectGuess('machien', 'Machine')).toBe(true);
  });
  it('accepts a typo in a real catalog title', () => {
    expect(isCorrectGuess('reptila', 'Reptilia')).toBe(true);
    expect(isCorrectGuess('juicebx', 'Juicebox')).toBe(true);
  });
  it('accepts typos in the long Reality Awaits and Comedown Machine titles', () => {
    expect(isCorrectGuess('the fruits of conqust', 'The Fruits of Conquest')).toBe(true);
    expect(isCorrectGuess("80's comedown machin", "80's Comedown Machine")).toBe(true);
  });
  it('accepts a distinctive word from a long title', () => {
    expect(isCorrectGuess('conquest', 'The Fruits of Conquest')).toBe(true);
    expect(isCorrectGuess('machin', "80's Comedown Machine")).toBe(true);
  });
  it('does not accept short generic words as titles', () => {
    expect(isCorrectGuess('love', 'Falling Out of Love')).toBe(false);
    expect(isCorrectGuess('time', 'All the Time')).toBe(false);
  });
});
