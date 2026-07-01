import type { GraphQLResponse, StorefrontClientConfig } from './types';
import { createStorefrontError } from './errors';

const DEFAULT_GRAPHQL_PATH = '/api/storefront/graphql';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const createGraphQLClient = (config: StorefrontClientConfig) => {
  const {
    hostname,
    baseUrl = '',
    graphqlPath = DEFAULT_GRAPHQL_PATH,
    headers: customHeaders = {},
    fetchImplementation = globalThis.fetch
  } = config;

  const endpoint = `${baseUrl}${graphqlPath}`;

  const execute = async <T = Record<string, unknown>>(
    query: string,
    variables?: Record<string, unknown>,
    retryCount = 0
  ): Promise<T> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-App-Context': 'client',
      hostname,
      ...customHeaders
    };

    const response = await fetchImplementation(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
      credentials: 'include'
    });

    if (response.status === 429 && retryCount < MAX_RETRIES) {
      const retryAfter = response.headers.get('Retry-After');
      const delayMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : RETRY_DELAY_MS * (retryCount + 1);
      await sleep(delayMs);
      return execute<T>(query, variables, retryCount + 1);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw createStorefrontError(
        `HTTP ${response.status}: ${response.statusText}`,
        { statusCode: response.status, graphqlErrors: parseErrorBody(body) }
      );
    }

    const json = (await response.json()) as GraphQLResponse<T>;

    if (json.errors && json.errors.length > 0) {
      throw createStorefrontError(
        json.errors.map((error) => error.message).join('; '),
        { graphqlErrors: json.errors }
      );
    }

    if (!json.data) {
      throw createStorefrontError('No data returned from the API');
    }

    return json.data;
  };

  return { execute };
};

const parseErrorBody = (body: string): Array<{ message: string; code?: string }> | undefined => {
  try {
    const parsed = JSON.parse(body) as { errors?: Array<{ message: string; code?: string }> };
    return parsed.errors;
  } catch {
    return undefined;
  }
};
