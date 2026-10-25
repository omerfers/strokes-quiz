import { buildQueue, shuffle } from './queue';
const items = ['a', 'b', 'c', 'd', 'e'];
describe('buildQueue', () => {
  it('returns the requested number of rounds', () => {
    expect(buildQueue(items, 3)).toHaveLength(3);
  });
  it('honours rounds larger than the catalog by reshuffling', () => {
    const queue = buildQueue(items, 12);
    expect(queue).toHaveLength(12);
    expect(queue.every((item) => items.includes(item))).toBe(true);
  });
  it('never repeats a song before the pool is exhausted', () => {
    const queue = buildQueue(items, items.length);
    expect(new Set(queue).size).toBe(items.length);
  });
  it('handles an empty catalog without throwing', () => {
    expect(buildQueue([], 5)).toEqual([]);
  });
  it('treats invalid round counts as a single round', () => {
    expect(buildQueue(items, 0)).toHaveLength(1);
    expect(buildQueue(items, Number.NaN)).toHaveLength(1);
  });
});
describe('shuffle', () => {
  it('does not mutate the input', () => {
    const input = [...items];
    shuffle(input);
    expect(input).toEqual(items);
  });
  it('keeps every element', () => {
    expect([...shuffle(items)].sort()).toEqual([...items].sort());
  });
});
