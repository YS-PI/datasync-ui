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
  const { isAuthenticated, isLoading, activeNavigator, signinRedirect } = auth;

  useEffect(() => {
    if (!isCognitoConfigured()) {
      return;
    }

    if (isAuthenticated) {
      router.replace('/');
      return;
    }

    if (!isLoading && !activeNavigator) {
      void signinRedirect();
    }
  }, [activeNavigator, isAuthenticated, isLoading, router, signinRedirect]);

  return (
    <>
      <title>{`Sign in - ${CONFIG.appName}`}</title>

      <Box sx={{ minHeight: '50vh', display: 'grid', placeItems: 'center', p: 3 }}>
        {!isCognitoConfigured() ? (
          <Alert severity="warning" sx={{ maxWidth: 560 }}>
            Cognito no esta configurado. Define `VITE_COGNITO_REGION`, `VITE_COGNITO_USER_POOL_ID`,
            `VITE_COGNITO_CLIENT_ID` y `VITE_COGNITO_DOMAIN` en tu `.env`.
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
