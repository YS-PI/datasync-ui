import type { CardProps } from '@mui/material/Card';
import type { PaletteColorKey } from 'src/theme/core';
import type { ChartOptions } from 'src/components/chart';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';

import { fNumber, fPercent, fShortenNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { SvgColor } from 'src/components/svg-color';
import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title: string;
  total: number;
  value?: string;
  percent?: number;
  color?: PaletteColorKey;
  icon?: React.ReactNode;
  showTrending?: boolean;
  showChart?: boolean;
  chart: {
    series: number[];
    categories: string[];
    options?: ChartOptions;
  };
};

export function AnalyticsWidgetSummary({
  sx,
  icon,
  title,
  total,
  value,
  chart,
  percent = 0,
  showTrending = true,
  showChart = true,
  color = 'primary',
  ...other
}: Props) {
  const theme = useTheme();

  const chartColors = [theme.palette[color].dark];

  const chartOptions = useChart({
    chart: { sparkline: { enabled: true } },
    colors: chartColors,
    xaxis: { categories: chart.categories },
    grid: {
      padding: {
        top: 6,
        left: 6,
        right: 6,
        bottom: 6,
      },
    },
    tooltip: {
      y: { formatter: (num: number) => fNumber(num), title: { formatter: () => '' } },
    },
    markers: {
      strokeWidth: 0,
    },
    ...chart.options,
  });

  const renderTrending = () => (
    <Box
      sx={{
        top: 16,
        gap: 0.5,
        right: 16,
        display: 'flex',
        position: 'absolute',
        alignItems: 'center',
      }}
    >
      <Iconify width={20} icon={percent < 0 ? 'eva:trending-down-fill' : 'eva:trending-up-fill'} />
      <Box component="span" sx={{ typography: 'subtitle2' }}>
        {percent > 0 && '+'}
        {fPercent(percent)}
      </Box>
    </Box>
  );

  return (
    <Card
      sx={[
        () => ({
          p: 3,
          boxShadow: 'none',
          position: 'relative',
          color: `${color}.darker`,
          backgroundColor: 'common.white',
          backgroundImage: `linear-gradient(135deg, ${varAlpha(theme.vars.palette[color].lighterChannel, 0.48)}, ${varAlpha(theme.vars.palette[color].lightChannel, 0.48)})`,
          ...theme.applyStyles('dark', {
            color: theme.vars.palette[color].lighter,
            backgroundColor: varAlpha(theme.vars.palette.grey['900Channel'], 0.8),
            backgroundImage: `linear-gradient(135deg, ${varAlpha(theme.vars.palette[color].mainChannel, 0.22)}, ${varAlpha(theme.vars.palette.grey['800Channel'], 0.64)})`,
          }),
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      {icon && <Box sx={{ width: 48, height: 48, mb: 3 }}>{icon}</Box>}

      {showTrending && renderTrending()}

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
        }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 112 }}>
          <Box sx={{ mb: 1, typography: 'subtitle2' }}>{title}</Box>

          <Box sx={{ typography: 'h4' }}>{value ?? fShortenNumber(total)}</Box>
        </Box>

        {showChart && (
          <Chart
            type="line"
            series={[{ data: chart.series }]}
            options={chartOptions}
            sx={{ width: 84, height: 56 }}
          />
        )}
      </Box>

      <SvgColor
        src="/assets/background/shape-square.svg"
        sx={{
          top: 0,
          left: -20,
          width: 240,
          zIndex: -1,
          height: 240,
          opacity: 0.24,
          position: 'absolute',
          color: `${color}.main`,
          ...theme.applyStyles('dark', {
            opacity: 0.18,
            color: theme.vars.palette[color].light,
          }),
        }}
      />
    </Card>
  );
}
