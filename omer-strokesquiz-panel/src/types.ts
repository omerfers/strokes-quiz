/** A song the quiz can ask about. Mirrors the catalog served by the data source. */
export interface Song {
  id: string;
  title: string;
  album: string;
  albumKey: string;
  year: number;
  /** Seconds to skip at the start of the clip before the music actually begins. */
  startOffsetSeconds: number;
  /** Bundled clip URL, resolved at runtime. */
  clipUrl?: string;
}

export interface QuizOptions {
  /** How many songs make up a round. */
  rounds: number;
  /** Seconds of audio the player hears before guessing. */
  clipLengthSeconds: number;
  /** Seconds of audio played once the answer is revealed. */
  revealSeconds: number;
  /** Extra lead-in skipped for every song (fine-tuning knob). */
  extraIntroSkipSeconds: number;
  /** Guesses before the "reveal answer" button is pushed in your face. */
  maxGuesses: number;
  /** Show a generated album cover during the reveal. */
  showAlbumArt: boolean;
  /** Show album/year hints after a wrong guess. */
  showHints: boolean;
  /** Credit line in the footer. Must show your name for the course requirement. */
  credit: string;
}

export const DEFAULT_OPTIONS: QuizOptions = {
  rounds: 10,
  clipLengthSeconds: 10,
  revealSeconds: 15,
  extraIntroSkipSeconds: 0,
  maxGuesses: 3,
  showAlbumArt: true,
  showHints: true,
  credit: 'Developed by Omer — Fall 2026',
};
