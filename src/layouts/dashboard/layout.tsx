import type { Breakpoint } from '@mui/material/styles';

import { merge } from 'es-toolkit';
import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';

import { NavMobile, NavDesktop } from './nav';
import { dashboardLayoutVars } from './css-vars';
import { _account } from '../nav-config-account';
import { navData } from '../nav-config-dashboard';
import { MainSection } from '../core/main-section';
import { HeaderSection } from '../core/header-section';
import { LayoutSection } from '../core/layout-section';
import { MenuButton } from '../components/menu-button';
import { AccountPopover } from '../components/account-popover';

import type { MainSectionProps } from '../core/main-section';
import type { HeaderSectionProps } from '../core/header-section';
import type { LayoutSectionProps } from '../core/layout-section';

// ----------------------------------------------------------------------

type LayoutBaseProps = Pick<LayoutSectionProps, 'sx' | 'children' | 'cssVars'>;

export type DashboardLayoutProps = LayoutBaseProps & {
  layoutQuery?: Breakpoint;
  slotProps?: {
    header?: HeaderSectionProps;
    main?: MainSectionProps;
  };
};

export function DashboardLayout({
  sx,
  cssVars,
  children,
  slotProps,
  layoutQuery = 'lg',
}: DashboardLayoutProps) {
  const theme = useTheme();
  const [openNav, setOpenNav] = useState(false);

  const handleOpenNav = useCallback(() => {
    setOpenNav(true);
  }, []);

  const handleCloseNav = useCallback(() => {
    setOpenNav(false);
  }, []);

  const renderHeader = () => {
    const headerSx = Array.isArray(slotProps?.header?.sx)
      ? slotProps.header.sx
      : slotProps?.header?.sx
        ? [slotProps.header.sx]
        : [];

    const headerSlotProps: HeaderSectionProps['slotProps'] = {
      container: {
        maxWidth: false,
      },
    };

    const headerSlots: HeaderSectionProps['slots'] = {
      topArea: (
        <Alert severity="info" sx={{ display: 'none', borderRadius: 0 }}>
          This is an info Alert.
        </Alert>
      ),
      leftArea: (
        <MenuButton
          onClick={handleOpenNav}
          sx={{
            mr: 1,
            display: { [layoutQuery]: 'none' },
          }}
        />
      ),
      rightArea: (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0, sm: 0.75 } }}>
          {/** @slot Account drawer */}
          <AccountPopover data={_account} />
        </Box>
      ),
    };

    return (
      <HeaderSection
        disableElevation
        layoutQuery={layoutQuery}
        {...slotProps?.header}
        slots={{ ...headerSlots, ...slotProps?.header?.slots }}
        slotProps={merge(headerSlotProps, slotProps?.header?.slotProps ?? {})}
        sx={[
          (themeValue) => ({
            [themeValue.breakpoints.up(layoutQuery)]: {
              width: 'calc(100% - var(--layout-nav-vertical-width))',
              ml: 'var(--layout-nav-vertical-width)',
            },
          }),
          ...headerSx,
        ]}
      />
    );
  };

  const renderFooter = () => null;

  const renderMain = () => (
    <MainSection
      {...slotProps?.main}
      sx={[
        (themeValue) => ({
          [themeValue.breakpoints.up(layoutQuery)]: {
            pl: 'var(--layout-nav-vertical-width)',
          },
        }),
        ...(Array.isArray(slotProps?.main?.sx)
          ? slotProps.main.sx
          : slotProps?.main?.sx
            ? [slotProps.main.sx]
            : []),
      ]}
    >
      {children}
    </MainSection>
  );

  return (
    <LayoutSection
      /** **************************************
       * @Header
       *************************************** */
      headerSection={renderHeader()}
      /** **************************************
       * @Footer
       *************************************** */
      footerSection={renderFooter()}
      sidebarSection={
        <>
          <NavDesktop data={navData} layoutQuery={layoutQuery} />
          <NavMobile data={navData} open={openNav} onClose={handleCloseNav} />
        </>
      }
      /** **************************************
       * @Styles
       *************************************** */
      cssVars={{ ...dashboardLayoutVars(theme), ...cssVars }}
      sx={sx}
    >
      {renderMain()}
    </LayoutSection>
  );
}
