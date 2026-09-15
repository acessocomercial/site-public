import type { Store } from '../types';
import type { createGraphQLClient } from '../graphqlClient';

type GraphQLClient = ReturnType<typeof createGraphQLClient>;

export const createStoreModule = (client: GraphQLClient, hostname: string) => {
  const get = async (): Promise<Store | null> => {
    const data = await client.execute<{
      client: { store: Store | null };
    }>(
      `query GetStore($hostname: String!) {
        client(hostname: $hostname) {
          store {
            id
            name
            image { url }
            about
            onlyExternalPayment
            isPasswordProtected
            contact {
              whatsapp
            }
          }
        }
      }`,
      { hostname }
    );

    return data.client.store;
  };

  const getCollections = async (): Promise<Array<{ id: string; name: string; show: boolean }>> => {
    const data = await client.execute<{
      client: { collections: Array<{ id: string; name: string; show: boolean }> };
    }>(
      `query GetCollections($hostname: String!) {
        client(hostname: $hostname) {
          collections {
            id
            name
            show
          }
        }
      }`,
      { hostname }
    );

    return data.client.collections;
  };

  const getMenus = async (): Promise<Array<{ id: string; title: string }>> => {
    const data = await client.execute<{
      client: { menus: Array<{ id: string; title: string }> };
    }>(
      `query GetMenus($hostname: String!) {
        client(hostname: $hostname) {
          menus {
            id
            title
          }
        }
      }`,
      { hostname }
    );

    return data.client.menus;
  };

  return { get, getCollections, getMenus };
};
