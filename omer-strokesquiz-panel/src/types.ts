export interface Song {
  id: string;
  title: string;
  album: string;
  albumKey: string;
  year: number;
  startOffsetSeconds: number;
  itunesTrackId?: number;
}
export interface QuizOptions {
  rounds: number;
  clipLengthSeconds: number;
  revealSeconds: number;
  extraIntroSkipSeconds: number;
  maxGuesses: number;
  showAlbumArt: boolean;
  showHints: boolean;
  showBackground: boolean;
  backgroundDim: number;
  credit: string;
}
export const DEFAULT_OPTIONS: QuizOptions = {
  rounds: 15,
  clipLengthSeconds: 5,
  revealSeconds: 8,
  extraIntroSkipSeconds: 0,
  maxGuesses: 2,
  showAlbumArt: true,
  showHints: true,
  showBackground: true,
  backgroundDim: 72,
  credit: 'Developed by Ömer Faruk Ersakay',
};
