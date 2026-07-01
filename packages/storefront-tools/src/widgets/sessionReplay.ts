import type { ToolsConfig, Widget } from '../core/types';

const BATCH_SIZE = 50;
const FLUSH_INTERVAL_MS = 10000;
const MAX_QUEUE_SIZE = 500;

interface ReplayEvent {
  type: number;
  data: Record<string, unknown>;
  timestamp: number;
}

export class SessionReplayWidget implements Widget {
  readonly name = 'sessionReplay';
  private sessionId: string | null = null;
  private hostname: string | null = null;
  private apiBase: string | null = null;
  private eventQueue: ReplayEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private observer: MutationObserver | null = null;
  private eventListeners: Array<{ target: EventTarget; type: string; handler: EventListener }> = [];

  init(config: ToolsConfig): void {
    const { sessionReplay } = config.tools;
    if (!sessionReplay?.enabled) {
      return;
    }

    if (Math.random() * 100 > sessionReplay.sampleRate) {
      return;
    }

    this.hostname = config.hostname;
    this.sessionId = this.generateSessionId();
    this.apiBase = this.resolveApiBase();

    this.startReplay();
    this.sendSessionStart();

    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
  }

  destroy(): void {
    this.flush();

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    this.observer?.disconnect();
    this.observer = null;

    for (const { target, type, handler } of this.eventListeners) {
      target.removeEventListener(type, handler);
    }
    this.eventListeners = [];

    this.eventQueue = [];
    this.sessionId = null;
    this.hostname = null;
  }

  private startReplay(): void {
    this.recordEvent(2, {
      type: 'full_snapshot',
      html: document.documentElement.outerHTML,
      href: window.location.href,
    });

    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        this.recordEvent(3, {
          type: 'mutation',
          target: this.getSelector(mutation.target as HTMLElement),
          addedNodes: mutation.addedNodes.length,
          removedNodes: mutation.removedNodes.length,
        });
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    this.addListener(document, 'click', (event: Event) => {
      const target = event.target as HTMLElement;
      this.recordEvent(3, {
        type: 'click',
        target: this.getSelector(target),
        x: (event as MouseEvent).clientX,
        y: (event as MouseEvent).clientY,
      });
    });

    this.addListener(document, 'scroll', () => {
      this.recordEvent(3, {
        type: 'scroll',
        scrollX: window.scrollX,
        scrollY: window.scrollY,
      });
    });

    this.addListener(window, 'resize', () => {
      this.recordEvent(3, {
        type: 'resize',
        width: window.innerWidth,
        height: window.innerHeight,
      });
    });
  }

  private recordEvent(type: number, data: Record<string, unknown>): void {
    if (this.eventQueue.length >= MAX_QUEUE_SIZE) {
      this.flush();
    }

    this.eventQueue.push({
      type,
      data,
      timestamp: Date.now(),
    });

    if (this.eventQueue.length >= BATCH_SIZE) {
      this.flush();
    }
  }

  private flush(): void {
    if (this.eventQueue.length === 0 || !this.sessionId || !this.apiBase) {
      return;
    }

    const events = this.eventQueue.splice(0, BATCH_SIZE);

    const payload = {
      sessionId: this.sessionId,
      hostname: this.hostname,
      events,
    };

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          `${this.apiBase}/api/replay/sessions/events`,
          JSON.stringify(payload),
        );
      } else {
        fetch(`${this.apiBase}/api/replay/sessions/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {
          // silently fail
        });
      }
    } catch {
      // silently fail
    }
  }

  private sendSessionStart(): void {
    if (!this.sessionId || !this.apiBase) {
      return;
    }

    fetch(`${this.apiBase}/api/replay/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.sessionId,
        hostname: this.hostname,
        userAgent: navigator.userAgent,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        url: window.location.href,
      }),
    }).catch(() => {
      // silently fail
    });
  }

  private addListener(
    target: EventTarget,
    type: string,
    handler: EventListener,
  ): void {
    target.addEventListener(type, handler, { passive: true });
    this.eventListeners.push({ target, type, handler });
  }

  private getSelector(element: HTMLElement): string {
    if (!element || !element.tagName) {
      return '';
    }

    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : '';
    const classes = element.className && typeof element.className === 'string'
      ? '.' + element.className.trim().split(/\s+/).slice(0, 2).join('.')
      : '';

    return `${tag}${id}${classes}`;
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  }

  private resolveApiBase(): string {
    const scriptTag = document.querySelector('script[data-hostname]');
    if (scriptTag) {
      const src = scriptTag.getAttribute('src');
      if (src) {
        try {
          const url = new URL(src);
          return url.origin;
        } catch {
          // fallback
        }
      }
    }
    return window.location.origin;
  }
}
