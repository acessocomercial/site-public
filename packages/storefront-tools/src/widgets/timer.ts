import type { ToolsConfig, Widget } from '../core/types';
import { onProductElement } from '../core/observer';
import { injectShadowBadge } from '../core/shadowRenderer';

const CSS = `
  .ac-timer {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 4px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    font-weight: 600;
    color: #ffffff;
    background: #dc2626;
    margin-top: 6px;
  }

  .ac-timer-icon {
    font-size: 14px;
  }

  .ac-timer-label {
    font-variant-numeric: tabular-nums;
  }
`;

interface ActiveTimer {
  endDate: Date;
  variant: string;
}

export class TimerWidget implements Widget {
  readonly name = 'timer';
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private timerElements = new Map<HTMLElement, HTMLElement>();
  private timersMap = new Map<string, ActiveTimer>();
  private globalTimers: ActiveTimer[] = [];

  init(config: ToolsConfig): void {
    const { timers } = config.tools;
    if (!timers || timers.length === 0) {
      return;
    }

    for (const timer of timers) {
      const endDate = new Date(timer.endDate);
      if (endDate <= new Date()) {
        continue;
      }

      const activeTimer: ActiveTimer = { endDate, variant: timer.variant };

      for (const target of timer.targets) {
        if (target.productId) {
          this.timersMap.set(target.productId, activeTimer);
        } else {
          this.globalTimers.push(activeTimer);
        }
      }
    }

    if (this.timersMap.size === 0 && this.globalTimers.length === 0) {
      return;
    }

    onProductElement((element) => this.handleProductElement(element));

    this.intervalId = setInterval(() => this.updateAll(), 1000);
  }

  destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    for (const host of this.timerElements.values()) {
      host.remove();
    }
    this.timerElements.clear();
    this.timersMap.clear();
    this.globalTimers = [];
  }

  private handleProductElement(element: HTMLElement): void {
    const productId = element.getAttribute('data-ac-product-id');
    if (!productId) {
      return;
    }

    const timer = this.timersMap.get(productId) ?? this.globalTimers[0];
    if (!timer || timer.endDate <= new Date()) {
      return;
    }

    const remaining = this.formatTimeRemaining(timer.endDate);
    const host = injectShadowBadge(
      element,
      'ac-timer-badge',
      CSS,
      `<div class="ac-timer">
        <span class="ac-timer-icon">⏱</span>
        <span class="ac-timer-label">${remaining}</span>
      </div>`,
    );

    this.timerElements.set(element, host);
  }

  private updateAll(): void {
    for (const [element, host] of this.timerElements) {
      const productId = element.getAttribute('data-ac-product-id');
      if (!productId) {
        continue;
      }

      const timer = this.timersMap.get(productId) ?? this.globalTimers[0];
      if (!timer) {
        continue;
      }

      if (timer.endDate <= new Date()) {
        host.remove();
        this.timerElements.delete(element);
        continue;
      }

      const label = host.shadowRoot?.querySelector('.ac-timer-label');
      if (label) {
        label.textContent = this.formatTimeRemaining(timer.endDate);
      }
    }
  }

  private formatTimeRemaining(endDate: Date): string {
    const diffMs = endDate.getTime() - Date.now();
    if (diffMs <= 0) {
      return '00:00:00';
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
}
