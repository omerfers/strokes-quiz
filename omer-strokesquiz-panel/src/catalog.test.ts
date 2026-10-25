import catalog from './catalog.json';

interface Entry {
  id: string;
  album: string;
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
