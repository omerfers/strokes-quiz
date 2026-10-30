"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SONGS } from "@/lib/catalog";
import { buildQueue } from "@/lib/queue";
import { isCorrectGuess } from "@/lib/answer";
import { resolvePreview } from "@/lib/preview";
import { ClipPlayer } from "@/lib/player";
import type { ClipState, Song } from "@/lib/types";

const ROUNDS = 15;
const CLIP_SECONDS = 5;
const REVEAL_SECONDS = 8;
const MAX_GUESSES = 2;
const AUTO_ADVANCE_MS = 2600;

type Phase = "idle" | "playing" | "reveal" | "finished";
type Verdict = "none" | "wrong" | "correct";

export function Quiz() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [queue, setQueue] = useState<Song[]>([]);
  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState("");
  const [verdict, setVerdict] = useState<Verdict>("none");
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [score, setScore] = useState(0);
  const [played, setPlayed] = useState(0);
  const [streak, setStreak] = useState({ current: 0, best: 0 });
  const [audioState, setAudioState] = useState<ClipState>("idle");
  const [warning, setWarning] = useState<string | null>(null);
  const [quitArmed, setQuitArmed] = useState(false);
  const [roundLost, setRoundLost] = useState(false);
  const [artwork, setArtwork] = useState<Record<string, string>>({});

  const [player] = useState(() => new ClipPlayer(setAudioState));
  const inputRef = useRef<HTMLInputElement>(null);
  const current = queue[index] ?? null;

  const accuracy = played > 0 ? Math.round((score / played) * 100) : 0;

  useEffect(() => () => player.stop(), [player]);

  const playClip = useCallback(
    async (song: Song, seconds: number) => {
      const preview = await resolvePreview(song);
      if (!preview) {
        setWarning(`No iTunes preview found for “${song.title}”.`);
        return;
      }
      if (preview.artworkUrl) {
        setArtwork((map) =>
          map[song.id] ? map : { ...map, [song.id]: preview.artworkUrl! },
        );
      }
      const ok = await player.play(preview.url, song.startOffsetSeconds, seconds);
      setWarning(ok ? null : "Playback blocked — press replay to hear the clip.");
    },
    [player],
  );

  const beginRound = useCallback(
    (song: Song) => {
      setPhase("playing");
      setGuess("");
      setVerdict("none");
      setWrongGuesses(0);
      setWarning(null);
      setQuitArmed(false);
      setRoundLost(false);
      void playClip(song, CLIP_SECONDS);
      window.setTimeout(() => inputRef.current?.focus(), 40);
    },
    [playClip],
  );

  const startGame = useCallback(() => {
    const nextQueue = buildQueue(SONGS, ROUNDS);
    if (nextQueue.length === 0) return;
    player.stop();
    setQueue(nextQueue);
    setIndex(0);
    setScore(0);
    setPlayed(0);
    setStreak({ current: 0, best: 0 });
    beginRound(nextQueue[0]);
  }, [beginRound, player]);

  const nextSong = useCallback(() => {
    player.stop();
    const nextIndex = index + 1;
    if (nextIndex >= queue.length) {
      setPhase("finished");
      return;
    }
    setIndex(nextIndex);
    beginRound(queue[nextIndex]);
  }, [beginRound, index, player, queue]);

  const submitGuess = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (phase !== "playing" || !current || !guess.trim()) return;

      if (!isCorrectGuess(guess, current.title)) {
        const misses = wrongGuesses + 1;
        setWrongGuesses(misses);
        setVerdict("wrong");
        if (misses >= MAX_GUESSES) {
          setRoundLost(true);
          setPlayed((n) => n + 1);
          setStreak((s) => ({ ...s, current: 0 }));
          setPhase("reveal");
          void playClip(current, REVEAL_SECONDS);
        }
        return;
      }

      setVerdict("correct");
      setScore((n) => n + 1);
      setPlayed((n) => n + 1);
      setStreak((s) => {
        const next = s.current + 1;
        return { current: next, best: Math.max(s.best, next) };
      });
      setPhase("reveal");
      void playClip(current, REVEAL_SECONDS);
    },
    [current, guess, phase, playClip, wrongGuesses],
  );

  const revealAnswer = useCallback(() => {
    if (phase !== "playing" || !current) return;
    setVerdict("wrong");
    setPlayed((n) => n + 1);
    setStreak((s) => ({ ...s, current: 0 }));
    setPhase("reveal");
    void playClip(current, REVEAL_SECONDS);
  }, [current, phase, playClip]);

  const abandon = useCallback(() => {
    if (!quitArmed) {
      setQuitArmed(true);
      return;
    }
    player.stop();
    setQuitArmed(false);
    setQueue([]);
    setIndex(0);
    setScore(0);
    setPlayed(0);
    setStreak({ current: 0, best: 0 });
    setWarning(null);
    setPhase("idle");
  }, [player, quitArmed]);

  const toggleAudio = useCallback(() => {
    if (audioState === "playing") {
      player.pause();
      return;
    }
    if (audioState === "paused") {
      void player.resume();
      return;
    }
    if (current) void playClip(current, CLIP_SECONDS);
  }, [audioState, current, playClip, player]);

  // Enter moves on from the answer screen; a lost round also moves on by itself.
  useEffect(() => {
    if (phase !== "reveal") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName)) return;
      event.preventDefault();
      nextSong();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nextSong, phase]);

  useEffect(() => {
    if (phase !== "reveal" || !roundLost) return;
    const timer = window.setTimeout(() => nextSong(), AUTO_ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [nextSong, phase, roundLost]);

  const audioLabel =
    audioState === "playing" ? "Pause clip" : audioState === "paused" ? "Resume clip" : "Replay clip";
  const audioStatus =
    audioState === "paused" ? "Paused" : audioState === "playing" ? "Clip playing" : "Clip finished";

  const perfect = queue.length > 0 && score === queue.length;
  const resultLine = perfect
    ? "Julian Casablancas himself."
    : accuracy >= 90
      ? "Certified Strokes scholar."
      : accuracy >= 60
        ? "Solid run. A few more listens and you will have it."
        : "Time to revisit the discography.";

  return (
    <div className="quiz-root">
      <div className="shell">
        <header className="top">
          <div className="brand">
            <i />
            The Strokes <em>/ Song Quiz</em>
          </div>
          <div className="top-right">
            {phase !== "idle" && phase !== "finished" && played > 0 && (
              <div className="meta">
                {streak.current > 1 && (
                  <span className="flex items-baseline gap-2">
                    <small>Streak</small>
                    <strong>{streak.current}</strong>
                  </span>
                )}
                <span className="flex items-baseline gap-2" data-testid="score">
                  <small>Score</small>
                  <strong>
                    {score} / {played}
                  </strong>
                </span>
              </div>
            )}
            {(phase === "playing" || phase === "reveal") && (
              <button
                type="button"
                onClick={abandon}
                onBlur={() => setQuitArmed(false)}
                className={`quit ${quitArmed ? "is-armed" : ""}`}
              >
                {quitArmed ? "Confirm abandon" : "Abandon quiz"}
              </button>
            )}
          </div>
        </header>

        <main className="stage">
          {phase === "idle" && (
            <div className="content fade-in">
              <h1 className="headline">How well do you know The Strokes?</h1>
              <p className="message" style={{ maxWidth: "38ch" }}>
                Five seconds of a song, fifteen rounds, two guesses each. Nothing to install.
              </p>
              <button type="button" className="btn btn-primary" onClick={startGame}>
                Start the quiz
              </button>
            </div>
          )}

          {phase === "playing" && current && (
            <div className="content fade-in">
              <p className="eyebrow">
                <i />
                Track {index + 1} of {queue.length}
              </p>
              <h2 className="prompt">Which song is this?</h2>

              <div className="audio-row">
                <button type="button" className="btn btn-ghost" onClick={toggleAudio}>
                  {audioLabel}
                </button>
                <span className="status">{audioStatus}</span>
              </div>

              <form className="guess-form" onSubmit={submitGuess}>
                <input
                  ref={inputRef}
                  className={`guess-input ${verdict === "wrong" ? "is-wrong" : ""}`}
                  aria-label="Song title"
                  placeholder="Song title"
                  value={guess}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  onChange={(event) => {
                    setGuess(event.target.value);
                    if (verdict === "wrong") setVerdict("none");
                  }}
                  autoFocus
                />
                <div className="actions">
                  <button type="submit" className="btn btn-primary" disabled={!guess.trim()}>
                    Guess
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={revealAnswer}>
                    Reveal answer
                  </button>
                </div>
              </form>

              {wrongGuesses >= 1 && (
                <div className="hints">
                  <span className="hint">
                    <b>Album</b>
                    <strong>
                      {current.album} ({current.year})
                    </strong>
                  </span>
                </div>
              )}

              {verdict === "wrong" && wrongGuesses < MAX_GUESSES && (
                <p className="message">
                  Not quite. {wrongGuesses === 1 ? "One guess left." : "Try again."}
                </p>
              )}

              {warning && <p className="warning">{warning}</p>}
            </div>
          )}

          {phase === "reveal" && current && (
            <div className="content fade-in">
              <p className="eyebrow">
                <i />
                Track {index + 1} of {queue.length}
              </p>

              <div className="reveal-row">
                <div className="art">
                  {artwork[current.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={artwork[current.id]} alt={`${current.album} cover`} />
                  ) : (
                    <div className="fallback grid place-items-center p-3 text-center">
                      <span className="text-3xl font-semibold">
                        {current.album
                          .split(/\s+/)
                          .filter((w) => !/^(of|the|a|an|and)$/i.test(w))
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                      <span className="mt-2 text-[10px] tracking-[0.16em] text-white/55 uppercase">
                        {current.album}
                      </span>
                    </div>
                  )}
                </div>
                <div className="reveal-text">
                  <h3 className="title">{current.title}</h3>
                  <p className="album-line">
                    {current.album} · {current.year}
                  </p>
                  {current.startOffsetSeconds > 0 && (
                    <p className="offset-line">
                      Intro skipped {current.startOffsetSeconds.toFixed(1)}s
                    </p>
                  )}
                  <p className={`verdict ${verdict === "correct" ? "" : "is-miss"}`}>
                    {verdict === "correct" ? "Correct +1" : roundLost ? "Out of guesses" : "Answer revealed"}
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ marginTop: 18 }}
                    onClick={nextSong}
                  >
                    {index + 1 >= queue.length ? "See results" : "Next song"}
                  </button>
                  <p className="key-hint">Press Enter to continue</p>
                </div>
              </div>
            </div>
          )}

          {phase === "finished" && (
            <div className="content fade-in">
              <p className="eyebrow">
                <i />
                Results
              </p>
              <div className="score-line">
                <span className="score-big">{score}</span>
                <span className="score-of">/ {queue.length}</span>
              </div>
              <p className="result-meta">
                {accuracy}% accuracy · best streak {streak.best}
              </p>
              <p className="result-line">{resultLine}</p>
              <button type="button" className="btn btn-primary" onClick={startGame}>
                Play again
              </button>
            </div>
          )}
        </main>

        <footer className="foot">
          <span className="credit">Developed by Ömer Faruk Ersakay</span>
          <span className="foot-status">{SONGS.length} tracks · previews via iTunes</span>
        </footer>
      </div>
    </div>
  );
}
