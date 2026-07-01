import type { ShoppingCart, AddToCartInput } from '../types';
import type { createGraphQLClient } from '../graphqlClient';

type GraphQLClient = ReturnType<typeof createGraphQLClient>;

const CART_FRAGMENT = `
  id
  products {
    title
    price
    quantity
    image { url }
  }
  coupon {
    code
    discount
  }
  totalPrice
  originalTotalPrice
  isShippingCalculated
`;

export const createCartModule = (client: GraphQLClient, hostname: string) => {
  const get = async (): Promise<ShoppingCart | null> => {
    const data = await client.execute<{
      shoppingCart: ShoppingCart | null;
    }>(
      `query GetCart($hostname: String!) {
        shoppingCart(hostname: $hostname) {
          ${CART_FRAGMENT}
        }
      }`,
      { hostname }
    );

    return data.shoppingCart;
  };

  const addItem = async (input: AddToCartInput): Promise<{ clientMutationId: string | null }> => {
    const data = await client.execute<{
      addShoppingCartItem: { clientMutationId: string | null };
    }>(
      `mutation AddToCart($input: AddShoppingCartItemMutationInput!) {
        addShoppingCartItem(input: $input) {
          clientMutationId
        }
      }`,
      {
        input: {
          hostname,
          productId: input.productId,
          quantity: input.quantity,
          ...(input.skuId && { skuId: input.skuId }),
          ...(input.variationId && { variationId: input.variationId })
        }
      }
    );

    return data.addShoppingCartItem;
  };

  const removeItem = async (itemId: string): Promise<{ clientMutationId: string | null }> => {
    const data = await client.execute<{
      removeShoppingCartItem: { clientMutationId: string | null };
    }>(
      `mutation RemoveFromCart($input: RemoveShoppingCartItemMutationInput!) {
        removeShoppingCartItem(input: $input) {
          clientMutationId
        }
      }`,
      { input: { hostname, itemId } }
    );

    return data.removeShoppingCartItem;
  };

  const applyCoupon = async (couponCode: string): Promise<{ clientMutationId: string | null }> => {
    const data = await client.execute<{
      checkCouponOnShoppingCart: { clientMutationId: string | null };
    }>(
      `mutation ApplyCoupon($input: CheckCouponOnShoppingCartMutationInput!) {
        checkCouponOnShoppingCart(input: $input) {
          clientMutationId
        }
      }`,
      { input: { hostname, coupon: couponCode } }
    );

    return data.checkCouponOnShoppingCart;
  };

  const calculateShipping = async (zipCode: string): Promise<{ clientMutationId: string | null }> => {
    const data = await client.execute<{
      calculateShoppingCartTotalShipping: { clientMutationId: string | null };
    }>(
      `mutation CalculateShipping($input: CalculateShoppingCartTotalShippingMutationInput!) {
        calculateShoppingCartTotalShipping(input: $input) {
          clientMutationId
        }
      }`,
      { input: { hostname, zipCode } }
    );

    return data.calculateShoppingCartTotalShipping;
  };

  const updateShippingType = async (shippingType: string): Promise<{ clientMutationId: string | null }> => {
    const data = await client.execute<{
      updateShoppingCartTotalShippingType: { clientMutationId: string | null };
    }>(
      `mutation UpdateShippingType($input: UpdateShoppingCartTotalShippingTypeMutationInput!) {
        updateShoppingCartTotalShippingType(input: $input) {
          clientMutationId
        }
      }`,
      { input: { hostname, shippingType } }
    );

    return data.updateShoppingCartTotalShippingType;
  };

  return {
    get,
    addItem,
    removeItem,
    applyCoupon,
    calculateShipping,
    updateShippingType
  };
};
