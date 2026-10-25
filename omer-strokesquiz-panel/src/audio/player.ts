const METADATA_TIMEOUT_MS = 2500;
function waitForMetadata(el: HTMLAudioElement): Promise<void> {
  if (el.readyState >= 1) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      el.removeEventListener('loadedmetadata', finish);
      el.removeEventListener('error', finish);
      resolve();
    };
    el.addEventListener('loadedmetadata', finish, { once: true });
    el.addEventListener('error', finish, { once: true });
    window.setTimeout(finish, METADATA_TIMEOUT_MS);
  });
}
export type ClipState = 'idle' | 'playing' | 'paused';
export class ClipPlayer {
  private el: HTMLAudioElement | null = null;
  private timer: number | null = null;
  private endAt = 0;
  private remainingMs = 0;
  private paused = false;
  private listener: ((state: ClipState) => void) | undefined;
  constructor(listener?: (state: ClipState) => void) {
    this.listener = listener;
  }
  stop(): void {
    this.clearTimer();
    this.remainingMs = 0;
    this.paused = false;
    this.emit('idle');
    if (this.el) {
      const el = this.el;
      this.el = null;
      el.onended = null;
      el.pause();
      el.removeAttribute('src');
      el.load();
    }
  }
  pause(): boolean {
    if (!this.el || this.paused) {
      return false;
    }
    this.remainingMs = Math.max(0, this.endAt - Date.now());
    this.clearTimer();
    this.el.pause();
    this.paused = true;
    this.emit('paused');
    return true;
  }
  async resume(): Promise<boolean> {
    if (!this.el || !this.paused) {
      return false;
    }
    try {
      await this.el.play();
    } catch {
      this.stop();
      return false;
    }
    this.paused = false;
    this.schedule(this.remainingMs);
    this.emit('playing');
    return true;
  }
  isPaused(): boolean {
    return this.paused;
  }
  isPlaying(): boolean {
    return Boolean(this.el && !this.paused && !this.el.paused && !this.el.ended);
  }
  async play(url: string, offsetSeconds: number, seconds: number): Promise<boolean> {
    this.stop();
    const el = new Audio(url);
    el.preload = 'auto';
    this.el = el;
    await waitForMetadata(el);
    if (this.el !== el) {
      return false;
    }
    const duration = Number.isFinite(el.duration) ? el.duration : 0;
    const offset = Math.max(0, offsetSeconds);
    const target = duration > 0 ? Math.min(offset, Math.max(0, duration - 0.2)) : offset;
    try {
      el.currentTime = target;
    } catch {}
    try {
      await el.play();
    } catch {
      this.stop();
      return false;
    }
    this.paused = false;
    this.schedule(Math.max(0.5, seconds) * 1000);
    this.emit('playing');
    return true;
  }
  private schedule(ms: number): void {
    this.clearTimer();
    this.remainingMs = ms;
    this.endAt = Date.now() + ms;
    this.timer = window.setTimeout(() => this.stop(), ms);
  }
  private emit(state: ClipState): void {
    this.listener?.(state);
  }
  private clearTimer(): void {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
