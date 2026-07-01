import type { ToolsConfig, Widget } from '../core/types';
import { createShadowWidget, removeShadowWidget } from '../core/shadowRenderer';
import { onEvent } from '../core/dataLayer';

const CSS = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .ac-funnel-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s ease, visibility 0.3s ease;
  }

  .ac-funnel-overlay.ac-visible {
    opacity: 1;
    visibility: visible;
  }

  .ac-funnel-modal {
    background: #ffffff;
    border-radius: 12px;
    padding: 28px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    position: relative;
    transform: scale(0.9);
    transition: transform 0.3s ease;
  }

  .ac-funnel-overlay.ac-visible .ac-funnel-modal {
    transform: scale(1);
  }

  .ac-funnel-close {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 28px;
    height: 28px;
    border: none;
    background: #f3f4f6;
    border-radius: 50%;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b7280;
    transition: background 0.2s;
  }

  .ac-funnel-close:hover {
    background: #e5e7eb;
  }

  .ac-funnel-title {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 18px;
    font-weight: 700;
    color: #111827;
    margin-bottom: 20px;
    text-align: center;
  }

  .ac-funnel-offers {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .ac-funnel-offer {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    transition: border-color 0.2s, box-shadow 0.2s;
    cursor: pointer;
  }

  .ac-funnel-offer:hover {
    border-color: var(--ac-primary, #2563eb);
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
  }

  .ac-funnel-offer-image {
    width: 64px;
    height: 64px;
    border-radius: 8px;
    object-fit: cover;
    flex-shrink: 0;
    background: #f3f4f6;
  }

  .ac-funnel-offer-info {
    flex: 1;
    min-width: 0;
  }

  .ac-funnel-offer-name {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: #111827;
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ac-funnel-offer-prices {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .ac-funnel-offer-original {
    font-size: 12px;
    color: #9ca3af;
    text-decoration: line-through;
  }

  .ac-funnel-offer-discounted {
    font-size: 15px;
    font-weight: 700;
    color: #16a34a;
  }

  .ac-funnel-offer-badge {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 4px;
    background: #dc2626;
    color: #ffffff;
    flex-shrink: 0;
  }

  .ac-funnel-skip {
    display: block;
    margin: 16px auto 0;
    background: none;
    border: none;
    color: #9ca3af;
    font-size: 13px;
    cursor: pointer;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    text-decoration: underline;
  }

  .ac-funnel-skip:hover {
    color: #6b7280;
  }
`;

export class FunnelWidget implements Widget {
  readonly name = 'funnel';
  private host: HTMLElement | null = null;
  private config: ToolsConfig | null = null;
  private unsubscribe: (() => void) | null = null;
  private shown = false;

  init(config: ToolsConfig): void {
    this.config = config;

    this.unsubscribe = onEvent('add_to_cart', () => {
      if (!this.shown) {
        this.shown = true;
        this.show();
      }
    });
  }

  destroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;

    if (this.host) {
      removeShadowWidget(this.host);
      this.host = null;
    }

    this.config = null;
    this.shown = false;
  }

  private show(): void {
    if (!this.config) {
      return;
    }

    const primaryColor = this.config.theme?.primary ?? '#2563eb';

    const offersHtml = this.config.tools.discountModals
      .slice(0, 3)
      .map(() => '')
      .join('');

    if (!offersHtml && !this.hasFunnelOffers()) {
      return;
    }

    const styledCss = CSS.replace(
      /var\(--ac-primary, #2563eb\)/g,
      primaryColor,
    );

    const { host, container } = createShadowWidget({
      tagName: 'ac-funnel',
      css: styledCss,
      html: `<div class="ac-funnel-overlay">
        <div class="ac-funnel-modal">
          <button class="ac-funnel-close" aria-label="Fechar">&times;</button>
          <h2 class="ac-funnel-title">Aproveite estas ofertas especiais!</h2>
          <div class="ac-funnel-offers">
            ${this.buildOffersHtml()}
          </div>
          <button class="ac-funnel-skip">Não, obrigado</button>
        </div>
      </div>`,
    });

    this.host = host;

    requestAnimationFrame(() => {
      const overlay = container.querySelector('.ac-funnel-overlay');
      overlay?.classList.add('ac-visible');
    });

    const closeButton = container.querySelector('.ac-funnel-close');
    const skipButton = container.querySelector('.ac-funnel-skip');
    const overlay = container.querySelector('.ac-funnel-overlay');

    const close = () => {
      overlay?.classList.remove('ac-visible');
      setTimeout(() => {
        if (this.host) {
          removeShadowWidget(this.host);
          this.host = null;
        }
      }, 300);
    };

    closeButton?.addEventListener('click', close);
    skipButton?.addEventListener('click', close);
    overlay?.addEventListener('click', (event) => {
      if (event.target === overlay) {
        close();
      }
    });
  }

  private hasFunnelOffers(): boolean {
    return false;
  }

  private buildOffersHtml(): string {
    return `
      <div class="ac-funnel-offer">
        <div class="ac-funnel-offer-info">
          <div class="ac-funnel-offer-name">Confira nossas ofertas na loja!</div>
          <div class="ac-funnel-offer-prices">
            <span class="ac-funnel-offer-discounted">Descontos exclusivos</span>
          </div>
        </div>
        <span class="ac-funnel-offer-badge">OFERTA</span>
      </div>
    `;
  }
}
