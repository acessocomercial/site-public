import type { ToolsConfig, Widget } from '../core/types';
import { createShadowWidget, removeShadowWidget } from '../core/shadowRenderer';

const ROTATION_INTERVAL_MS = 5000;

const CSS = `
  .ac-adbar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 10px 16px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    color: #ffffff;
    background: var(--ac-primary, #111827);
    text-align: center;
    line-height: 1.4;
    box-sizing: border-box;
    z-index: 999999;
  }

  .ac-adbar-message {
    opacity: 1;
    transition: opacity 0.4s ease-in-out;
  }

  .ac-adbar-message.ac-fade-out {
    opacity: 0;
  }
`;

export class AdBarWidget implements Widget {
  readonly name = 'adBar';
  private host: HTMLElement | null = null;
  private messageElement: HTMLElement | null = null;
  private rotationTimer: ReturnType<typeof setInterval> | null = null;
  private currentIndex = 0;
  private messages: string[] = [];

  init(config: ToolsConfig): void {
    const { adBar } = config.tools;
    if (!adBar || adBar.messages.length === 0) {
      return;
    }

    this.messages = adBar.messages;
    this.currentIndex = 0;

    const primaryColor = config.theme?.primary ?? '#111827';

    const { host, container } = createShadowWidget({
      tagName: 'ac-adbar',
      css: CSS.replace('var(--ac-primary, #111827)', primaryColor),
      html: `<div class="ac-adbar">
        <span class="ac-adbar-message">${this.escapeHtml(this.messages[0])}</span>
      </div>`,
      position: 'prepend',
    });

    this.host = host;
    this.messageElement = container.querySelector('.ac-adbar-message');

    if (this.messages.length > 1) {
      this.startRotation();
    }
  }

  destroy(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }

    if (this.host) {
      removeShadowWidget(this.host);
      this.host = null;
    }

    this.messageElement = null;
  }

  private startRotation(): void {
    this.rotationTimer = setInterval(() => {
      if (!this.messageElement) {
        return;
      }

      this.messageElement.classList.add('ac-fade-out');

      setTimeout(() => {
        this.currentIndex = (this.currentIndex + 1) % this.messages.length;
        if (this.messageElement) {
          this.messageElement.textContent = this.messages[this.currentIndex];
          this.messageElement.classList.remove('ac-fade-out');
        }
      }, 400);
    }, ROTATION_INTERVAL_MS);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
