import type { ToolsConfig, Widget } from '../core/types';
import { onProductElement } from '../core/observer';
import { injectShadowBadge } from '../core/shadowRenderer';

const CSS = `
  .ac-cash-discount {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    color: #16a34a;
    font-weight: 600;
    margin-top: 2px;
  }

  .ac-cash-discount-label {
    font-size: 11px;
    font-weight: 500;
    color: #6b7280;
  }

  .ac-cash-discount-price {
    font-size: 16px;
  }
`;

interface CashDiscountMatch {
  discountPercentage: number;
}

export class CashDiscountWidget implements Widget {
  readonly name = 'cashDiscount';
  private discountMap = new Map<string, CashDiscountMatch>();
  private globalDiscount: CashDiscountMatch | null = null;
  private hosts: HTMLElement[] = [];

  init(config: ToolsConfig): void {
    const { cashDiscounts } = config.tools;
    if (!cashDiscounts || cashDiscounts.length === 0) {
      return;
    }

    for (const cashDiscount of cashDiscounts) {
      const match: CashDiscountMatch = {
        discountPercentage: cashDiscount.discountPercentage,
      };

      if (cashDiscount.productIds.length === 0) {
        this.globalDiscount = match;
      } else {
        for (const productId of cashDiscount.productIds) {
          this.discountMap.set(productId, match);
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
    this.discountMap.clear();
    this.globalDiscount = null;
  }

  private handleProductElement(element: HTMLElement): void {
    const productId = element.getAttribute('data-ac-product-id');
    const priceAttr = element.getAttribute('data-ac-price');

    if (!productId || !priceAttr) {
      return;
    }

    const priceCents = parseInt(priceAttr, 10);
    if (isNaN(priceCents) || priceCents <= 0) {
      return;
    }

    const match = this.discountMap.get(productId) ?? this.globalDiscount;
    if (!match) {
      return;
    }

    const discountedCents = Math.round(
      priceCents * (1 - match.discountPercentage / 100),
    );
    const formattedPrice = this.formatCurrency(discountedCents);

    const host = injectShadowBadge(
      element,
      'ac-cash-discount-badge',
      CSS,
      `<div class="ac-cash-discount">
        <span class="ac-cash-discount-price">${formattedPrice}</span>
        <span class="ac-cash-discount-label">no PIX (${match.discountPercentage}% off)</span>
      </div>`,
    );

    this.hosts.push(host);
  }

  private formatCurrency(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  }
}
