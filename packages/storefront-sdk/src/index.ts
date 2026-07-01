import type { StorefrontClientConfig } from './types';
import { createGraphQLClient } from './graphqlClient';
import { createProductsModule } from './modules/products';
import { createCartModule } from './modules/cart';
import { createAuthModule } from './modules/auth';
import { createOrdersModule } from './modules/orders';
import { createStoreModule } from './modules/store';

export const createStorefrontClient = (config: StorefrontClientConfig) => {
  const { hostname } = config;

  if (!hostname) {
    throw new Error('hostname is required to create a StorefrontClient');
  }

  const graphqlClient = createGraphQLClient(config);

  return {
    products: createProductsModule(graphqlClient, hostname),
    cart: createCartModule(graphqlClient, hostname),
    auth: createAuthModule(graphqlClient, hostname),
    orders: createOrdersModule(graphqlClient, hostname),
    store: createStoreModule(graphqlClient, hostname),
    graphql: graphqlClient.execute
  };
};

export type StorefrontClient = ReturnType<typeof createStorefrontClient>;

export type {
  StorefrontClientConfig,
  GraphQLResponse,
  GraphQLError,
  StorefrontError,
  PageInfo,
  Connection,
  PaginationArgs,
  Image,
  Product,
  ShoppingCart,
  ShoppingCartProduct,
  ShoppingCartCoupon,
  Order,
  AuthResult,
  Store,
  AddToCartInput,
  CheckoutInput,
  LoginInput,
  SignupInput,
  ShippingCalculationResult
} from './types';

export {
  createStorefrontError,
  isRateLimitError,
  isAuthenticationError,
  isOperationNotAllowedError
} from './errors';
