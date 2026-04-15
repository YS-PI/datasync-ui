import type { AuthProviderProps } from 'react-oidc-context';

const authEnabled = import.meta.env.VITE_AUTH_ENABLED === 'true';

const region = import.meta.env.VITE_COGNITO_REGION ?? '';
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID ?? '';
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID ?? '';
const domain = (import.meta.env.VITE_COGNITO_DOMAIN ?? '').replace(/\/+$/, '');

const authority = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

const redirectSignIn =
  import.meta.env.VITE_COGNITO_REDIRECT_SIGN_IN ?? `${window.location.origin}/auth/callback`;

const redirectSignOut =
  import.meta.env.VITE_COGNITO_REDIRECT_SIGN_OUT ?? `${window.location.origin}/`;

const scope = import.meta.env.VITE_COGNITO_SCOPES ?? 'openid profile email';

const configured = authEnabled && Boolean(region && userPoolId && clientId && domain);
const hostedUiConfigured = Boolean(clientId && domain && redirectSignIn);

export function isCognitoConfigured() {
  return configured;
}

export function getCognitoHostedLogoutUrl(postLogoutRedirectUri = redirectSignOut) {
  if (!clientId || !domain || !postLogoutRedirectUri) {
    return '';
  }

  const logoutUri = encodeURIComponent(postLogoutRedirectUri);

  return `${domain}/logout?client_id=${clientId}&logout_uri=${logoutUri}`;
}

export function getCognitoHostedLoginUrl() {
  if (!hostedUiConfigured) {
    return '';
  }

  const redirectUri = encodeURIComponent(redirectSignIn);
  const encodedScope = encodeURIComponent(scope);

  return `${domain}/login?client_id=${clientId}&response_type=code&scope=${encodedScope}&redirect_uri=${redirectUri}`;
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
