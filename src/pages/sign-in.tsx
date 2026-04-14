import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
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
  const forceLogin = new URLSearchParams(window.location.search).get('force_login') === '1';

  useEffect(() => {
    if (!isCognitoConfigured()) {
      router.replace('/');
      return;
    }

    if (!isLoading && !activeNavigator && signinRedirect && forceLogin) {
      void signinRedirect({ extraQueryParams: { prompt: 'login' } });
      return;
    }

    if (isAuthenticated) {
      router.replace('/');
      return;
    }

    if (!isLoading && !activeNavigator && signinRedirect) {
      void signinRedirect();
    }
  }, [activeNavigator, forceLogin, isAuthenticated, isLoading, router, signinRedirect]);

  return (
    <>
      <title>{`Sign in - ${CONFIG.appName}`}</title>

      <Box sx={{ minHeight: '50vh', display: 'grid', placeItems: 'center', p: 3 }}>
        {!isCognitoConfigured() ? (
          <Alert severity="warning" sx={{ maxWidth: 560 }}>
            Cognito no esta habilitado o configurado. Revisa `VITE_AUTH_ENABLED` y las variables
            `VITE_COGNITO_*` en tu `.env`.
          </Alert>
        ) : (
          <Box sx={{ display: 'grid', gap: 2, placeItems: 'center' }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Redirigiendo al Hosted UI de AWS...
            </Typography>
          </Box>
        )}
      </Box>
    </>
  );
}
