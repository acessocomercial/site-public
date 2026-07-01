import { createStorefrontClient } from '@acessocomercial/storefront-sdk';

const hostname = import.meta.env.PUBLIC_STORE_HOSTNAME || 'demo';

export const storefront = createStorefrontClient({
  hostname,
  baseUrl: import.meta.env.PUBLIC_API_URL || ''
});
