import type { ToolsConfig, Widget } from '../core/types';
import { createShadowWidget, removeShadowWidget } from '../core/shadowRenderer';

const CSS = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .ac-discount-overlay {
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

  .ac-discount-overlay.ac-visible {
    opacity: 1;
    visibility: visible;
  }

  .ac-discount-modal {
    background: #ffffff;
    border-radius: 12px;
    padding: 32px;
    max-width: 420px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    position: relative;
    transform: scale(0.9);
    transition: transform 0.3s ease;
  }

  .ac-discount-overlay.ac-visible .ac-discount-modal {
    transform: scale(1);
  }

  .ac-discount-close {
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

  .ac-discount-close:hover {
    background: #e5e7eb;
    color: #374151;
  }

  .ac-discount-title {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 22px;
    font-weight: 700;
    color: #111827;
    margin-bottom: 8px;
    text-align: center;
  }

  .ac-discount-subtitle {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 15px;
    color: #6b7280;
    margin-bottom: 20px;
    text-align: center;
    line-height: 1.5;
  }

  .ac-discount-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .ac-discount-input {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #111827;
    outline: none;
    transition: border-color 0.2s;
  }

  .ac-discount-input:focus {
    border-color: var(--ac-primary, #2563eb);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .ac-discount-submit {
    width: 100%;
    padding: 12px;
    border: none;
    border-radius: 8px;
    background: var(--ac-primary, #2563eb);
    color: #ffffff;
    font-size: 15px;
    font-weight: 600;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .ac-discount-submit:hover {
    opacity: 0.9;
  }

  .ac-discount-offer {
    text-align: center;
    margin-top: 16px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 16px;
    font-weight: 700;
    color: var(--ac-primary, #2563eb);
  }

  .ac-discount-success {
    text-align: center;
  }

  .ac-discount-coupon-code {
    display: inline-block;
    margin-top: 12px;
    padding: 10px 24px;
    background: #f3f4f6;
    border: 2px dashed #d1d5db;
    border-radius: 8px;
    font-family: monospace;
    font-size: 18px;
    font-weight: 700;
    color: #111827;
    letter-spacing: 2px;
  }
`;

const FIELD_LABELS: Record<string, { label: string; type: string; placeholder: string }> = {
  name: { label: 'Nome', type: 'text', placeholder: 'Seu nome' },
  email: { label: 'E-mail', type: 'email', placeholder: 'seu@email.com' },
  phone: { label: 'Telefone', type: 'tel', placeholder: '(11) 99999-9999' },
  birthday: { label: 'Aniversário', type: 'date', placeholder: '' },
};

const SHOWN_STORAGE_KEY = 'ac_discount_modal_shown_';

export class DiscountModalWidget implements Widget {
  readonly name = 'discountModal';
  private hosts: HTMLElement[] = [];
  private exitIntentHandler: ((event: MouseEvent) => void) | null = null;
  private timeoutIds: ReturnType<typeof setTimeout>[] = [];

  init(config: ToolsConfig): void {
    const { discountModals } = config.tools;
    if (!discountModals || discountModals.length === 0) {
      return;
    }

    const primaryColor = config.theme?.primary ?? '#2563eb';

    for (const modal of discountModals) {
      if (this.wasAlreadyShown(modal.id)) {
        continue;
      }

      if (!this.isCurrentPageMatch(modal.pages)) {
        continue;
      }

      if (modal.trigger === 'exit_intent') {
        this.setupExitIntent(modal, primaryColor);
      } else {
        const timeoutMs = modal.trigger === 'timed' ? 10000 : 5000;
        const timeoutId = setTimeout(() => {
          this.showModal(modal, primaryColor);
        }, timeoutMs);
        this.timeoutIds.push(timeoutId);
      }
    }
  }

  destroy(): void {
    if (this.exitIntentHandler) {
      document.removeEventListener('mouseout', this.exitIntentHandler);
      this.exitIntentHandler = null;
    }

    for (const timeoutId of this.timeoutIds) {
      clearTimeout(timeoutId);
    }
    this.timeoutIds = [];

    for (const host of this.hosts) {
      removeShadowWidget(host);
    }
    this.hosts = [];
  }

  private setupExitIntent(
    modal: ToolsConfig['tools']['discountModals'][number],
    primaryColor: string,
  ): void {
    this.exitIntentHandler = (event: MouseEvent) => {
      if (event.clientY <= 5) {
        this.showModal(modal, primaryColor);
        if (this.exitIntentHandler) {
          document.removeEventListener('mouseout', this.exitIntentHandler);
          this.exitIntentHandler = null;
        }
      }
    };
    document.addEventListener('mouseout', this.exitIntentHandler);
  }

  private showModal(
    modal: ToolsConfig['tools']['discountModals'][number],
    primaryColor: string,
  ): void {
    if (this.wasAlreadyShown(modal.id)) {
      return;
    }

    const styledCss = CSS
      .replace(/var\(--ac-primary, #2563eb\)/g, primaryColor);

    const fieldsHtml = modal.fields
      .map((field) => {
        const fieldConfig = FIELD_LABELS[field] ?? {
          label: field,
          type: 'text',
          placeholder: '',
        };
        return `<input
          class="ac-discount-input"
          type="${fieldConfig.type}"
          name="${field}"
          placeholder="${fieldConfig.placeholder}"
          required
        />`;
      })
      .join('');

    const { host, container } = createShadowWidget({
      tagName: 'ac-discount-modal',
      css: styledCss,
      html: `<div class="ac-discount-overlay">
        <div class="ac-discount-modal">
          <button class="ac-discount-close" aria-label="Fechar">&times;</button>
          <h2 class="ac-discount-title">${this.escapeHtml(modal.title)}</h2>
          <p class="ac-discount-subtitle">${this.escapeHtml(modal.subtitle)}</p>
          <form class="ac-discount-form">
            ${fieldsHtml}
            <button type="submit" class="ac-discount-submit">Garantir desconto</button>
          </form>
          <div class="ac-discount-offer">${this.escapeHtml(modal.offerValue)}</div>
        </div>
      </div>`,
    });

    this.hosts.push(host);

    requestAnimationFrame(() => {
      const overlay = container.querySelector('.ac-discount-overlay');
      overlay?.classList.add('ac-visible');
    });

    const closeButton = container.querySelector('.ac-discount-close');
    const overlay = container.querySelector('.ac-discount-overlay');
    const form = container.querySelector('.ac-discount-form');

    closeButton?.addEventListener('click', () => {
      this.closeModal(host, container);
    });

    overlay?.addEventListener('click', (event) => {
      if (event.target === overlay) {
        this.closeModal(host, container);
      }
    });

    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      this.markAsShown(modal.id);
      this.showSuccessState(container, modal.offerValue);
    });
  }

  private closeModal(host: HTMLElement, container: HTMLElement): void {
    const overlay = container.querySelector('.ac-discount-overlay');
    overlay?.classList.remove('ac-visible');
    setTimeout(() => removeShadowWidget(host), 300);
  }

  private showSuccessState(container: HTMLElement, offerValue: string): void {
    const modal = container.querySelector('.ac-discount-modal');
    if (!modal) {
      return;
    }

    modal.innerHTML = `
      <button class="ac-discount-close" aria-label="Fechar">&times;</button>
      <div class="ac-discount-success">
        <h2 class="ac-discount-title">Parabéns!</h2>
        <p class="ac-discount-subtitle">Use o cupom abaixo no seu pedido:</p>
        <div class="ac-discount-coupon-code">${this.escapeHtml(offerValue)}</div>
      </div>
    `;

    const closeButton = modal.querySelector('.ac-discount-close');
    const host = container.closest('ac-discount-modal');
    closeButton?.addEventListener('click', () => {
      if (host instanceof HTMLElement) {
        this.closeModal(host, container);
      }
    });
  }

  private isCurrentPageMatch(pages: string[]): boolean {
    if (pages.length === 0) {
      return true;
    }

    const path = window.location.pathname;
    const pageMap: Record<string, (p: string) => boolean> = {
      home: (p) => p === '/' || p === '',
      product: (p) => p.includes('/produto') || p.includes('/product'),
      category: (p) => p.includes('/categoria') || p.includes('/category'),
      cart: (p) => p.includes('/carrinho') || p.includes('/cart'),
      all: () => true,
    };

    return pages.some((page) => {
      const matcher = pageMap[page];
      return matcher ? matcher(path) : false;
    });
  }

  private wasAlreadyShown(modalId: string): boolean {
    try {
      return sessionStorage.getItem(SHOWN_STORAGE_KEY + modalId) === 'true';
    } catch {
      return false;
    }
  }

  private markAsShown(modalId: string): void {
    try {
      sessionStorage.setItem(SHOWN_STORAGE_KEY + modalId, 'true');
    } catch {
      // sessionStorage unavailable
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
