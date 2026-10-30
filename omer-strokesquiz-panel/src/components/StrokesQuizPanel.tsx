import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GrafanaTheme2, PanelProps } from '@grafana/data';
import { css, cx } from '@emotion/css';
import { useStyles2 } from '@grafana/ui';
import backgroundImage from '../img/background.jpg';
import { ClipPlayer, ClipState } from '../audio/player';
import { resolvePreview } from '../audio/preview';
import { resolveSongs } from '../songs';
import { buildQueue } from '../utils/queue';
import { QuizOptions, Song } from '../types';
import { isCorrectGuess, maskTitle } from '../utils/answer';
import { AlbumArt } from './AlbumArt';
interface Props extends PanelProps<QuizOptions> {}
type Phase = 'idle' | 'playing' | 'reveal' | 'finished';
type Verdict = 'none' | 'wrong' | 'correct';
const INK = '#f4f1ed';
const ACCENT = '#c9332a';
const MUTED = 'rgba(244, 241, 237, 0.56)';
const FAINT = 'rgba(244, 241, 237, 0.36)';
const HAIRLINE = 'rgba(244, 241, 237, 0.14)';
const getStyles = (theme: GrafanaTheme2) => ({
  root: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 320px;
    padding: 20px 28px 12px;
    box-sizing: border-box;
    color: ${INK};
    background-color: #0b0909;
    border-radius: ${theme.shape.radius.default};
    overflow: hidden;
    container-type: inline-size;
    font-family: ${theme.typography.fontFamily};
  `,
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    padding-bottom: 14px;
    border-bottom: 1px solid ${HAIRLINE};
    flex: 0 0 auto;
  `,
  brand: css`
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    white-space: nowrap;
  `,
  brandDot: css`
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: ${ACCENT};
    flex: 0 0 auto;
  `,
  brandDim: css`
    color: ${FAINT};
    font-weight: 500;
    letter-spacing: 0.2em;
  `,
  meta: css`
    display: flex;
    align-items: baseline;
    gap: 26px;
  `,
  headerRight: css`
    display: flex;
    align-items: center;
    gap: 22px;
    margin-left: auto;
  `,
  quit: css`
    appearance: none;
    border: 0;
    padding: 4px 0;
    background: transparent;
    color: rgba(244, 241, 237, 0.38);
    font-family: inherit;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    cursor: pointer;
    transition: color 120ms ease;
    &:hover {
      color: ${INK};
    }
  `,
  quitArmed: css`
    color: #ff6a5e;
  `,
  metaBlock: css`
    display: flex;
    align-items: baseline;
    gap: 8px;
  `,
  metaLabel: css`
    font-size: 9px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: ${FAINT};
  `,
  metaValue: css`
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.02em;
    font-variant-numeric: tabular-nums;
  `,
  stage: css`
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 18px 0;
    overflow-y: auto;
  `,
  content: css`
    width: 100%;
    max-width: 620px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    box-sizing: border-box;
  `,
  eyebrow: css`
    display: inline-flex;
    align-items: center;
    gap: 9px;
    margin: 0 0 16px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: ${FAINT};
  `,
  eyebrowDot: css`
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: ${ACCENT};
  `,
  headline: css`
    margin: 0 0 30px;
    max-width: 18ch;
    font-size: clamp(30px, 3.4cqw, 46px);
    font-weight: 600;
    line-height: 1.04;
    letter-spacing: -0.035em;
  `,
  prompt: css`
    margin: 0 0 22px;
    font-size: clamp(24px, 2.4cqw, 34px);
    font-weight: 600;
    line-height: 1.08;
    letter-spacing: -0.03em;
  `,
  primary: css`
    appearance: none;
    border: 0;
    border-radius: 2px;
    padding: 12px 24px;
    background: ${ACCENT};
    color: #fff;
    font-family: inherit;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background-color 120ms ease;
    &:hover {
      background: #de453a;
    }
    &:disabled {
      opacity: 0.4;
      cursor: default;
    }
  `,
  ghost: css`
    appearance: none;
    border: 1px solid rgba(244, 241, 237, 0.22);
    border-radius: 2px;
    padding: 9px 16px;
    background: transparent;
    color: rgba(244, 241, 237, 0.82);
    font-family: inherit;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    cursor: pointer;
    transition:
      border-color 120ms ease,
      color 120ms ease;
    &:hover {
      border-color: rgba(244, 241, 237, 0.5);
      color: #fff;
    }
  `,
  audioRow: css`
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin: 0 0 26px;
  `,
  status: css`
    font-size: 9px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: ${FAINT};
  `,
  form: css`
    display: flex;
    flex-direction: column;
    gap: 14px;
    width: 100%;
    margin: 0 0 14px;
  `,
  actions: css`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  `,
  input: css`
    flex: 1;
    min-width: 0;
    padding: 10px 2px;
    border: 0;
    border-bottom: 1px solid rgba(244, 241, 237, 0.32);
    border-radius: 0;
    background: transparent;
    color: ${INK};
    font-family: inherit;
    font-size: clamp(18px, 1.8cqw, 24px);
    letter-spacing: -0.01em;
    outline: none;
    &::placeholder {
      color: rgba(244, 241, 237, 0.34);
    }
    &:focus {
      border-color: ${ACCENT};
    }
  `,
  inputWrong: css`
    border-color: rgba(222, 69, 58, 0.7);
  `,
  hints: css`
    display: flex;
    flex-direction: column;
    gap: 7px;
    margin: 0 0 14px;
  `,
  hintLine: css`
    font-size: 12px;
    letter-spacing: 0.02em;
    color: rgba(244, 241, 237, 0.66);
  `,
  hintKey: css`
    margin-right: 9px;
    font-size: 9px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: ${FAINT};
  `,
  hintStrong: css`
    color: ${INK};
  `,
  mask: css`
    font-family: ${theme.typography.fontFamilyMonospace};
    letter-spacing: 0.16em;
    color: ${INK};
  `,
  message: css`
    margin: 0 0 14px;
    font-size: 12px;
    color: ${MUTED};
  `,
  warning: css`
    margin: 0 0 14px;
    font-size: 11px;
    color: #e3a26b;
  `,
  revealRow: css`
    display: flex;
    align-items: flex-start;
    gap: 28px;
    flex-wrap: wrap;
    width: 100%;
    margin: 0 0 28px;
  `,
  art: css`
    width: 180px;
    flex: 0 0 auto;
  `,
  revealText: css`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding-top: 2px;
    flex: 1 1 220px;
    min-width: 0;
  `,
  title: css`
    margin: 0;
    font-size: clamp(26px, 2.7cqw, 40px);
    font-weight: 600;
    line-height: 1.05;
    letter-spacing: -0.03em;
  `,
  albumLine: css`
    margin: 0;
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: ${MUTED};
  `,
  offsetLine: css`
    margin: 0;
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: ${FAINT};
  `,
  verdictLine: css`
    margin: 14px 0 0;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #b9d8b3;
  `,
  verdictMiss: css`
    color: ${MUTED};
  `,
  keyHint: css`
    margin: 9px 0 0;
    font-size: 9px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: ${FAINT};
  `,
  resultScore: css`
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin: 0 0 12px;
  `,
  scoreNumber: css`
    font-size: clamp(56px, 7cqw, 96px);
    font-weight: 600;
    line-height: 0.9;
    letter-spacing: -0.05em;
    font-variant-numeric: tabular-nums;
  `,
  scoreOf: css`
    font-size: 16px;
    letter-spacing: 0.02em;
    color: ${FAINT};
  `,
  resultMeta: css`
    margin: 0 0 10px;
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: ${MUTED};
  `,
  resultLine: css`
    margin: 0 0 30px;
    max-width: 42ch;
    font-size: 14px;
    line-height: 1.55;
    color: rgba(244, 241, 237, 0.74);
  `,
  footer: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    padding-top: 10px;
    border-top: 1px solid rgba(244, 241, 237, 0.1);
    font-size: 9px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: ${FAINT};
    flex: 0 0 auto;
  `,
  credit: css`
    font-size: 10px;
    letter-spacing: 0.04em;
    text-transform: none;
    color: rgba(244, 241, 237, 0.6);
  `,
});
export function StrokesQuizPanel({ options, data }: Props) {
  const styles = useStyles2(getStyles);
  const { songs, source } = useMemo(() => resolveSongs(data), [data]);
  const playableSongs = useMemo(() => songs, [songs]);
  const rounds = Math.max(1, options.rounds ?? 15);
  const clipLengthSeconds = Math.max(1, options.clipLengthSeconds ?? 5);
  const revealSeconds = Math.max(1, options.revealSeconds ?? 8);
  const extraSkip = Math.max(0, options.extraIntroSkipSeconds ?? 0);
  const maxGuesses = Math.max(1, options.maxGuesses ?? 2);
  const showHints = options.showHints ?? true;
  const showAlbumArt = options.showAlbumArt ?? true;
  const showBackground = options.showBackground ?? true;
  const backgroundDim = Math.min(0.95, Math.max(0, (options.backgroundDim ?? 72) / 100));
  const backgroundScrim = Math.min(0.97, backgroundDim + 0.16);
  const backgroundStyle = showBackground
    ? {
        backgroundImage: `linear-gradient(90deg, rgba(6, 4, 4, ${backgroundScrim}) 0%, rgba(6, 4, 4, ${backgroundScrim}) 34%, rgba(6, 4, 4, ${backgroundDim}) 62%, rgba(6, 4, 4, ${backgroundDim}) 100%), url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : undefined;
  const [audioState, setAudioState] = useState<ClipState>('idle');
  const [player] = useState(() => new ClipPlayer(setAudioState));
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
  const [quitArmed, setQuitArmed] = useState(false);
  const [roundLost, setRoundLost] = useState(false);
  const [artworkById, setArtworkById] = useState<Record<string, string>>({});
  const current = queue[index] ?? null;
  useEffect(() => {
    return () => player.stop();
  }, [player]);

  useEffect(() => {
    const id = 'strokes-quiz-hide-kiosk-footer';
    const kiosk = new URLSearchParams(window.location.search).has('kiosk');
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      // In kiosk the dashboard is the whole page: a page background that matches
      // the panel stops any leftover strip below it reading as a separate bar.
      style.textContent = [
        '[data-testid="public-dashboard-footer"]{display:none !important}',
        kiosk ? 'body{background:#0b0909 !important}' : '',
      ].join('');
      document.head.appendChild(style);
    }
    // Esc is Grafana's "leave kiosk" shortcut, which drops the player into the
    // navigation menu mid-quiz. Swallow it so the quiz stays put.
    const blockEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    };
    if (kiosk) {
      window.addEventListener('keydown', blockEscape, true);
    }
    return () => {
      document.getElementById(id)?.remove();
      window.removeEventListener('keydown', blockEscape, true);
    };
  }, []);
  const offsetFor = useCallback((song: Song) => Math.max(0, (song.startOffsetSeconds ?? 0) + extraSkip), [extraSkip]);
  const playClip = useCallback(
    async (song: Song, seconds: number) => {
      const preview = await resolvePreview(song);
      if (!preview) {
        setAudioWarning(`No iTunes preview found for "${song.title}".`);
        return;
      }
      if (preview.artworkUrl) {
        setArtworkById((current) =>
          current[song.id] ? current : { ...current, [song.id]: preview.artworkUrl! }
        );
      }
      const ok = await player.play(preview.url, offsetFor(song), seconds);
      setAudioWarning(ok ? null : 'Playback blocked or the preview is unavailable.');
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
      setQuitArmed(false);
      setRoundLost(false);
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
  const abandonQuiz = useCallback(() => {
    if (!quitArmed) {
      setQuitArmed(true);
      return;
    }
    player.stop();
    setQuitArmed(false);
    setQueue([]);
    setIndex(0);
    setGuess('');
    setVerdict('none');
    setWrongGuesses(0);
    setScore(0);
    setPlayed(0);
    setStreak({ current: 0, best: 0 });
    setAudioWarning(null);
    setPhase('idle');
  }, [player, quitArmed]);
  const submitGuess = useCallback(
    (event: React.SyntheticEvent) => {
      event.preventDefault();
      if (phase !== 'playing' || !current || !guess.trim()) {
        return;
      }
      if (!isCorrectGuess(guess, current.title)) {
        const misses = wrongGuesses + 1;
        setWrongGuesses(misses);
        setVerdict('wrong');
        if (misses >= maxGuesses) {
          // Out of tries: the round is lost, so show the answer and move on.
          setRoundLost(true);
          setPlayed((n) => n + 1);
          setStreak((s) => ({ ...s, current: 0 }));
          setPhase('reveal');
          void playClip(current, revealSeconds);
        }
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
    [current, guess, maxGuesses, phase, playClip, revealSeconds, wrongGuesses]
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
  // The reveal screen is a dead end unless you reach for the mouse: Enter keeps
  // the quiz playable from the keyboard alone.
  useEffect(() => {
    if (phase !== 'reveal') {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.repeat || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      // Let the focused button fire its own click instead of firing twice.
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName))) {
        return;
      }
      event.preventDefault();
      nextSong();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nextSong, phase]);
  // A lost round lingers on the answer for a moment, then moves on.
  useEffect(() => {
    if (phase !== 'reveal' || !roundLost) {
      return;
    }
    const timer = window.setTimeout(() => nextSong(), 2600);
    return () => window.clearTimeout(timer);
  }, [nextSong, phase, roundLost]);
  const toggleAudio = useCallback(() => {
    if (audioState === 'playing') {
      player.pause();
      return;
    }
    if (audioState === 'paused') {
      void player.resume();
      return;
    }
    if (current) {
      void playClip(current, clipLengthSeconds);
    }
  }, [audioState, clipLengthSeconds, current, playClip, player]);
  const accuracy = played > 0 ? Math.round((score / played) * 100) : 0;
  const renderScoreboard = () => (
    <div className={styles.meta}>
      {streak.current > 1 && (
        <div className={styles.metaBlock}>
          <span className={styles.metaLabel}>Streak</span>
          <span className={styles.metaValue}>{streak.current}</span>
        </div>
      )}
      <div className={styles.metaBlock} data-testid="strokes-score">
        <span className={styles.metaLabel}>Score</span>
        <span className={styles.metaValue}>
          {score} / {played}
        </span>
      </div>
    </div>
  );
  const renderIdle = () => (
    <div className={styles.content}>
      <h2 className={styles.headline}>How well do you know The Strokes?</h2>
      <button className={styles.primary} onClick={startGame} disabled={playableSongs.length === 0}>
        Start the quiz
      </button>
      {playableSongs.length === 0 && (
        <p
          className={cx(
            styles.message,
            css`
              margin-top: 16px;
            `
          )}
        >
          No bundled audio clips were found.
        </p>
      )}
    </div>
  );
  const renderPlaying = () => {
    const hintAlbum = showHints && wrongGuesses >= 1;
    const hintTitle = showHints && wrongGuesses >= 2;
    const audioLabel =
      audioState === 'playing' ? 'Pause clip' : audioState === 'paused' ? 'Resume clip' : 'Replay clip';
    const statusText = audioState === 'paused' ? 'Paused' : audioState === 'playing' ? 'Clip playing' : 'Clip finished';
    return (
      <div className={styles.content}>
        <p className={styles.eyebrow}>
          <span className={styles.eyebrowDot} />
          Track {index + 1} of {queue.length}
        </p>
        <h2 className={styles.prompt}>Which song is this?</h2>

        <div className={styles.audioRow}>
          <button className={styles.ghost} onClick={toggleAudio} data-testid="strokes-audio-toggle">
            {audioLabel}
          </button>
          <span className={styles.status}>{statusText}</span>
        </div>

        <form className={styles.form} onSubmit={submitGuess}>
          <input
            className={cx(styles.input, verdict === 'wrong' && styles.inputWrong)}
            aria-label="Song title"
            placeholder="Song title"
            value={guess}
            onChange={(e) => {
              setGuess(e.currentTarget.value);
              if (verdict === 'wrong') {
                setVerdict('none');
              }
            }}
            autoFocus
          />
          <div className={styles.actions}>
            <button className={styles.primary} type="submit" disabled={!guess.trim()}>
              Guess
            </button>
            <button className={styles.ghost} type="button" onClick={revealAnswer}>
              Reveal answer
            </button>
          </div>
        </form>

        {hintAlbum && current && (
          <div className={styles.hints}>
            <span className={styles.hintLine}>
              <span className={styles.hintKey}>Album</span>
              <span className={styles.hintStrong}>
                {current.album} ({current.year})
              </span>
            </span>
            {hintTitle && (
              <span className={styles.hintLine}>
                <span className={styles.hintKey}>Title</span>
                <span className={styles.mask}>{maskTitle(current.title)}</span>
              </span>
            )}
          </div>
        )}

        {verdict === 'wrong' && <p className={styles.message}>Not quite. Try again.</p>}

        {audioWarning && <p className={styles.warning}>{audioWarning}</p>}
      </div>
    );
  };
  const renderReveal = () => {
    if (!current) {
      return null;
    }
    const correct = verdict === 'correct';
    return (
      <div className={styles.content}>
        <p className={styles.eyebrow}>
          <span className={styles.eyebrowDot} />
          Track {index + 1} of {queue.length}
        </p>

        <div className={styles.revealRow}>
          {showAlbumArt && (
            <div className={styles.art}>
              <AlbumArt song={current} artworkUrl={artworkById[current.id]} />
            </div>
          )}
          <div className={styles.revealText}>
            <h3 className={styles.title} data-testid="strokes-song-title">
              {current.title}
            </h3>
            <p className={styles.albumLine}>
              {current.album} · {current.year}
            </p>
            {current.startOffsetSeconds > 0 && (
              <p className={styles.offsetLine}>Intro skipped {current.startOffsetSeconds.toFixed(1)}s</p>
            )}
            <p className={cx(styles.verdictLine, !correct && styles.verdictMiss)}>
              {correct ? 'Correct +1' : roundLost ? 'Out of guesses' : 'Answer revealed'}
            </p>
            <button
              className={cx(
                styles.primary,
                css`
                  margin-top: 18px;
                `
              )}
              onClick={nextSong}
            >
              {index + 1 >= queue.length ? 'See results' : 'Next song'}
            </button>
            <p className={styles.keyHint}>Press Enter to continue</p>
          </div>
        </div>
      </div>
    );
  };
  const renderFinished = () => (
    <div className={styles.content}>
      <p className={styles.eyebrow}>
        <span className={styles.eyebrowDot} />
        Results
      </p>
      <div className={styles.resultScore}>
        <span className={styles.scoreNumber}>{score}</span>
        <span className={styles.scoreOf}>/ {queue.length}</span>
      </div>
      <p className={styles.resultMeta}>
        {accuracy}% accuracy · best streak {streak.best}
      </p>
      <p className={styles.resultLine}>
        {queue.length > 0 && score === queue.length
          ? 'Julian Casablancas himself.'
          : accuracy >= 90
            ? 'Certified Strokes scholar.'
            : accuracy >= 60
              ? 'Solid run. A few more listens and you will have it.'
              : 'Time to revisit the discography.'}
      </p>
      <button className={styles.primary} onClick={startGame}>
        Play again
      </button>
    </div>
  );
  return (
    <div className={styles.root} style={backgroundStyle} data-testid="strokes-quiz-panel">
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandDot} />
          The Strokes <span className={styles.brandDim}>/ Song Quiz</span>
        </div>
        <div className={styles.headerRight}>
          {phase !== 'idle' && phase !== 'finished' && played > 0 && renderScoreboard()}
          {(phase === 'playing' || phase === 'reveal') && (
            <button
              className={cx(styles.quit, quitArmed && styles.quitArmed)}
              onClick={abandonQuiz}
              onBlur={() => setQuitArmed(false)}
              data-testid="strokes-abandon"
            >
              {quitArmed ? 'Confirm abandon' : 'Abandon quiz'}
            </button>
          )}
        </div>
      </header>

      <div className={styles.stage}>
        {phase === 'idle' && renderIdle()}
        {phase === 'playing' && renderPlaying()}
        {phase === 'reveal' && renderReveal()}
        {phase === 'finished' && renderFinished()}
      </div>

      <div className={styles.footer}>
        <span className={styles.credit}>{options.credit ?? 'Developed by Ömer Faruk Ersakay'}</span>
        <span data-testid="strokes-catalog-status">
          {source === 'datasource' ? 'Strokes Catalog data source' : 'Built-in catalog'} · {songs.length} tracks ·
          previews via iTunes
        </span>
      </div>
    </div>
  );
}
