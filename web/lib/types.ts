export interface Song {
  id: string;
  itunesTrackId?: number;
  title: string;
  album: string;
  albumKey: string;
  year: number;
  releaseType: string;
  startOffsetSeconds: number;
}

export type ClipState = "idle" | "playing" | "paused";
