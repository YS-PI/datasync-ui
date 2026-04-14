import type { AuthProviderProps } from 'react-oidc-context';

const defaultRegion = 'us-east-1';
const defaultUserPoolId = 'us-east-1_McPqB8meW';
const defaultClientId = '50u4su97uuq2jjgd7vk3tgh7kl';
const defaultDomain = 'https://us-east-1mcpqb8mew.auth.us-east-1.amazoncognito.com';

const region = import.meta.env.VITE_COGNITO_REGION ?? defaultRegion;
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID ?? defaultUserPoolId;
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID ?? defaultClientId;
const domain = (import.meta.env.VITE_COGNITO_DOMAIN ?? defaultDomain).replace(/\/+$/, '');

const authority = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

const redirectSignIn =
  import.meta.env.VITE_COGNITO_REDIRECT_SIGN_IN ?? `${window.location.origin}/auth/callback`;

const redirectSignOut =
  import.meta.env.VITE_COGNITO_REDIRECT_SIGN_OUT ?? `${window.location.origin}/sign-in`;

const scope = import.meta.env.VITE_COGNITO_SCOPES ?? 'openid profile email';

const configured = Boolean(region && userPoolId && clientId && domain);

export function isCognitoConfigured() {
  return configured;
}

export function getCognitoHostedLogoutUrl() {
  const logoutUri = encodeURIComponent(redirectSignOut);

  return `${domain}/logout?client_id=${clientId}&logout_uri=${logoutUri}`;
}

export function getCognitoPostLogoutRedirectUri() {
  return redirectSignOut;
}

export const cognitoOidcConfig: AuthProviderProps = {
  authority,
  client_id: clientId,
  redirect_uri: redirectSignIn,
  post_logout_redirect_uri: redirectSignOut,
  response_type: 'code',
  scope,
  automaticSilentRenew: false,
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};
