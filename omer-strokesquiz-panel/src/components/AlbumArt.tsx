import React from 'react';
import { css } from '@emotion/css';
import { Song } from '../types';

/**
 * Generated cover art, so no copyrighted album images ship with the plugin.
 * If you want real covers later, drop <song-id>.jpg in src/img and render it here.
 */
const ART: Record<string, { from: string; to: string; ink: string }> = {
  'is-this-it': { from: '#4b5563', to: '#0b0f19', ink: '#e5e7eb' },
  'room-on-fire': { from: '#9a3412', to: '#0b0f19', ink: '#fdba74' },
  'first-impressions-of-earth': { from: '#1e3a8a', to: '#0b0f19', ink: '#93c5fd' },
  angles: { from: '#581c87', to: '#0b0f19', ink: '#d8b4fe' },
  'comedown-machine': { from: '#115e59', to: '#0b0f19', ink: '#5eead4' },
  'the-new-abnormal': { from: '#831843', to: '#0b0f19', ink: '#f9a8d4' },
};

const FALLBACK = { from: '#374151', to: '#0b0f19', ink: '#e5e7eb' };

const styles = {
  art: css`
    position: relative;
    aspect-ratio: 1 / 1;
    width: 100%;
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
      0 18px 40px rgba(0, 0, 0, 0.45),
      inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  `,
  groove: css`
    position: absolute;
    inset: 0;
    background: repeating-radial-gradient(
      circle at 50% 50%,
      rgba(255, 255, 255, 0.055) 0px,
      rgba(255, 255, 255, 0.055) 1px,
      rgba(0, 0, 0, 0) 2px,
      rgba(0, 0, 0, 0) 6px
    );
    opacity: 0.7;
    pointer-events: none;
  `,
  label: css`
    position: absolute;
    inset: 12%;
    border-radius: 50%;
    background: radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.55) 0 28%, rgba(0, 0, 0, 0.18) 29%, rgba(0, 0, 0, 0) 62%);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  `,
  initials: css`
    font-size: clamp(18px, 14cqw, 64px);
    font-weight: 800;
    letter-spacing: 0.08em;
    text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);
  `,
  albumPill: css`
    position: absolute;
    left: 50%;
    bottom: 5%;
    transform: translateX(-50%);
    max-width: 88%;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
  `,
};

function initialsFor(album: string): string {
  return album
    .split(/\s+/)
    .filter((w) => !/^(of|the|a|an|and)$/i.test(w))
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function AlbumArt({ song }: { song: Song }) {
  const art = ART[song.albumKey] ?? FALLBACK;

  return (
    <div
      className={styles.art}
      style={{
        background: `linear-gradient(145deg, ${art.from} 0%, ${art.to} 78%)`,
        containerType: 'inline-size',
      }}
      data-testid="strokes-album-art"
    >
      <div className={styles.groove} />
      <div className={styles.label}>
        <span className={styles.initials} style={{ color: art.ink }}>
          {initialsFor(song.album)}
        </span>
      </div>
      <div className={styles.albumPill} style={{ color: art.ink }}>
        {song.album}
      </div>
    </div>
  );
}
