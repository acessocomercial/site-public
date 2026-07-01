import type { Order, Connection, PaginationArgs, CheckoutInput } from '../types';
import type { createGraphQLClient } from '../graphqlClient';

type GraphQLClient = ReturnType<typeof createGraphQLClient>;

export const createOrdersModule = (client: GraphQLClient, hostname: string) => {
  const list = async (pagination: PaginationArgs = { first: 20 }): Promise<Connection<Order>> => {
    const { first, after } = pagination;

    const data = await client.execute<{
      client: { orders: Connection<Order> };
    }>(
      `query ListOrders($hostname: String!, $first: Int, $after: String) {
        client(hostname: $hostname) {
          orders(first: $first, after: $after) {
            edges {
              node {
                id
                status
                total
                createdAt
              }
              cursor
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
          }
        }
      }`,
      { hostname, first, after }
    );

    return data.client.orders;
  };

  const checkout = async (input: CheckoutInput): Promise<{ clientMutationId: string | null }> => {
    const data = await client.execute<{
      addNewCheckoutOrder: { clientMutationId: string | null };
    }>(
      `mutation Checkout($input: AddNewCheckoutOrderMutationInput!) {
        addNewCheckoutOrder(input: $input) {
          clientMutationId
        }
      }`,
      { input: { hostname, ...input } }
    );

    return data.addNewCheckoutOrder;
  };

  return { list, checkout };
};
