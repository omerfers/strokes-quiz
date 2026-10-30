import React from 'react';
import { css } from '@emotion/css';
import { Song } from '../types';
const styles = {
  cover: css`
    display: block;
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    border-radius: 2px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    box-shadow: 0 24px 50px rgba(0, 0, 0, 0.55);
  `,
  fallback: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: 2px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: #171313;
    color: #efe9e4;
    text-align: center;
    padding: 12px;
    box-sizing: border-box;
  `,
  initials: css`
    font-size: 40px;
    font-weight: 600;
    letter-spacing: 0.04em;
  `,
  albumName: css`
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(239, 233, 228, 0.58);
  `,
};
function initialsFor(album: string): string {
  return album
    .split(/\s+/)
    .filter((word) => !/^(of|the|a|an|and)$/i.test(word))
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
export function AlbumArt({ song, artworkUrl }: { song: Song; artworkUrl?: string }) {
  const url = artworkUrl;
  if (!url) {
    return (
      <div className={styles.fallback} data-testid="strokes-album-art">
        <span className={styles.initials}>{initialsFor(song.album)}</span>
        <span className={styles.albumName}>{song.album}</span>
      </div>
    );
  }
  return <img className={styles.cover} src={url} alt={`${song.album} album cover`} data-testid="strokes-album-art" />;
}
