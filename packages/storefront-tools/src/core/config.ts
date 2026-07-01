import type { ToolsConfig } from './types';

const CACHE_KEY_PREFIX = 'ac_tools_config_';
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CachedConfig {
  data: ToolsConfig;
  expiry: number;
}

function getCachedConfig(hostname: string): ToolsConfig | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + hostname);
    if (!raw) {
      return null;
    }

    const cached: CachedConfig = JSON.parse(raw);
    if (Date.now() > cached.expiry) {
      localStorage.removeItem(CACHE_KEY_PREFIX + hostname);
      return null;
    }

    return cached.data;
  } catch {
    return null;
  }
}

function setCachedConfig(hostname: string, data: ToolsConfig): void {
  try {
    const cached: CachedConfig = {
      data,
      expiry: Date.now() + CACHE_TTL_MS,
    };
    localStorage.setItem(CACHE_KEY_PREFIX + hostname, JSON.stringify(cached));
  } catch {
    // localStorage quota exceeded or unavailable — silently ignore
  }
}

export async function fetchToolsConfig(
  apiBase: string,
  hostname: string,
): Promise<ToolsConfig | null> {
  const cached = getCachedConfig(hostname);
  if (cached) {
    return cached;
  }

  try {
    const url = `${apiBase}/api/storefront/tools/${encodeURIComponent(hostname)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      console.warn(
        `[ac-tools] Failed to fetch config: ${response.status}`,
      );
      return null;
    }

    const data: ToolsConfig = await response.json();
    setCachedConfig(hostname, data);
    return data;
  } catch (error) {
    console.warn('[ac-tools] Network error fetching config:', error);
    return null;
  }
}
