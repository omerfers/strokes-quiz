/**
 * Small wrapper around HTMLAudioElement so the panel never leaks timers or
 * keeps a previous song playing after the user moves on.
 */
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

export class ClipPlayer {
  private el: HTMLAudioElement | null = null;
  private timer: number | null = null;

  stop(): void {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.el) {
      const el = this.el;
      this.el = null;
      el.onended = null;
      el.pause();
      el.removeAttribute('src');
      el.load();
    }
  }

  /**
   * Plays `url` starting at `offsetSeconds` and stops after `seconds`.
   * Returns false when the clip is missing or the browser blocks playback.
   */
  async play(url: string, offsetSeconds: number, seconds: number): Promise<boolean> {
    this.stop();

    const el = new Audio(url);
    el.preload = 'auto';
    this.el = el;

    await waitForMetadata(el);

    // A newer play() call superseded this one while we were waiting.
    if (this.el !== el) {
      return false;
    }

    const duration = Number.isFinite(el.duration) ? el.duration : 0;
    const offset = Math.max(0, offsetSeconds);
    // Never seek past the end: a clip shorter than its intro offset would otherwise
    // start at the very end and play nothing.
    const target = duration > 0 ? Math.min(offset, Math.max(0, duration - 0.2)) : offset;

    try {
      el.currentTime = target;
    } catch {
      // Some browsers refuse to seek before the media is ready; play from 0 then.
    }

    try {
      await el.play();
    } catch {
      this.stop();
      return false;
    }

    this.timer = window.setTimeout(() => this.stop(), Math.max(0.5, seconds) * 1000);
    return true;
  }
}
