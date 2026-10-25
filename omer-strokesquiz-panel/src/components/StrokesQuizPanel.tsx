import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PanelProps } from '@grafana/data';
import { css, cx, keyframes } from '@emotion/css';
import { Button, Icon, Input, useStyles2, useTheme2 } from '@grafana/ui';
import { ClipPlayer } from '../audio/player';
import { resolveSongs } from '../songs';
import { buildQueue } from '../utils/queue';
import { QuizOptions, Song } from '../types';
import { isCorrectGuess, maskTitle } from '../utils/answer';
import { AlbumArt } from './AlbumArt';

interface Props extends PanelProps<QuizOptions> {}

type Phase = 'idle' | 'playing' | 'reveal' | 'finished';
type Verdict = 'none' | 'wrong' | 'correct';

const equalize = keyframes`
  0%, 100% { transform: scaleY(0.25); }
  50% { transform: scaleY(1); }
`;

const popIn = keyframes`
  from { opacity: 0; transform: translateY(10px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const shake = keyframes`
  10%, 90% { transform: translateX(-1px); }
  20%, 80% { transform: translateX(2px); }
  30%, 50%, 70% { transform: translateX(-4px); }
  40%, 60% { transform: translateX(4px); }
`;

const getStyles = (theme: ReturnType<typeof useTheme2>) => ({
  root: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 320px;
    padding: 14px 16px 10px;
    box-sizing: border-box;
    color: ${theme.colors.text.primary};
    background:
      radial-gradient(120% 90% at 12% 0%, ${theme.colors.primary.transparent} 0%, transparent 55%),
      ${theme.colors.background.canvas};
    border-radius: ${theme.shape.radius.default};
    overflow: hidden;
  `,
  header: css`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    flex-wrap: wrap;
    min-height: 0;
  `,
  scoreboard: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  scorePill: css`
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 999px;
    background: ${theme.colors.background.secondary};
    border: 1px solid ${theme.colors.border.weak};
    font-variant-numeric: tabular-nums;
  `,
  scoreValue: css`
    font-size: 20px;
    font-weight: 700;
    color: ${theme.colors.primary.text};
  `,
  scoreLabel: css`
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: ${theme.colors.text.secondary};
  `,
  streak: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: ${theme.colors.warning.text};
  `,
  stage: css`
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 14px;
    padding: 14px 0 8px;
    overflow-y: auto;
  `,
  centerCard: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 12px;
    max-width: 460px;
    animation: ${popIn} 220ms ease-out;
  `,
  idleHeadline: css`
    font-size: clamp(20px, 3.2cqw, 30px);
    font-weight: 800;
    margin: 0;
    line-height: 1.15;
    background: linear-gradient(92deg, ${theme.colors.text.primary}, ${theme.colors.primary.text});
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  `,
  muted: css`
    color: ${theme.colors.text.secondary};
    font-size: 13px;
    margin: 0;
  `,
  playingCard: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    width: 100%;
    max-width: 520px;
    animation: ${popIn} 220ms ease-out;
  `,
  eq: css`
    display: flex;
    align-items: flex-end;
    gap: 4px;
    height: 34px;
    color: ${theme.colors.primary.text};
    span {
      width: 5px;
      height: 100%;
      border-radius: 3px;
      background: currentColor;
      transform-origin: bottom;
      animation: ${equalize} 900ms ease-in-out infinite;
    }
    span:nth-child(2) { animation-delay: 120ms; }
    span:nth-child(3) { animation-delay: 240ms; }
    span:nth-child(4) { animation-delay: 90ms; }
    span:nth-child(5) { animation-delay: 300ms; }
    span:nth-child(6) { animation-delay: 180ms; }
    span:nth-child(7) { animation-delay: 60ms; }
  `,
  guessForm: css`
    display: flex;
    gap: 8px;
    width: 100%;
    align-items: center;
  `,
  shake: css`
    animation: ${shake} 420ms cubic-bezier(0.36, 0.07, 0.19, 0.97);
    border-color: ${theme.colors.error.border} !important;
  `,
  hintBox: css`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 12px;
    border-radius: ${theme.shape.radius.default};
    background: ${theme.colors.background.secondary};
    border: 1px dashed ${theme.colors.border.medium};
    font-size: 12px;
    color: ${theme.colors.text.secondary};
    text-align: left;
  `,
  mask: css`
    font-family: ${theme.typography.fontFamilyMonospace};
    letter-spacing: 0.12em;
    color: ${theme.colors.text.primary};
  `,
  revealCard: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    width: 100%;
    max-width: 560px;
    animation: ${popIn} 240ms ease-out;
  `,
  revealGrid: css`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 18px;
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
  `,
  artWrap: css`
    width: 148px;
    flex: 0 0 auto;
    container-type: inline-size;
  `,
  revealText: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
    text-align: left;
    min-width: 180px;
    flex: 1 1 200px;
  `,
  songTitle: css`
    font-size: clamp(20px, 2.6cqw, 28px);
    font-weight: 800;
    line-height: 1.2;
    margin: 0;
  `,
  badge: css`
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  `,
  badgeCorrect: css`
    color: ${theme.colors.success.text};
    background: ${theme.colors.success.transparent};
  `,
  badgeMiss: css`
    color: ${theme.colors.error.text};
    background: ${theme.colors.error.transparent};
  `,
  footer: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding-top: 8px;
    margin-top: 6px;
    border-top: 1px solid ${theme.colors.border.weak};
    font-size: 11px;
    color: ${theme.colors.text.disabled};
    flex-wrap: wrap;
  `,
  credit: css`
    font-weight: 600;
    letter-spacing: 0.04em;
    color: ${theme.colors.text.secondary};
  `,
  warning: css`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: ${theme.colors.warning.text};
  `,
  progressTrack: css`
    width: 100%;
    height: 4px;
    border-radius: 999px;
    background: ${theme.colors.background.secondary};
    overflow: hidden;
  `,
  progressFill: css`
    height: 100%;
    border-radius: 999px;
    background: ${theme.colors.primary.main};
    transition: width 220ms ease-out;
  `,
  bigScore: css`
    font-size: 56px;
    font-weight: 800;
    line-height: 1;
    color: ${theme.colors.primary.text};
    font-variant-numeric: tabular-nums;
  `,
  actions: css`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
  `,
});

