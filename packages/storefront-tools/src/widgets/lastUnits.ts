import type { ToolsConfig, Widget } from '../core/types';
import { onProductElement } from '../core/observer';
import { injectShadowBadge } from '../core/shadowRenderer';

const VARIANT_STYLES: Record<string, { background: string; color: string }> = {
  success: { background: '#16a34a', color: '#ffffff' },
  danger: { background: '#dc2626', color: '#ffffff' },
  warning: { background: '#f59e0b', color: '#ffffff' },
  info: { background: '#2563eb', color: '#ffffff' },
  dark: { background: '#111827', color: '#ffffff' },
};

const CSS = `
  .ac-last-units {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 4px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 12px;
    font-weight: 600;
    margin-top: 4px;
  }

  .ac-last-units-icon {
    font-size: 13px;
  }
`;

export class LastUnitsWidget implements Widget {
  readonly name = 'lastUnits';
  private config: ToolsConfig['tools']['lastUnitsRule'] = null;
  private hosts: HTMLElement[] = [];

  init(config: ToolsConfig): void {
    const { lastUnitsRule } = config.tools;
    if (!lastUnitsRule?.active) {
      return;
    }

    this.config = lastUnitsRule;
    onProductElement((element) => this.handleProductElement(element));
  }

  destroy(): void {
    for (const host of this.hosts) {
      host.remove();
    }
    this.hosts = [];
    this.config = null;
  }

  private handleProductElement(element: HTMLElement): void {
    if (!this.config) {
      return;
    }

    const productId = element.getAttribute('data-ac-product-id');
    if (!productId) {
      return;
    }

    const isTargeted =
      this.config.productIds.length === 0 ||
      this.config.productIds.includes(productId);

    if (!isTargeted) {
      return;
    }

    const quantityAttr = element.getAttribute('data-ac-quantity');
    if (!quantityAttr) {
      return;
    }

    const quantity = parseInt(quantityAttr, 10);
    if (isNaN(quantity) || quantity > this.config.maximumUnits || quantity <= 0) {
      return;
    }

    const style = VARIANT_STYLES[this.config.variant] ?? VARIANT_STYLES.danger;
    const inlineStyle = `background:${style.background};color:${style.color};`;

    const host = injectShadowBadge(
      element,
      'ac-last-units-badge',
      CSS,
      `<div class="ac-last-units" style="${inlineStyle}">
        <span class="ac-last-units-icon">🔥</span>
        <span>Restam apenas ${quantity}!</span>
      </div>`,
    );

    this.hosts.push(host);
  }
}
