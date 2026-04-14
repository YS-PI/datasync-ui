import { useState, useEffect } from 'react';
import { useAuth } from 'react-oidc-context';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useRouter } from 'src/routes/hooks';

import { isCognitoConfigured } from 'src/auth';

// ----------------------------------------------------------------------

export function SignInView() {
  const router = useRouter();
  const auth = useAuth();
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const isLoading = auth?.isLoading ?? false;
  const errorMessage = auth?.error?.message;
  const signinRedirect = auth?.signinRedirect;
  const [username, setUsername] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

  return (
    <>
      <Box
        sx={{
          gap: 1.5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mb: 4,
        }}
      >
        <Typography variant="h5">Sign in</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
          Inicia sesion con Cognito para acceder al dashboard de DataSync.
        </Typography>
      </Box>

      {!isCognitoConfigured() && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Cognito no esta configurado. Define `VITE_COGNITO_REGION`, `VITE_COGNITO_USER_POOL_ID`,
          `VITE_COGNITO_CLIENT_ID` y `VITE_COGNITO_DOMAIN` en tu `.env`.
        </Alert>
      )}

      {!!errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      <TextField
        fullWidth
        label="Usuario"
        placeholder="Ingresa tu usuario"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        sx={{ mb: 2 }}
      />

      <Button
        fullWidth
        size="large"
        color="inherit"
        variant="contained"
        disabled={!isCognitoConfigured() || isLoading || !signinRedirect}
        onClick={() =>
          void signinRedirect?.({
            extraQueryParams: username.trim() ? { login_hint: username.trim() } : undefined,
          })
        }
      >
        {isLoading ? 'Redirigiendo...' : 'Ingresar con usuario'}
      </Button>

      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 2 }}>
        Usa tu nombre de usuario de Cognito (no correo).
      </Typography>

      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
        Problemas al ingresar?
        <Link href="#" sx={{ ml: 0.5 }}>
          Contacta al administrador.
        </Link>
      </Typography>
    </>
  );
}
