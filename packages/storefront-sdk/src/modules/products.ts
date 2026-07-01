import type { PaginationArgs, Connection, Product } from '../types';
import type { createGraphQLClient } from '../graphqlClient';

type GraphQLClient = ReturnType<typeof createGraphQLClient>;

export const createProductsModule = (client: GraphQLClient, hostname: string) => {
  const list = async (pagination: PaginationArgs = { first: 20 }): Promise<Connection<Product>> => {
    const { first, after } = pagination;

    const data = await client.execute<{
      client: { products: Connection<Product> };
    }>(
      `query ListProducts($hostname: String!, $count: Int, $after: String) {
        client(hostname: $hostname) {
          products(count: $count, after: $after) {
            edges {
              node {
                id
                title
                slug
                price
                priceFrom
                description
                images { url }
                available
                quantity
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
      { hostname, count: first, after }
    );

    return data.client.products;
  };

  const getById = async (productId: string): Promise<Product | null> => {
    const data = await client.execute<{
      product: Product | null;
    }>(
      `query GetProduct($id: ID!) {
        product(id: $id) {
          id
          title
          slug
          price
          priceFrom
          description
          images { url }
          available
          quantity
        }
      }`,
      { id: productId }
    );

    return data.product;
  };

  const getBySlug = async (slug: string): Promise<Product | null> => {
    const data = await client.execute<{
      productBySlug: Product | null;
    }>(
      `query GetProductBySlug($slug: String!, $hostname: String!) {
        productBySlug(slug: $slug, hostname: $hostname) {
          id
          title
          slug
          price
          priceFrom
          description
          images { url }
          available
          quantity
        }
      }`,
      { slug, hostname }
    );

    return data.productBySlug;
  };

  return { list, getById, getBySlug };
};
