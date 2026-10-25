import catalog from './catalog.json';
interface Entry {
  id: string;
  title: string;
  album: string;
  year: number;
  releaseType: string;
  startOffsetSeconds: number;
}
const songs = catalog as Entry[];
describe('song catalog', () => {
  it('contains songs', () => {
    expect(songs.length).toBeGreaterThan(0);
  });
  it('has a unique id per song', () => {
    expect(new Set(songs.map((s) => s.id)).size).toBe(songs.length);
  });
  it('covers all eight releases, including the EP and Reality Awaits', () => {
    const albums = Array.from(new Set(songs.map((s) => s.album)));
    expect(albums).toHaveLength(8);
    expect(albums).toEqual(
      expect.arrayContaining([
        'Is This It',
        'Room on Fire',
        'First Impressions of Earth',
        'Angles',
        'Comedown Machine',
        'Future Present Past',
        'The New Abnormal',
        'Reality Awaits',
      ])
    );
  });
  it('tags the EP correctly and dates every release', () => {
    const ep = songs.filter((s) => s.album === 'Future Present Past');
    expect(ep.length).toBeGreaterThan(0);
    ep.forEach((song) => {
      expect(song.releaseType).toBe('EP');
      expect(song.year).toBe(2016);
    });
    const realityAwaits = songs.filter((s) => s.album === 'Reality Awaits');
    expect(realityAwaits.length).toBeGreaterThan(0);
    realityAwaits.forEach((song) => {
      expect(song.releaseType).toBe('Album');
      expect(song.year).toBe(2026);
    });
  });
  it('skips the Room on Fire lead-in', () => {
    const roomOnFire = songs.filter((s) => s.album === 'Room on Fire');
    expect(roomOnFire.length).toBeGreaterThan(0);
    roomOnFire.forEach((song) => {
      expect(song.startOffsetSeconds).toBeGreaterThan(0);
    });
  });
  it('starts other albums at zero', () => {
    songs
      .filter((s) => s.album !== 'Room on Fire')
      .forEach((song) => {
        expect(song.startOffsetSeconds).toBe(0);
      });
  });
});
