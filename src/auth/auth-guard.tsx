import { Navigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

import { isCognitoConfigured } from './cognito';

type Props = {
  children: React.ReactNode;
};

export function AuthGuard({ children }: Props) {
  const auth = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const hasOidcCallbackParams =
    searchParams.has('state') && (searchParams.has('code') || searchParams.has('error'));

  if (!isCognitoConfigured()) {
    return <>{children}</>;
  }

  if (auth.isLoading || auth.activeNavigator || hasOidcCallbackParams) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (auth.error) {
    return <Navigate to="/sign-in" replace />;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/sign-in" replace />;
  }

  return <>{children}</>;
}
