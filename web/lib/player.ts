import type { ClipState } from "./types";

const FALLBACK_PREVIEW_SECONDS = 30;

export class ClipPlayer {
  private el: HTMLAudioElement | null = null;
  private timer: number | null = null;
  private endAt = 0;
  private remainingMs = 0;
  private paused = false;
  private token = 0;
  private listener?: (state: ClipState) => void;

  constructor(listener?: (state: ClipState) => void) {
    this.listener = listener;
  }

  private emit(state: ClipState) {
    this.listener?.(state);
  }

  stop() {
    this.token += 1;
    this.clearTimer();
    this.remainingMs = 0;
    this.paused = false;
    this.emit("idle");
    if (this.el) {
      const el = this.el;
      this.el = null;
      el.onended = null;
      el.pause();
      el.removeAttribute("src");
      el.load();
    }
  }

  pause() {
    if (!this.el || this.paused) return false;
    this.remainingMs = Math.max(0, this.endAt - Date.now());
    this.clearTimer();
    this.el.pause();
    this.paused = true;
    this.emit("paused");
    return true;
  }

  async resume() {
    if (!this.el || !this.paused) return false;
    this.paused = false;
    await this.el.play();
    this.startTimer(this.remainingMs);
    this.emit("playing");
    return true;
  }

  async playRandom(
    url: string,
    minOffsetSeconds: number,
    seconds: number,
    offsetSeconds?: number,
  ): Promise<number | null> {
    this.stop();
    const token = ++this.token;
    const el = new Audio(url);
    el.preload = "auto";
    el.crossOrigin = "anonymous";
    this.el = el;
    const clipSeconds = Math.max(0.5, seconds);
    try {
      await this.seek(el, offsetSeconds ?? minOffsetSeconds);
      // a newer round may have started while the clip was loading
      if (token !== this.token) return null;
      const duration =
        Number.isFinite(el.duration) && el.duration > 0 ? el.duration : FALLBACK_PREVIEW_SECONDS;
      const min = Math.max(0, minOffsetSeconds);
      const max = Math.max(min, duration - clipSeconds - 0.25);
      const target =
        offsetSeconds !== undefined
          ? Math.max(0, Math.min(offsetSeconds, Math.max(0, duration - 0.2)))
          : min + Math.random() * Math.max(0, max - min);
      el.currentTime = target;
      await el.play();
      if (token !== this.token) {
        el.pause();
        return null;
      }
      this.startTimer(clipSeconds * 1000);
      this.emit("playing");
      el.onended = () => this.stop();
      return target;
    } catch {
      if (token === this.token) this.stop();
      return null;
    }
  }

  async playFull(url: string) {
    this.stop();
    const token = ++this.token;
    const el = new Audio(url);
    el.preload = "auto";
    el.crossOrigin = "anonymous";
    this.el = el;
    try {
      await this.seek(el, 0);
      // a newer round may have started while the clip was loading
      if (token !== this.token) return false;
      await el.play();
    } catch {
      if (token === this.token) this.stop();
      return false;
    }
    if (token !== this.token) {
      el.pause();
      return false;
    }
    const duration =
      Number.isFinite(el.duration) && el.duration > 0 ? el.duration : FALLBACK_PREVIEW_SECONDS;
    this.startTimer(Math.max(0.5, duration) * 1000);
    this.emit("playing");
    el.onended = () => this.stop();
    return true;
  }

  private seek(el: HTMLAudioElement, seconds: number) {
    return new Promise<void>((resolve) => {
      // The timeout must only ever fire once: a late second call would seek the
      // clip back to its start while it is already playing (heard as a repeat).
      let settled = false;
      const timer = window.setTimeout(() => done(), 2500);
      const done = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        el.removeEventListener("loadedmetadata", done);
        el.removeEventListener("error", done);
        try {
          el.currentTime = Math.max(0, seconds);
        } catch {}
        if (el.seeking) {
          el.addEventListener("seeked", () => resolve(), { once: true });
          window.setTimeout(resolve, 400);
        } else {
          resolve();
        }
      };
      if (el.readyState >= 1) {
        done();
        return;
      }
      el.addEventListener("loadedmetadata", done, { once: true });
      el.addEventListener("error", done, { once: true });
    });
  }

  private startTimer(ms: number) {
    this.clearTimer();
    this.endAt = Date.now() + ms;
    this.timer = window.setTimeout(() => this.stop(), ms);
  }

  private clearTimer() {
    if (this.timer) window.clearTimeout(this.timer);
    this.timer = null;
  }
}
