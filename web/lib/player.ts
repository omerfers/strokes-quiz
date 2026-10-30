import type { ClipState } from "./types";

export class ClipPlayer {
  private el: HTMLAudioElement | null = null;
  private timer: number | null = null;
  private endAt = 0;
  private remainingMs = 0;
  private paused = false;
  private listener?: (state: ClipState) => void;

  constructor(listener?: (state: ClipState) => void) {
    this.listener = listener;
  }

  private emit(state: ClipState) {
    this.listener?.(state);
  }

  stop() {
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

  async play(url: string, offsetSeconds: number, seconds: number) {
    this.stop();
    const el = new Audio(url);
    el.preload = "auto";
    el.crossOrigin = "anonymous";
    this.el = el;
    try {
      await this.seek(el, offsetSeconds);
      await el.play();
    } catch {
      this.stop();
      return false;
    }
    this.startTimer(seconds * 1000);
    this.emit("playing");
    el.onended = () => this.stop();
    return true;
  }

  private seek(el: HTMLAudioElement, seconds: number) {
    return new Promise<void>((resolve) => {
      const done = () => {
        el.removeEventListener("loadedmetadata", done);
        el.removeEventListener("error", done);
        try {
          el.currentTime = Math.max(0, seconds);
        } catch {}
        resolve();
      };
      if (el.readyState >= 1) {
        done();
        return;
      }
      el.addEventListener("loadedmetadata", done, { once: true });
      el.addEventListener("error", done, { once: true });
      window.setTimeout(done, 2500);
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
