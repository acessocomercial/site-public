import { fetchToolsConfig } from './core/config';
import type { AcessoComercialGlobal, DataLayerEvent, ToolsConfig } from './core/types';

(function bootstrap(): void {
  const scriptTag = document.currentScript as HTMLScriptElement | null;
  if (!scriptTag) {
    console.warn('[ac-tools] Could not find script tag');
    return;
  }

  const hostname = scriptTag.getAttribute('data-hostname');
  if (!hostname) {
    console.warn('[ac-tools] Missing data-hostname attribute on script tag');
    return;
  }

  const scriptSrc = scriptTag.getAttribute('src') ?? '';
  const apiBase = resolveApiBase(scriptSrc);
  const toolsBundleUrl = resolveToolsBundleUrl(scriptSrc);

  (window as Record<string, unknown>).acDataLayer =
    (window as Record<string, unknown>).acDataLayer ?? [];

  const acGlobal: AcessoComercialGlobal = {
    hostname,
    config: null,
    push(event: DataLayerEvent): void {
      const dataLayer = (window as Record<string, unknown>).acDataLayer;
      if (dataLayer && typeof (dataLayer as { push?: (e: DataLayerEvent) => void }).push === 'function') {
        (dataLayer as { push: (e: DataLayerEvent) => void }).push(event);
      }
    },
    destroy(): void {
      const tools = (window as Record<string, unknown>).__acToolsModule as
        | { destroyTools: () => void }
        | undefined;
      tools?.destroyTools();
    },
  };

  (window as Record<string, unknown>).AcessoComercial = acGlobal;

  loadConfig(apiBase, hostname, toolsBundleUrl, acGlobal);
})();

function resolveApiBase(scriptSrc: string): string {
  if (!scriptSrc) {
    return window.location.origin;
  }

  try {
    const url = new URL(scriptSrc);
    return url.origin;
  } catch {
    return window.location.origin;
  }
}

function resolveToolsBundleUrl(scriptSrc: string): string {
  if (!scriptSrc) {
    return '/api/storefront/tools/tools.js';
  }

  try {
    const url = new URL(scriptSrc);
    return `${url.origin}${url.pathname.replace('loader.js', 'tools.js')}`;
  } catch {
    return scriptSrc.replace('loader.js', 'tools.js');
  }
}

async function loadConfig(
  apiBase: string,
  hostname: string,
  toolsBundleUrl: string,
  acGlobal: AcessoComercialGlobal,
): Promise<void> {
  try {
    const config = await fetchToolsConfig(apiBase, hostname);
    if (!config) {
      return;
    }

    acGlobal.config = config;

    const hasActiveTools =
      config.tools.adBar !== null ||
      config.tools.timers.length > 0 ||
      config.tools.indicators.length > 0 ||
      config.tools.lastUnitsRule !== null ||
      config.tools.cashDiscounts.length > 0 ||
      config.tools.discountModals.length > 0 ||
      config.tools.socialProofRule !== null ||
      config.tools.sessionReplay?.enabled;

    if (!hasActiveTools) {
      return;
    }

    await loadToolsBundle(toolsBundleUrl, config);
  } catch (error) {
    console.warn('[ac-tools] Failed to initialize:', error);
  }
}

async function loadToolsBundle(
  toolsBundleUrl: string,
  config: ToolsConfig,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = toolsBundleUrl;
    script.async = true;

    script.onload = () => {
      try {
        const toolsModule = (window as Record<string, unknown>).__acTools as
          | { initTools: (config: ToolsConfig) => void; destroyTools: () => void }
          | undefined;

        if (toolsModule?.initTools) {
          (window as Record<string, unknown>).__acToolsModule = toolsModule;
          toolsModule.initTools(config);
        }
        resolve();
      } catch (error) {
        console.warn('[ac-tools] Error initializing tools bundle:', error);
        reject(error);
      }
    };

    script.onerror = () => {
      console.warn('[ac-tools] Failed to load tools bundle');
      reject(new Error('Failed to load tools bundle'));
    };

    document.head.appendChild(script);
  });
}
