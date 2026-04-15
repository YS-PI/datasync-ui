import type { IconButtonProps } from '@mui/material/IconButton';

import { useAuth } from 'react-oidc-context';
import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Popover from '@mui/material/Popover';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { useRouter } from 'src/routes/hooks';

import { _myAccount } from 'src/_mock';
import { isCognitoConfigured, getCognitoHostedLogoutUrl } from 'src/auth';

// ----------------------------------------------------------------------

export type AccountPopoverProps = IconButtonProps & {
  data?: {
    label: string;
    href: string;
    icon?: React.ReactNode;
    info?: React.ReactNode;
  }[];
};

export function AccountPopover({ sx, ...other }: AccountPopoverProps) {
  const router = useRouter();
  const auth = useAuth();
  const isAuthEnabled = isCognitoConfigured();

  const [openPopover, setOpenPopover] = useState<HTMLButtonElement | null>(null);

  const handleOpenPopover = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setOpenPopover(event.currentTarget);
  }, []);

  const handleClosePopover = useCallback(() => {
    setOpenPopover(null);
  }, []);

  const clearBrowserSession = useCallback(() => {
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
    } catch {
      // Ignore storage errors.
    }
  }, []);

  const handleLogout = useCallback(async () => {
    handleClosePopover();

    clearBrowserSession();

    const hostedLogoutUrl = getCognitoHostedLogoutUrl();

    if (isAuthEnabled && hostedLogoutUrl) {
      window.location.href = hostedLogoutUrl;

      return;
    }

    router.replace('/');
  }, [clearBrowserSession, handleClosePopover, isAuthEnabled, router]);

  const authDisplayName =
    auth?.user?.profile?.['cognito:username']?.toString() ||
    auth?.user?.profile?.name?.toString() ||
    auth?.user?.profile?.preferred_username?.toString() ||
    '';

  const authDisplayEmail = auth?.user?.profile?.email?.toString() || '';

  const displayName =
    (isAuthEnabled ? authDisplayName : '') || _myAccount?.displayName || 'Jaydon Frankie';

  const displayEmail =
    (isAuthEnabled ? authDisplayEmail : '') || _myAccount?.email || 'demo@minimals.cc';

  return (
    <>
      <IconButton
        onClick={handleOpenPopover}
        sx={{
          p: '2px',
          width: 40,
          height: 40,
          background: (theme) =>
            `conic-gradient(${theme.vars.palette.primary.light}, ${theme.vars.palette.warning.light}, ${theme.vars.palette.primary.light})`,
          ...sx,
        }}
        {...other}
      >
        <Avatar src={_myAccount.photoURL} alt={_myAccount.displayName} sx={{ width: 1, height: 1 }}>
          {_myAccount.displayName.charAt(0).toUpperCase()}
        </Avatar>
      </IconButton>

      <Popover
        open={!!openPopover}
        anchorEl={openPopover}
        onClose={handleClosePopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: { width: 200 },
          },
        }}
      >
        <Box sx={{ p: 2, pb: 1.5 }}>
          <Typography variant="subtitle2" noWrap>
            {displayName}
          </Typography>

          <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
            {displayEmail}
          </Typography>
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Box sx={{ p: 1 }}>
          <Button fullWidth color="error" size="medium" variant="text" onClick={handleLogout}>
            Logout
          </Button>
        </Box>
      </Popover>
    </>
  );
}
