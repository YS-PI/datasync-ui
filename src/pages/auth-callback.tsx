import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

export default function AuthCallbackPage() {
  const router = useRouter();
  const auth = useAuth();
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const errorMessage = auth?.error?.message;

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

  if (errorMessage) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{errorMessage}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '50vh', display: 'grid', placeItems: 'center' }}>
      <CircularProgress />
    </Box>
  );
}
