import type { GraphQLError, StorefrontError } from './types';

export const createStorefrontError = (
  message: string,
  options?: { graphqlErrors?: GraphQLError[]; statusCode?: number }
): StorefrontError => {
  const error = new Error(message) as StorefrontError;
  error.name = 'StorefrontError';
  error.graphqlErrors = options?.graphqlErrors;
  error.statusCode = options?.statusCode;
  return error;
};

export const isRateLimitError = (error: StorefrontError): boolean =>
  error.statusCode === 429;

export const isAuthenticationError = (error: StorefrontError): boolean =>
  error.graphqlErrors?.some(
    (graphqlError) => graphqlError.code === 'UNAUTHENTICATED' || graphqlError.code === 'UNAUTHORIZED'
  ) ?? false;

export const isOperationNotAllowedError = (error: StorefrontError): boolean =>
  error.statusCode === 403;
