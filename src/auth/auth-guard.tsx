import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

import { isCognitoConfigured } from './cognito';

type Props = {
  children: React.ReactNode;
};

export function AuthGuard({ children }: Props) {
  const auth = useAuth();
  const activeNavigator = auth?.activeNavigator;
  const error = auth?.error;
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const isLoading = auth?.isLoading ?? false;
  const signinRedirect = auth?.signinRedirect;

  useEffect(() => {
    if (!isCognitoConfigured()) {
      return;
    }

    if (!isAuthenticated && !isLoading && !activeNavigator && !error && signinRedirect) {
      void signinRedirect();
    }
  }, [activeNavigator, error, isAuthenticated, isLoading, signinRedirect]);

  if (!isCognitoConfigured()) {
    return <>{children}</>;
  }

  if (isLoading || activeNavigator) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !isAuthenticated) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return <>{children}</>;
}
