import { memo, useMemo, useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ButtonGroup from '@mui/material/ButtonGroup';
import { useTheme, useColorScheme, alpha as hexAlpha } from '@mui/material/styles';

import { Chart, useChart } from 'src/components/chart';

import {
  formatThroughput,
  getStatusChipColor,
  formatStorageFromBytes,
  getExecutionStatusLabelEs,
} from './datasync-format';

import type { DatasyncTask, DatasyncExecution } from './datasync-types';

type DatasyncTaskTrendProps = {
  task: DatasyncTask;
};

type MetricType = 'bytes' | 'speed' | 'files' | 'combined';

function DatasyncTaskTrendComponent({ task }: DatasyncTaskTrendProps) {
  const theme = useTheme();
  const { mode } = useColorScheme();
  const [metric, setMetric] = useState<MetricType>('combined');
  const isDark = mode === 'dark';

  // Preparar historial ordenado cronológicamente (del más antiguo al más reciente)
  const historyData = useMemo(() => {
    const historyList: DatasyncExecution[] =
      task.history && task.history.length > 0 ? [...task.history] : [task.last_exec];

    // reverse for chronological display left -> right
    return historyList.slice().reverse();
  }, [task.history, task.last_exec]);

  // Formatear etiquetas para el eje X (fechas cortas)
  const categories = useMemo(
    () =>
      historyData.map((item) => {
        if (!item.start_time) return 'Sin fecha';
        // Convertir formato de fecha "21/07/2026 22:15" a formato más corto "21/07 22:15"
        const parts = item.start_time.split(' ');
        if (parts.length >= 2) {
          const dateParts = parts[0].split('/');
          if (dateParts.length >= 2) {
            return `${dateParts[0]}/${dateParts[1]} ${parts[1]}`;
          }
        }
        return item.start_time;
      }),
    [historyData]
  );

  // Determinar unidad óptima para bytes (MB o GB)
  const bytesUnit = useMemo(() => {
    const maxBytes = Math.max(...historyData.map((d) => d.bytes_transferred || 0));
    return maxBytes >= 1024 * 1024 * 1024 ? 'GB' : 'MB';
  }, [historyData]);

  // Valores normalizados según la unidad seleccionada
  const bytesSeriesData = useMemo(
    () =>
      historyData.map((item) => {
        const bytes = item.bytes_transferred || 0;
        const divider = bytesUnit === 'GB' ? 1024 * 1024 * 1024 : 1024 * 1024;
        return Number((bytes / divider).toFixed(2));
      }),
    [historyData, bytesUnit]
  );

  const speedSeriesData = useMemo(
    () => historyData.map((item) => Number((item.throughput_mbs || 0).toFixed(2))),
    [historyData]
  );

  const filesSeriesData = useMemo(
    () => historyData.map((item) => item.files_transferred || 0),
    [historyData]
  );

  // Estadísticas rápidas
  const stats = useMemo(() => {
    const totalBytes = historyData.reduce((acc, curr) => acc + (curr.bytes_transferred || 0), 0);
    const avgBytes = totalBytes / (historyData.length || 1);
    const speeds = historyData.map((d) => d.throughput_mbs || 0);
    const maxSpeed = Math.max(...speeds, 0);
    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / (speeds.length || 1);
    const totalFiles = historyData.reduce((acc, curr) => acc + (curr.files_transferred || 0), 0);

    return {
      avgBytesFormatted: formatStorageFromBytes(avgBytes),
      maxSpeedFormatted: formatThroughput(maxSpeed),
      avgSpeedFormatted: formatThroughput(avgSpeed),
      totalFiles: totalFiles.toLocaleString(),
    };
  }, [historyData]);

  // Series dinámicas para ApexCharts
  const series = useMemo(() => {
    if (metric === 'bytes') {
      return [{ name: `Datos Transferidos (${bytesUnit})`, data: bytesSeriesData, type: 'area' }];
    }
    if (metric === 'speed') {
      return [{ name: 'Velocidad (MiB/s)', data: speedSeriesData, type: 'area' }];
    }
    if (metric === 'files') {
      return [{ name: 'Archivos Transferidos', data: filesSeriesData, type: 'bar' }];
    }
    // Combined
    return [
      { name: `Datos (${bytesUnit})`, data: bytesSeriesData, type: 'area' },
      { name: 'Velocidad (MiB/s)', data: speedSeriesData, type: 'line' },
    ];
  }, [metric, bytesSeriesData, speedSeriesData, filesSeriesData, bytesUnit]);

  // Colores por serie
  const chartColors = useMemo(() => {
    if (metric === 'bytes') return [theme.palette.primary.main];
    if (metric === 'speed') return [theme.palette.info.main];
    if (metric === 'files') return [theme.palette.success.main];
    return [theme.palette.primary.main, theme.palette.info.main];
  }, [metric, theme]);

  const chartOptions = useChart({
    chart: {
      dropShadow: isDark
        ? {
            enabled: true,
            top: 8,
            left: 0,
            blur: 14,
            color: chartColors[0],
            opacity: 0.18,
          }
        : { enabled: false },
    },
    colors: chartColors,
    stroke: {
      width: metric === 'combined' ? [2, 3] : 2,
      curve: 'smooth',
    },
    fill: {
      type: metric === 'files' ? 'solid' : ['gradient', 'solid'],
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 95, 100],
      },
    },
    xaxis: {
      categories,
      labels: {
        style: {
          colors: theme.palette.text.secondary,
          fontSize: '12px',
        },
      },
    },
    yaxis:
      metric === 'combined'
        ? [
            {
              title: { text: `Datos (${bytesUnit})`, style: { color: theme.palette.primary.main } },
              labels: {
                formatter: (val: number) => `${val.toFixed(2)} ${bytesUnit}`,
                style: { colors: theme.palette.primary.main },
              },
            },
            {
              opposite: true,
              title: { text: 'Velocidad (MiB/s)', style: { color: theme.palette.info.main } },
              labels: {
                formatter: (val: number) => `${val.toFixed(1)} MiB/s`,
                style: { colors: theme.palette.info.main },
              },
            },
          ]
        : {
            labels: {
              formatter: (val: number) => {
                if (metric === 'bytes') return `${val.toFixed(2)} ${bytesUnit}`;
                if (metric === 'speed') return `${val.toFixed(1)} MiB/s`;
                return val.toLocaleString();
              },
            },
          },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
    },
    tooltip: {
      shared: true,
      intersect: false,
      custom: ({ seriesIndex, dataPointIndex, w }) => {
        const exec = historyData[dataPointIndex];
        if (!exec) return '';

        const statusLabel = getExecutionStatusLabelEs(exec.status);
        const chipColor = getStatusChipColor(exec.status);
        const statusBgColor =
          chipColor === 'success'
            ? theme.palette.success.lighter || '#e8f5e9'
            : chipColor === 'error'
              ? theme.palette.error.lighter || '#ffebee'
              : theme.palette.grey[200];
        const statusTextColor =
          chipColor === 'success'
            ? theme.palette.success.dark
            : chipColor === 'error'
              ? theme.palette.error.dark
              : theme.palette.text.primary;

        return `
          <div style="padding: 12px; font-family: inherit; font-size: 13px; min-width: 200px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid rgba(0,0,0,0.08); padding-bottom: 6px;">
              <strong>📅 ${exec.start_time}</strong>
              <span style="background-color: ${statusBgColor}; color: ${statusTextColor}; padding: 2px 8px; border-radius: 6px; font-weight: 600; font-size: 11px;">
                ${statusLabel}
              </span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <div>📦 <strong>Datos:</strong> ${formatStorageFromBytes(exec.bytes_transferred)}</div>
              <div>⚡ <strong>Velocidad:</strong> ${formatThroughput(exec.throughput_mbs)}</div>
              <div>📁 <strong>Archivos transferidos:</strong> ${(exec.files_transferred || 0).toLocaleString()}</div>
              <div>⏱️ <strong>Duración:</strong> ${exec.duration || 'N/A'}</div>
            </div>
          </div>
        `;
      },
    },
  });

  return (
    <Box sx={{ p: 2.5 }}>
      {/* Header del Panel de Tendencias */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 2.5 }}
      >
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Tendencia de ejecuciones ({historyData.length} históricas)
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Variación de rendimiento y volumen transferido a lo largo del tiempo
          </Typography>
        </Box>

        {/* Controles de Métrica */}
        <ButtonGroup size="small" variant="outlined">
          <Button
            variant={metric === 'combined' ? 'contained' : 'outlined'}
            onClick={() => setMetric('combined')}
          >
            Combinada
          </Button>
          <Button
            variant={metric === 'bytes' ? 'contained' : 'outlined'}
            onClick={() => setMetric('bytes')}
          >
            Datos
          </Button>
          <Button
            variant={metric === 'speed' ? 'contained' : 'outlined'}
            onClick={() => setMetric('speed')}
          >
            Velocidad
          </Button>
          <Button
            variant={metric === 'files' ? 'contained' : 'outlined'}
            onClick={() => setMetric('files')}
          >
            Archivos
          </Button>
        </ButtonGroup>
      </Stack>

      {/* Tarjetas resumen rápido */}
      <Stack direction="row" spacing={2} sx={{ mb: 2.5 }} flexWrap="wrap" useFlexGap>
        <Card
          sx={{
            p: 1.5,
            flex: '1 1 140px',
            bgcolor: (t) => hexAlpha(t.palette.primary.main, 0.06),
            border: (t) => `1px solid ${hexAlpha(t.palette.primary.main, 0.16)}`,
            boxShadow: 'none',
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            Promedio Transferido
          </Typography>
          <Typography variant="subtitle2" sx={{ color: 'primary.main', fontWeight: 700 }}>
            {stats.avgBytesFormatted}
          </Typography>
        </Card>

        <Card
          sx={{
            p: 1.5,
            flex: '1 1 140px',
            bgcolor: (t) => hexAlpha(t.palette.info.main, 0.06),
            border: (t) => `1px solid ${hexAlpha(t.palette.info.main, 0.16)}`,
            boxShadow: 'none',
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            Velocidad Máxima
          </Typography>
          <Typography variant="subtitle2" sx={{ color: 'info.main', fontWeight: 700 }}>
            {stats.maxSpeedFormatted}
          </Typography>
        </Card>

        <Card
          sx={{
            p: 1.5,
            flex: '1 1 140px',
            bgcolor: (t) => hexAlpha(t.palette.success.main, 0.06),
            border: (t) => `1px solid ${hexAlpha(t.palette.success.main, 0.16)}`,
            boxShadow: 'none',
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            Total Archivos
          </Typography>
          <Typography variant="subtitle2" sx={{ color: 'success.main', fontWeight: 700 }}>
            {stats.totalFiles}
          </Typography>
        </Card>
      </Stack>

      {/* Gráfica ApexCharts */}
      <Box
        sx={{
          borderRadius: 1.5,
          p: 1.5,
          bgcolor: (t) => varAlpha(t.vars.palette.background.neutralChannel, 0.5),
          border: (t) => `1px solid ${t.palette.divider}`,
          boxShadow: (t) =>
            isDark
              ? `0 24px 54px -38px ${varAlpha(
                  t.vars.palette.primary.mainChannel,
                  0.7
                )}, inset 0 1px 0 ${varAlpha(t.vars.palette.common.whiteChannel, 0.04)}`
              : 'none',
        }}
      >
        <Chart
          type={metric === 'files' ? 'bar' : metric === 'combined' ? 'line' : 'area'}
          series={series}
          options={chartOptions}
          sx={{ height: 280 }}
        />
      </Box>
    </Box>
  );
}

export const DatasyncTaskTrend = memo(DatasyncTaskTrendComponent);
