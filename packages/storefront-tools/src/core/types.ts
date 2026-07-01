export interface ToolsTimerTarget {
  type: string;
  productId?: string;
}

export interface ToolsTimer {
  endDate: string;
  variant: string;
  targets: ToolsTimerTarget[];
}

export interface ToolsIndicator {
  text: string;
  variant: string;
  productIds: string[];
}

export interface ToolsLastUnitsRule {
  active: boolean;
  maximumUnits: number;
  variant: string;
  productIds: string[];
}

export interface ToolsCashDiscount {
  discountPercentage: number;
  productIds: string[];
}

export interface ToolsDiscountModal {
  id: string;
  variant: string;
  trigger: string;
  pages: string[];
  title: string;
  subtitle: string;
  fields: string[];
  offerValue: string;
}

export interface ToolsSocialProofRule {
  active: boolean;
  showViews: boolean;
  showAddToCart: boolean;
  showOrders: boolean;
}

export interface ToolsSessionReplay {
  enabled: boolean;
  sampleRate: number;
}

export interface ToolsConfig {
  hostname: string;
  tools: {
    adBar: { messages: string[] } | null;
    timers: ToolsTimer[];
    indicators: ToolsIndicator[];
    lastUnitsRule: ToolsLastUnitsRule | null;
    cashDiscounts: ToolsCashDiscount[];
    discountModals: ToolsDiscountModal[];
    socialProofRule: ToolsSocialProofRule | null;
    sessionReplay: ToolsSessionReplay | null;
  };
  theme: { primary: string; secondary: string } | null;
}

export interface DataLayerEvent {
  event: string;
  [key: string]: unknown;
}

export interface Widget {
  readonly name: string;
  init(config: ToolsConfig): void;
  destroy(): void;
}

export interface AcessoComercialGlobal {
  hostname: string;
  config: ToolsConfig | null;
  push: (event: DataLayerEvent) => void;
  destroy: () => void;
}
