import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { CONFIG } from 'src/config-global';
import { isCognitoConfigured } from 'src/auth';

// ----------------------------------------------------------------------

export default function Page() {
  const router = useRouter();
  const auth = useAuth();
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const isLoading = auth?.isLoading ?? false;
  const activeNavigator = auth?.activeNavigator;
  const signinRedirect = auth?.signinRedirect;

  useEffect(() => {
    if (!isCognitoConfigured()) {
      router.replace('/');
      return;
    }

    if (isAuthenticated) {
      router.replace('/');
      return;
    }

    if (!isLoading && !activeNavigator && signinRedirect) {
      void signinRedirect();
    }
  }, [activeNavigator, isAuthenticated, isLoading, router, signinRedirect]);

  return (
    <>
      <title>{`Sign in - ${CONFIG.appName}`}</title>

      <Box sx={{ minHeight: '50vh', display: 'grid', placeItems: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    </>
  );
}
