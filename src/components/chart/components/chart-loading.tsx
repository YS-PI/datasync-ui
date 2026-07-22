import type { BoxProps } from '@mui/material/Box';

import { varAlpha, mergeClasses } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';

import { chartClasses } from '../classes';

import type { ChartProps } from '../types';

// ----------------------------------------------------------------------

export type ChartLoadingProps = BoxProps & Pick<ChartProps, 'type'>;

export function ChartLoading({ sx, className, type, ...other }: ChartLoadingProps) {
  const circularTypes: ChartProps['type'][] = ['donut', 'radialBar', 'pie', 'polarArea'];
  const isCircular = circularTypes.includes(type);

  return (
    <Box
      className={mergeClasses([chartClasses.loading, className])}
      sx={[
        () => ({
          top: 0,
          left: 0,
          width: 1,
          zIndex: 9,
          height: 1,
          p: 'inherit',
          overflow: 'hidden',
          alignItems: 'center',
          position: 'absolute',
          borderRadius: 'inherit',
          justifyContent: 'center',
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      {isCircular ? (
        <Skeleton
          variant="circular"
          sx={{
            width: 1,
            height: 1,
            borderRadius: '50%',
            bgcolor: (theme) => varAlpha(theme.vars.palette.grey['500Channel'], 0.12),
          }}
        />
      ) : (
        <Box
          sx={(theme) => ({
            width: 1,
            height: 1,
            minHeight: 180,
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 'inherit',
            bgcolor: varAlpha(theme.vars.palette.background.neutralChannel, 0.36),
            border: `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.14)}`,
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: 0,
              backgroundImage: `linear-gradient(90deg, transparent, ${varAlpha(
                theme.vars.palette.common.whiteChannel,
                0.06
              )}, transparent)`,
              transform: 'translateX(-100%)',
              animation: 'chart-loading-sheen 1.4s ease-in-out infinite',
            },
            '@keyframes chart-loading-sheen': {
              '100%': { transform: 'translateX(100%)' },
            },
          })}
        >
          {[22, 40, 58, 76].map((top) => (
            <Box
              key={top}
              sx={(theme) => ({
                position: 'absolute',
                top: `${top}%`,
                left: '7%',
                right: '5%',
                borderTop: `1px dashed ${varAlpha(theme.vars.palette.grey['500Channel'], 0.18)}`,
              })}
            />
          ))}

          <Box
            component="svg"
            viewBox="0 0 100 42"
            preserveAspectRatio="none"
            sx={{
              position: 'absolute',
              left: '7%',
              right: '5%',
              bottom: '18%',
              width: '88%',
              height: '52%',
              opacity: 0.78,
            }}
          >
            <Box
              component="polyline"
              points="0,30 16,25 32,31 48,22 64,24 80,12 100,16"
              sx={(theme) => ({
                fill: 'none',
                stroke: varAlpha(theme.vars.palette.primary.mainChannel, 0.9),
                strokeWidth: 1.4,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
              })}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}
