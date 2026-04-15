import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

import { isCognitoConfigured, getCognitoHostedLoginUrl } from './cognito';

type Props = {
  children: React.ReactNode;
};

export function AuthGuard({ children }: Props) {
  const auth = useAuth();
  const hostedLoginUrl = getCognitoHostedLoginUrl(true);

  useEffect(() => {
    if (!isCognitoConfigured()) {
      return;
    }

    if (!auth.isLoading && !auth.activeNavigator && !auth.isAuthenticated && hostedLoginUrl) {
      window.location.replace(hostedLoginUrl);
    }
  }, [auth.activeNavigator, auth.isAuthenticated, auth.isLoading, hostedLoginUrl]);

  if (!isCognitoConfigured()) {
    return <>{children}</>;
  }

  if (auth.isLoading || auth.activeNavigator) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (auth.error) {
    if (hostedLoginUrl) {
      return (
        <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
          <CircularProgress />
        </Box>
      );
    }

    return <Navigate to="/sign-in" replace />;
  }

  if (!auth.isAuthenticated) {
    if (hostedLoginUrl) {
      return (
        <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
          <CircularProgress />
        </Box>
      );
    }

    return <Navigate to="/sign-in" replace />;
  }

  return <>{children}</>;
}
