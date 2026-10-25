import { isCorrectGuess, maskTitle, normalizeAnswer } from './answer';

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
});

describe('maskTitle', () => {
  it('keeps the first letter of each word', () => {
    expect(maskTitle('Last Nite')).toBe('L___   N___');
  });
});
