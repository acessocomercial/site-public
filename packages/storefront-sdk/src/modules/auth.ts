import type { AuthResult, LoginInput, SignupInput } from '../types';
import type { createGraphQLClient } from '../graphqlClient';

type GraphQLClient = ReturnType<typeof createGraphQLClient>;

export const createAuthModule = (client: GraphQLClient, hostname: string) => {
  const login = async (input: LoginInput): Promise<AuthResult> => {
    const data = await client.execute<{
      clientLogin: AuthResult;
    }>(
      `mutation ClientLogin($input: ClientLoginMutationInput!) {
        clientLogin(input: $input) {
          clientMutationId
        }
      }`,
      { input: { hostname, email: input.email, password: input.password } }
    );

    return data.clientLogin;
  };

  const signup = async (input: SignupInput): Promise<AuthResult> => {
    const data = await client.execute<{
      clientSignup: AuthResult;
    }>(
      `mutation ClientSignup($input: ClientSignupMutationInput!) {
        clientSignup(input: $input) {
          clientMutationId
        }
      }`,
      {
        input: {
          hostname,
          name: input.name,
          email: input.email,
          password: input.password,
          ...(input.phone && { phone: input.phone })
        }
      }
    );

    return data.clientSignup;
  };

  const googleLogin = async (token: string): Promise<AuthResult> => {
    const data = await client.execute<{
      clientGoogleLogin: AuthResult;
    }>(
      `mutation ClientGoogleLogin($input: ClientGoogleLoginMutationInput!) {
        clientGoogleLogin(input: $input) {
          clientMutationId
        }
      }`,
      { input: { hostname, token } }
    );

    return data.clientGoogleLogin;
  };

  const googleSignup = async (token: string): Promise<AuthResult> => {
    const data = await client.execute<{
      clientGoogleSignup: AuthResult;
    }>(
      `mutation ClientGoogleSignup($input: ClientGoogleSignupMutationInput!) {
        clientGoogleSignup(input: $input) {
          clientMutationId
        }
      }`,
      { input: { hostname, token } }
    );

    return data.clientGoogleSignup;
  };

  const logout = async (): Promise<AuthResult> => {
    const data = await client.execute<{
      logout: AuthResult;
    }>(
      `mutation Logout($input: LogoutMutationInput!) {
        logout(input: $input) {
          clientMutationId
        }
      }`,
      { input: { role: 'client' } }
    );

    return data.logout;
  };

  const requestResetPassword = async (email: string): Promise<AuthResult> => {
    const data = await client.execute<{
      requestResetPassword: AuthResult;
    }>(
      `mutation RequestResetPassword($input: RequestResetPasswordMutationInput!) {
        requestResetPassword(input: $input) {
          clientMutationId
        }
      }`,
      { input: { hostname, email } }
    );

    return data.requestResetPassword;
  };

  const resetPassword = async (token: string, newPassword: string): Promise<AuthResult> => {
    const data = await client.execute<{
      resetPassword: AuthResult;
    }>(
      `mutation ResetPassword($input: ResetPasswordMutationInput!) {
        resetPassword(input: $input) {
          clientMutationId
        }
      }`,
      { input: { hostname, token, password: newPassword } }
    );

    return data.resetPassword;
  };

  return {
    login,
    signup,
    googleLogin,
    googleSignup,
    logout,
    requestResetPassword,
    resetPassword
  };
};
