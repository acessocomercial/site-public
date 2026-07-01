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
  .ac-indicator {
    position: absolute;
    top: 8px;
    left: 8px;
    padding: 3px 10px;
    border-radius: 4px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    line-height: 1.4;
    z-index: 1;
    pointer-events: none;
  }
`;

interface IndicatorMatch {
  text: string;
  variant: string;
}

export class IndicatorWidget implements Widget {
  readonly name = 'indicator';
  private indicatorMap = new Map<string, IndicatorMatch>();
  private globalIndicators: IndicatorMatch[] = [];
  private hosts: HTMLElement[] = [];

  init(config: ToolsConfig): void {
    const { indicators } = config.tools;
    if (!indicators || indicators.length === 0) {
      return;
    }

    for (const indicator of indicators) {
      const match: IndicatorMatch = {
        text: indicator.text,
        variant: indicator.variant,
      };

      if (indicator.productIds.length === 0) {
        this.globalIndicators.push(match);
      } else {
        for (const productId of indicator.productIds) {
          this.indicatorMap.set(productId, match);
        }
      }
    }

    onProductElement((element) => this.handleProductElement(element));
  }

  destroy(): void {
    for (const host of this.hosts) {
      host.remove();
    }
    this.hosts = [];
    this.indicatorMap.clear();
    this.globalIndicators = [];
  }

  private handleProductElement(element: HTMLElement): void {
    const productId = element.getAttribute('data-ac-product-id');
    if (!productId) {
      return;
    }

    const match =
      this.indicatorMap.get(productId) ?? this.globalIndicators[0];
    if (!match) {
      return;
    }

    const style = VARIANT_STYLES[match.variant] ?? VARIANT_STYLES.dark;
    const inlineStyle = `background:${style.background};color:${style.color};`;

    const host = injectShadowBadge(
      element,
      'ac-indicator-badge',
      CSS,
      `<div class="ac-indicator" style="${inlineStyle}">${this.escapeHtml(match.text)}</div>`,
    );

    this.hosts.push(host);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
