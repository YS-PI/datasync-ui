import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

// ----------------------------------------------------------------------

export function NotFoundView() {
  return (
    <Container
      sx={{
        py: 10,
        flexGrow: 1,
        display: 'flex',
        alignItems: 'center',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <Typography variant="h3" sx={{ mb: 2 }}>
        Sorry, page not found!
      </Typography>

      <Typography sx={{ color: 'text.secondary', maxWidth: 480, textAlign: 'center' }}>
        Sorry, we couldn’t find the page you’re looking for. Perhaps you’ve mistyped the URL? Be
        sure to check your spelling.
      </Typography>

      <Box
        component="img"
        src="/assets/illustrations/illustration-404.svg"
        sx={{
          width: 320,
          height: 'auto',
          my: { xs: 5, sm: 10 },
        }}
      />

      <Button component={RouterLink} href="/" size="large" variant="contained" color="inherit">
        Go to home
      </Button>
    </Container>
  );
}
