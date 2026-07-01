export interface StorefrontClientConfig {
  hostname: string;
  baseUrl?: string;
  graphqlPath?: string;
  headers?: Record<string, string>;
  fetchImplementation?: typeof fetch;
}

export interface GraphQLResponse<T = Record<string, unknown>> {
  data?: T;
  errors?: GraphQLError[];
}

export interface GraphQLError {
  message: string;
  code?: string;
  extensions?: Record<string, unknown>;
  locations?: Array<{ line: number; column: number }>;
  path?: Array<string | number>;
}

export interface StorefrontError extends Error {
  graphqlErrors?: GraphQLError[];
  statusCode?: number;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

export interface Connection<T> {
  edges: Array<{ node: T; cursor: string }>;
  pageInfo: PageInfo;
}

export interface PaginationArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

export interface Image {
  url: string;
}

export interface Product {
  id: string;
  title: string;
  slug?: string;
  price: number;
  priceFrom?: number;
  description?: string;
  images?: Image[];
  available?: boolean;
  quantity?: number;
}

export interface ShoppingCart {
  id: string;
  products?: ShoppingCartProduct[];
  totalPrice?: number;
  originalTotalPrice?: number;
  isShippingCalculated?: boolean;
  coupon?: ShoppingCartCoupon;
}

export interface ShoppingCartProduct {
  title: string;
  price: number;
  quantity: number;
  image?: Image;
}

export interface ShoppingCartCoupon {
  code?: string;
  discount?: number;
}

export interface Order {
  id: string;
  status?: string;
  total?: number;
  createdAt?: string;
}

export interface AuthResult {
  clientMutationId?: string;
}

export interface Store {
  id: string;
  name?: string;
  image?: Image;
  about?: string;
}

export interface AddToCartInput {
  productId: string;
  quantity: number;
  skuId?: string;
  variationId?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface CheckoutInput {
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
  paymentMethod: string;
  shippingType?: string;
  address?: {
    street: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state: string;
    cep: string;
  };
}

export interface ShippingCalculationResult {
  options?: Array<{
    id: string;
    name: string;
    price: number;
    deliveryDays: number;
  }>;
}
