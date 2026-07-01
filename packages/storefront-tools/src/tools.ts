import type { ToolsConfig, Widget } from './core/types';
import { startObserver, stopObserver } from './core/observer';
import { initDataLayer, destroyDataLayer } from './core/dataLayer';
import { AdBarWidget } from './widgets/adBar';
import { TimerWidget } from './widgets/timer';
import { IndicatorWidget } from './widgets/indicator';
import { LastUnitsWidget } from './widgets/lastUnits';
import { CashDiscountWidget } from './widgets/cashDiscount';
import { DiscountModalWidget } from './widgets/discountModal';
import { SocialProofWidget } from './widgets/socialProof';
import { FunnelWidget } from './widgets/funnel';
import { SessionReplayWidget } from './widgets/sessionReplay';

const activeWidgets: Widget[] = [];

function createWidgets(): Widget[] {
  return [
    new AdBarWidget(),
    new TimerWidget(),
    new IndicatorWidget(),
    new LastUnitsWidget(),
    new CashDiscountWidget(),
    new DiscountModalWidget(),
    new SocialProofWidget(),
    new FunnelWidget(),
    new SessionReplayWidget(),
  ];
}

export function initTools(config: ToolsConfig): void {
  initDataLayer();
  startObserver();

  const widgets = createWidgets();
  for (const widget of widgets) {
    try {
      widget.init(config);
      activeWidgets.push(widget);
    } catch (error) {
      console.warn(`[ac-tools] Failed to init widget "${widget.name}":`, error);
    }
  }
}

export function destroyTools(): void {
  for (const widget of activeWidgets) {
    try {
      widget.destroy();
    } catch (error) {
      console.warn(`[ac-tools] Failed to destroy widget "${widget.name}":`, error);
    }
  }
  activeWidgets.length = 0;
  stopObserver();
  destroyDataLayer();
}