export function StrokesQuizPanel({ options, data }: Props) {
  const theme = useTheme2();
  const styles = useStyles2(getStyles);

  const { songs, source } = useMemo(() => resolveSongs(data), [data]);
  // Only songs with a bundled clip can actually be played, so they are the only
  // ones allowed into a round. The rest of the catalog still shows in the table.
  const playableSongs = useMemo(() => songs.filter((song) => Boolean(song.clipUrl)), [songs]);

  const rounds = Math.max(1, options.rounds ?? 10);
  const clipLengthSeconds = Math.max(1, options.clipLengthSeconds ?? 10);
  const revealSeconds = Math.max(1, options.revealSeconds ?? 15);
  const extraSkip = Math.max(0, options.extraIntroSkipSeconds ?? 0);
  const maxGuesses = Math.max(1, options.maxGuesses ?? 3);
  const showHints = options.showHints ?? true;
  const showAlbumArt = options.showAlbumArt ?? true;

  // One player instance for the lifetime of the panel; the lazy initializer
  // keeps it stable across renders without touching a ref during render.
  const [player] = useState(() => new ClipPlayer());

  const [phase, setPhase] = useState<Phase>('idle');
  const [queue, setQueue] = useState<Song[]>([]);
  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState('');
  const [verdict, setVerdict] = useState<Verdict>('none');
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [score, setScore] = useState(0);
  const [played, setPlayed] = useState(0);
  const [streak, setStreak] = useState({ current: 0, best: 0 });
  const [audioWarning, setAudioWarning] = useState<string | null>(null);

  const current = queue[index] ?? null;

  useEffect(() => {
    return () => player.stop();
  }, [player]);

  const offsetFor = useCallback(
    (song: Song) => Math.max(0, (song.startOffsetSeconds ?? 0) + extraSkip),
    [extraSkip]
  );

  const playClip = useCallback(
    async (song: Song, seconds: number) => {
      const url = song.clipUrl;
      if (!url) {
        setAudioWarning(`No clip bundled for "${song.title}". Drop ${song.id}.mp3 into src/audio/clips.`);
        return;
      }
      const ok = await player.play(url, offsetFor(song), seconds);
      setAudioWarning(ok ? null : 'Playback blocked or the clip is unavailable. Check the audio file.');
    },
    [offsetFor, player]
  );

  const beginRound = useCallback(
    (song: Song) => {
      setPhase('playing');
      setGuess('');
      setVerdict('none');
      setWrongGuesses(0);
      setAudioWarning(null);
      void playClip(song, clipLengthSeconds);
    },
    [clipLengthSeconds, playClip]
  );

  const startGame = useCallback(() => {
    const nextQueue = buildQueue(playableSongs, rounds);
    if (nextQueue.length === 0) {
      return;
    }
    player.stop();
    setQueue(nextQueue);
    setIndex(0);
    setScore(0);
    setPlayed(0);
    setStreak({ current: 0, best: 0 });
    beginRound(nextQueue[0]);
  }, [beginRound, playableSongs, player, rounds]);

  const submitGuess = useCallback(
    (event: React.SyntheticEvent) => {
      event.preventDefault();
      if (phase !== 'playing' || !current || !guess.trim()) {
        return;
      }

      if (!isCorrectGuess(guess, current.title)) {
        setWrongGuesses((n) => n + 1);
        setVerdict('wrong');
        return;
      }

      setVerdict('correct');
      setScore((n) => n + 1);
      setPlayed((n) => n + 1);
      setStreak((s) => {
        const next = s.current + 1;
        return { current: next, best: Math.max(s.best, next) };
      });
      setPhase('reveal');
      void playClip(current, revealSeconds);
    },
    [current, guess, phase, playClip, revealSeconds]
  );

  const revealAnswer = useCallback(() => {
    if (phase !== 'playing' || !current) {
      return;
    }
    setVerdict('wrong');
    setPlayed((n) => n + 1);
    setStreak((s) => ({ ...s, current: 0 }));
    setPhase('reveal');
    void playClip(current, revealSeconds);
  }, [current, phase, playClip, revealSeconds]);

  const nextSong = useCallback(() => {
    player.stop();
    const nextIndex = index + 1;
    if (nextIndex >= queue.length) {
      setPhase('finished');
      return;
    }
    setIndex(nextIndex);
    beginRound(queue[nextIndex]);
  }, [beginRound, index, player, queue]);

  const progressPct = queue.length > 0 ? Math.round((played / queue.length) * 100) : 0;
  const accuracy = played > 0 ? Math.round((score / played) * 100) : 0;

  const renderScoreboard = () => (
    <div className={styles.scoreboard}>
      {streak.current > 1 && (
        <span className={styles.streak}>
          <Icon name="fire" size="sm" />
          {streak.current} in a row
        </span>
      )}
      <div className={styles.scorePill} data-testid="strokes-score">
        <span className={styles.scoreValue}>{score}</span>
        <span className={styles.scoreLabel}> of {played}</span>
      </div>
    </div>
  );

  const renderIdle = () => (
    <div className={styles.centerCard}>
      <h2 className={styles.idleHeadline}>How well do you know The Strokes?</h2>
      <p className={styles.muted}>
        {playableSongs.length} playable songs · {rounds} rounds · {clipLengthSeconds}s clips · {revealSeconds}s
        reveal
      </p>
      <Button size="lg" icon="play" onClick={startGame} disabled={playableSongs.length === 0}>
        Start the quiz
      </Button>
      {playableSongs.length === 0 && (
        <p className={styles.muted}>
          No songs with audio. Drop a clip into src/audio/clips or attach the Strokes Catalog data source.
        </p>
      )}
    </div>
  );

  const renderPlaying = () => {
    const hintAlbum = showHints && wrongGuesses >= 1;
    const hintTitle = showHints && wrongGuesses >= 2;

    return (
      <div className={styles.playingCard}>
        <div className={styles.eq} aria-hidden>
          {Array.from({ length: 7 }).map((_, i) => (
            <span key={i} />
          ))}
        </div>
        <p className={styles.muted}>
          Song {index + 1} of {queue.length} — which track is this?
        </p>

        <form className={styles.guessForm} onSubmit={submitGuess}>
          <Input
            aria-label="Song title"
            placeholder="Type the song title…"
            value={guess}
            onChange={(e) => {
              setGuess(e.currentTarget.value);
              if (verdict === 'wrong') {
                setVerdict('none');
              }
            }}
            className={cx(verdict === 'wrong' && styles.shake)}
            autoFocus
          />
          <Button type="submit" variant="primary" icon="arrow-right" disabled={!guess.trim()}>
            Guess
          </Button>
        </form>

        {hintAlbum && current && (
          <div className={styles.hintBox}>
            <span>
              Hint · Album: <strong>{current.album}</strong> ({current.year})
            </span>
            {hintTitle && (
              <span>
                Hint · Title: <span className={styles.mask}>{maskTitle(current.title)}</span>
              </span>
            )}
          </div>
        )}

        {verdict === 'wrong' && (
          <p className={styles.muted}>
            Not quite.{' '}
            {wrongGuesses >= maxGuesses ? 'Out of guesses — reveal it or keep trying.' : 'Try again.'}
          </p>
        )}

        {audioWarning && (
          <div className={styles.warning}>
            <Icon name="exclamation-triangle" size="sm" />
            {audioWarning}
          </div>
        )}

        <div className={styles.actions}>
          <Button variant="secondary" size="sm" icon="repeat" onClick={() => current && playClip(current, clipLengthSeconds)}>
            Replay clip
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon="eye-slash"
            onClick={revealAnswer}
            className={cx(wrongGuesses >= maxGuesses && css`border-color: ${theme.colors.warning.border};`)}
          >
            Reveal answer
          </Button>
        </div>
      </div>
    );
  };

  const renderReveal = () => {
    if (!current) {
      return null;
    }
    const correct = verdict === 'correct';

    return (
      <div className={styles.revealCard}>
        <span className={cx(styles.badge, correct ? styles.badgeCorrect : styles.badgeMiss)}>
          <Icon name={correct ? 'check' : 'info-circle'} size="sm" />
          {correct ? 'Correct +1' : 'The answer was'}
        </span>

        <div className={styles.revealGrid}>
          {showAlbumArt && (
            <div className={styles.artWrap}>
              <AlbumArt song={current} />
            </div>
          )}
          <div className={styles.revealText}>
            <h3 className={styles.songTitle} data-testid="strokes-song-title">
              {current.title}
            </h3>
            <p className={styles.muted}>
              {current.album} · {current.year}
            </p>
            {current.startOffsetSeconds > 0 && (
              <p className={styles.muted}>
                <Icon name="history" size="sm" /> intro skipped: {current.startOffsetSeconds.toFixed(1)}s
              </p>
            )}
          </div>
        </div>

        <div className={styles.progressTrack} aria-hidden>
          <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
        </div>

        <Button variant="primary" icon="arrow-right" onClick={nextSong}>
          {index + 1 >= queue.length ? 'See results' : 'Next song'}
        </Button>
      </div>
    );
  };

  const renderFinished = () => (
    <div className={styles.centerCard}>
      <p className={styles.muted}>Round complete</p>
      <div className={styles.bigScore}>
        {score}
        <span style={{ fontSize: 22, color: theme.colors.text.secondary }}> / {queue.length}</span>
      </div>
      <p className={styles.muted}>
        {accuracy}% accuracy · best streak {streak.best}
      </p>
      <p className={styles.muted}>
        {accuracy >= 90
          ? 'Certified Strokes scholar.'
          : accuracy >= 60
            ? 'Solid — you know your way around Room on Fire.'
            : 'Time to revisit the discography.'}
      </p>
      <Button size="lg" icon="repeat" onClick={startGame}>
        Play again
      </Button>
    </div>
  );

  return (
    <div className={styles.root} data-testid="strokes-quiz-panel">
      <div className={styles.header}>{phase !== 'idle' && renderScoreboard()}</div>

      <div className={styles.stage}>
        {phase === 'idle' && renderIdle()}
        {phase === 'playing' && renderPlaying()}
        {phase === 'reveal' && renderReveal()}
        {phase === 'finished' && renderFinished()}
      </div>

      <div className={styles.footer}>
        <span className={styles.credit}>{options.credit ?? 'Developed by Omer — Fall 2026'}</span>
        <span data-testid="strokes-catalog-status">
          {source === 'datasource' ? 'songs: Strokes Catalog data source' : 'songs: built-in catalog'} ·{' '}
          {playableSongs.length}/{songs.length} with audio
        </span>
      </div>
    </div>
  );
}
