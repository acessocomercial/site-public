import type { ToolsConfig, Widget } from '../core/types';
import { createShadowWidget, removeShadowWidget } from '../core/shadowRenderer';
import { onEvent } from '../core/dataLayer';

const DISPLAY_DURATION_MS = 5000;
const INTERVAL_BETWEEN_MS = 8000;

const CSS = `
  .ac-social-proof {
    position: fixed;
    bottom: 20px;
    left: 20px;
    z-index: 999998;
    max-width: 320px;
    background: #ffffff;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
    padding: 14px 18px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.4s ease, transform 0.4s ease;
    pointer-events: none;
  }

  .ac-social-proof.ac-visible {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }

  .ac-social-proof-content {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .ac-social-proof-icon {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
  }

  .ac-social-proof-icon.ac-purchase {
    background: #dcfce7;
  }

  .ac-social-proof-icon.ac-view {
    background: #dbeafe;
  }

  .ac-social-proof-icon.ac-cart {
    background: #fef3c7;
  }

  .ac-social-proof-text {
    font-size: 13px;
    color: #374151;
    line-height: 1.4;
  }

  .ac-social-proof-text strong {
    color: #111827;
    font-weight: 600;
  }

  .ac-social-proof-time {
    font-size: 11px;
    color: #9ca3af;
    margin-top: 2px;
  }
`;

interface SocialProofMessage {
  icon: string;
  iconClass: string;
  text: string;
}

export class SocialProofWidget implements Widget {
  readonly name = 'socialProof';
  private host: HTMLElement | null = null;
  private container: HTMLElement | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private messages: SocialProofMessage[] = [];
  private currentIndex = 0;
  private unsubscribers: (() => void)[] = [];

  init(config: ToolsConfig): void {
    const { socialProofRule } = config.tools;
    if (!socialProofRule?.active) {
      return;
    }

    this.buildDefaultMessages(socialProofRule);

    if (socialProofRule.showOrders) {
      this.unsubscribers.push(
        onEvent('purchase', (event) => {
          const name = (event.customerName as string) ?? 'Alguém';
          const city = (event.city as string) ?? '';
          const product = (event.productName as string) ?? 'um produto';
          const locationText = city ? ` de ${city}` : '';
          this.messages.push({
            icon: '🛒',
            iconClass: 'ac-purchase',
            text: `<strong>${name}</strong>${locationText} acabou de comprar <strong>${product}</strong>`,
          });
        }),
      );
    }

    if (socialProofRule.showAddToCart) {
      this.unsubscribers.push(
        onEvent('add_to_cart', (event) => {
          const product = (event.productName as string) ?? 'um produto';
          this.messages.push({
            icon: '🛍',
            iconClass: 'ac-cart',
            text: `Alguém adicionou <strong>${product}</strong> ao carrinho`,
          });
        }),
      );
    }

    const { host, container } = createShadowWidget({
      tagName: 'ac-social-proof',
      css: CSS,
      html: `<div class="ac-social-proof">
        <div class="ac-social-proof-content">
          <div class="ac-social-proof-icon"></div>
          <div>
            <div class="ac-social-proof-text"></div>
            <div class="ac-social-proof-time">agora mesmo</div>
          </div>
        </div>
      </div>`,
    });

    this.host = host;
    this.container = container;

    if (this.messages.length > 0) {
      this.timeoutId = setTimeout(
        () => this.startCycling(),
        3000,
      );
    }
  }

  destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    this.unsubscribers = [];

    if (this.host) {
      removeShadowWidget(this.host);
      this.host = null;
    }

    this.container = null;
    this.messages = [];
  }

  private buildDefaultMessages(rule: ToolsConfig['tools']['socialProofRule']): void {
    if (!rule) {
      return;
    }

    if (rule.showViews) {
      this.messages.push(
        {
          icon: '👀',
          iconClass: 'ac-view',
          text: '<strong>12 pessoas</strong> estão vendo este produto agora',
        },
        {
          icon: '👀',
          iconClass: 'ac-view',
          text: '<strong>8 pessoas</strong> visualizaram este produto recentemente',
        },
      );
    }

    if (rule.showOrders) {
      this.messages.push(
        {
          icon: '🛒',
          iconClass: 'ac-purchase',
          text: '<strong>Maria</strong> de São Paulo acabou de comprar este produto',
        },
        {
          icon: '🛒',
          iconClass: 'ac-purchase',
          text: '<strong>João</strong> de Curitiba comprou este produto há 2 min',
        },
      );
    }

    if (rule.showAddToCart) {
      this.messages.push({
        icon: '🛍',
        iconClass: 'ac-cart',
        text: 'Alguém adicionou este produto ao carrinho',
      });
    }
  }

  private startCycling(): void {
    this.showMessage(this.messages[0]);

    this.intervalId = setInterval(() => {
      this.hideToast();

      setTimeout(() => {
        this.currentIndex = (this.currentIndex + 1) % this.messages.length;
        this.showMessage(this.messages[this.currentIndex]);
      }, 600);
    }, DISPLAY_DURATION_MS + INTERVAL_BETWEEN_MS);
  }

  private showMessage(message: SocialProofMessage): void {
    if (!this.container) {
      return;
    }

    const toast = this.container.querySelector('.ac-social-proof');
    const icon = this.container.querySelector('.ac-social-proof-icon');
    const text = this.container.querySelector('.ac-social-proof-text');

    if (icon) {
      icon.textContent = message.icon;
      icon.className = `ac-social-proof-icon ${message.iconClass}`;
    }

    if (text) {
      text.innerHTML = message.text;
    }

    toast?.classList.add('ac-visible');

    setTimeout(() => this.hideToast(), DISPLAY_DURATION_MS);
  }

  private hideToast(): void {
    const toast = this.container?.querySelector('.ac-social-proof');
    toast?.classList.remove('ac-visible');
  }
}
