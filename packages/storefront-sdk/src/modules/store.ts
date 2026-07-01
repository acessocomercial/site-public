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
          }
        }
      }`,
      { hostname }
    );

    return data.client.store;
  };

  const getSections = async (): Promise<Array<{ id: string; title: string }>> => {
    const data = await client.execute<{
      client: { sections: Array<{ id: string; title: string }> };
    }>(
      `query GetSections($hostname: String!) {
        client(hostname: $hostname) {
          sections {
            id
            title
          }
        }
      }`,
      { hostname }
    );

    return data.client.sections;
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

  return { get, getSections, getMenus };
};
