import { varAlpha } from 'minimal-shared/utils';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ButtonGroup from '@mui/material/ButtonGroup';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';
import { useTheme, useColorScheme } from '@mui/material/styles';

import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { AnalyticsWidgetSummary } from 'src/sections/overview/analytics-widget-summary';

import {
  getExecutionKey,
  sortTasksByName,
  formatThroughput,
  summarizeDatasync,
  isDatasyncResponse,
  formatNextExecution,
  formatPercentChange,
  taskHasRecentErrors,
  formatFileThroughput,
  getValidationMessage,
  translateAwsErrorToEs,
  formatStorageFromBytes,
  formatTransferredWithSource,
} from '../datasync-format';

import type { DatasyncTask, DatasyncResponse } from '../datasync-types';

const DATASYNC_API_URL =
  import.meta.env.VITE_DATASYNC_API_URL ??
  'https://kyk7nif0tj.execute-api.us-east-1.amazonaws.com/';
const AUTO_REFRESH_MS = 5 * 60 * 60 * 1000;

// ----------------------------------------------------------------------

export function OverviewAnalyticsView() {
  const theme = useTheme();
  const { mode, setMode } = useColorScheme();
  const isDark = mode === 'dark';

  const [data, setData] = useState<DatasyncResponse | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | false>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translatedErrors, setTranslatedErrors] = useState<Record<string, boolean>>({});
  const hasInitializedExpandedTaskRef = useRef(false);

  const fetchData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    }

    try {
      const response = await fetch(DATASYNC_API_URL, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`La API respondio con estado ${response.status}`);
      }

      const payload = (await response.json()) as unknown;

      if (!isDatasyncResponse(payload)) {
        throw new Error('El payload recibido no coincide con el formato esperado');
      }

      const sortedTasks = sortTasksByName(payload.tasks);

      setData({ ...payload, tasks: sortedTasks });
      setError(null);

      setExpandedTask((current) => {
        if (!hasInitializedExpandedTaskRef.current) {
          hasInitializedExpandedTaskRef.current = true;
          return sortedTasks[0]?.name ?? false;
        }

        if (sortedTasks.length === 0) {
          return false;
        }

        if (current === false) {
          return false;
        }

        if (sortedTasks.some((task) => task.name === current)) {
          return current;
        }

        return sortedTasks[0]?.name ?? false;
      });
    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Error no controlado';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      if (isManualRefresh) {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchData();
    }, AUTO_REFRESH_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [fetchData]);

  const summary = useMemo(() => (data ? summarizeDatasync(data) : null), [data]);

  const historyCategories = useMemo(() => ['h-5', 'h-4', 'h-3', 'h-2', 'actual'], []);

  const historySeries = useMemo(() => {
    const emptySeries = [0, 0, 0, 0, 0];

    if (!data?.tasks.length) {
      return {
        success: emptySeries,
        errors: emptySeries,
        transferred: emptySeries,
        throughput: emptySeries,
        files: emptySeries,
      };
    }

    const maxPoints = 5;
    const success: number[] = [];
    const errors: number[] = [];
    const transferred: number[] = [];
    const throughput: number[] = [];
    const files: number[] = [];

    for (let point = maxPoints - 1; point >= 0; point -= 1) {
      let successCount = 0;
      let errorCount = 0;
      let transferredBytes = 0;
      let throughputSum = 0;
      let throughputCount = 0;
      let filesTransferred = 0;

      data.tasks.forEach((task) => {
        const execution = task.history[point] ?? task.last_exec;

        if (execution.status === 'SUCCESS') {
          successCount += 1;
        }

        if (execution.status === 'ERROR') {
          errorCount += 1;
        }

        transferredBytes += execution.bytes_transferred;
        filesTransferred += execution.files_transferred;

        if (execution.throughput_mbs > 0) {
          throughputSum += execution.throughput_mbs;
          throughputCount += 1;
        }
      });

      success.push(successCount);
      errors.push(errorCount);
      transferred.push(transferredBytes / (1024 * 1024));
      throughput.push(throughputCount > 0 ? throughputSum / throughputCount : 0);
      files.push(filesTransferred);
    }

    return {
      success,
      errors,
      transferred,
      throughput,
      files,
    };
  }, [data]);

  const handleToggleTask = (taskName: string) => {
    setExpandedTask((current) => (current === taskName ? false : taskName));
  };

  const handleToggleTranslation = (errorKey: string) => {
    setTranslatedErrors((current) => ({
      ...current,
      [errorKey]: !current[errorKey],
    }));
  };

  const getErrorText = (errorKey: string, errorText: string) =>
    translatedErrors[errorKey] ? translateAwsErrorToEs(errorText) : errorText;

  const renderTranslatableError = (errorKey: string, errorText: string, compact = false) => (
    <Stack direction="row" spacing={0.75} alignItems="flex-start">
      <Typography variant={compact ? 'caption' : 'body2'} sx={{ flex: 1 }}>
        {getErrorText(errorKey, errorText)}
      </Typography>

      <Tooltip title={translatedErrors[errorKey] ? 'Ver original' : 'Traducir'}>
        <IconButton size="small" color="inherit" onClick={() => handleToggleTranslation(errorKey)}>
          <Iconify icon="solar:pen-bold" width={16} />
        </IconButton>
      </Tooltip>
    </Stack>
  );

  const renderTaskRow = (task: DatasyncTask) => {
    const hasRecentErrors = taskHasRecentErrors(task);
    const isExpanded = expandedTask === task.name;
    const validation = getValidationMessage(task);
    const taskLastErrorKey = `${task.name}-last-error`;
    const isCurrentError = task.last_exec.status === 'ERROR';
    const borderStatusColor = isCurrentError
      ? theme.vars.palette.error.main
      : theme.vars.palette.success.main;

    const validationMessage =
      validation.severity === 'error' && task.last_exec.error
        ? getErrorText(taskLastErrorKey, validation.message)
        : validation.message;

    return (
      <Card
        key={task.name}
        sx={{
          overflow: 'hidden',
          border: `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.18)}`,
          borderLeftWidth: 3,
          borderLeftColor: borderStatusColor,
          backgroundImage: isDark
            ? `linear-gradient(180deg, ${varAlpha(theme.vars.palette.grey['900Channel'], 0.84)}, ${varAlpha(theme.vars.palette.grey['800Channel'], 0.72)})`
            : `linear-gradient(180deg, ${varAlpha(theme.vars.palette.common.whiteChannel, 0.96)}, ${varAlpha(theme.vars.palette.grey['500Channel'], 0.02)})`,
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 2,
            borderBottom: `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.12)}`,
            bgcolor: isDark
              ? varAlpha(theme.vars.palette.grey['800Channel'], 0.36)
              : varAlpha(theme.vars.palette.grey['500Channel'], 0.02),
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            justifyContent="space-between"
            sx={{ mb: 1.75 }}
          >
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Label color={isCurrentError ? 'error' : 'success'} variant="soft">
                {isCurrentError ? 'En error' : 'Operacion estable'}
              </Label>
              {hasRecentErrors && !isCurrentError && (
                <Label color="warning" variant="soft">
                  Historial con alertas
                </Label>
              )}
              <Label color="info" variant="soft">
                {task.task_status}
              </Label>
            </Stack>

            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Ultima actualizacion: {task.last_exec.start_time}
            </Typography>
          </Stack>

          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: 1,
                    display: 'grid',
                    placeItems: 'center',
                    border: `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.3)}`,
                  }}
                >
                  <Typography variant="subtitle2">{task.disco}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle1">{task.name}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {task.gb} GB · Snapshot {task.snapshot}
                  </Typography>
                </Box>
              </Stack>
            </Grid>

            <Grid size={{ xs: 6, md: 1.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Estado
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Label
                  color={task.last_exec.status === 'SUCCESS' ? 'success' : 'error'}
                  variant="soft"
                >
                  {task.last_exec.status === 'SUCCESS' ? 'Exitoso' : 'Error'}
                </Label>
              </Box>
            </Grid>

            <Grid size={{ xs: 6, md: 2 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Ultima ejecucion
              </Typography>
              <Typography variant="body2">{task.last_exec.start_time}</Typography>
            </Grid>

            <Grid size={{ xs: 6, md: 1.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Transferido
              </Typography>
              <Typography variant="body2">
                {formatStorageFromBytes(task.last_exec.bytes_transferred)}
              </Typography>
            </Grid>

            <Grid size={{ xs: 6, md: 1.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Velocidad
              </Typography>
              <Typography variant="body2">
                {formatThroughput(task.last_exec.throughput_mbs)}
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, md: 2.5 }}>
              <Stack direction="row" justifyContent="flex-end">
                <Button
                  size="small"
                  variant={isExpanded ? 'contained' : 'outlined'}
                  color={isExpanded ? 'primary' : 'inherit'}
                  onClick={() => handleToggleTask(task.name)}
                >
                  {isExpanded ? 'Ocultar' : 'Detalle'}
                </Button>
              </Stack>
            </Grid>
          </Grid>

          {!!task.last_exec.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {renderTranslatableError(taskLastErrorKey, task.last_exec.error)}
            </Alert>
          )}
        </Box>

        {isExpanded && (
          <>
            <Divider />

            <Grid container>
              <Grid size={{ xs: 12, lg: 3.5 }}>
                <Box sx={{ p: 2.5 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                    Configuracion y validacion
                  </Typography>

                  <Stack spacing={1.2}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Script Windows
                      </Typography>
                      <Typography variant="body2">{task.schedule.script}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        DataSync
                      </Typography>
                      <Typography variant="body2">{task.schedule.datasync}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Cron AWS
                      </Typography>
                      <Typography variant="body2">{task.schedule.cron}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Proxima ejecucion
                      </Typography>
                      <Typography variant="body2" sx={{ textAlign: 'right' }}>
                        {formatNextExecution(task.schedule.datasync)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Snapshot estimado
                      </Typography>
                      <Typography variant="body2">{task.snapshot}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Capacidad disco
                      </Typography>
                      <Typography variant="body2">{task.gb} GB</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Duracion ultima ejec.
                      </Typography>
                      <Typography variant="body2">{task.last_exec.duration}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Datos transferidos
                      </Typography>
                      <Typography variant="body2" sx={{ textAlign: 'right' }}>
                        {formatTransferredWithSource(
                          task.last_exec.bytes_transferred,
                          task.last_exec.bytes_source
                        )}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Vel. datos (MB/s)
                      </Typography>
                      <Typography variant="body2">
                        {formatThroughput(task.last_exec.throughput_mbs)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Vel. archivos
                      </Typography>
                      <Typography variant="body2">
                        {formatFileThroughput(task.last_exec.file_throughput)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        % Cambio incremental
                      </Typography>
                      <Typography variant="body2">
                        {formatPercentChange(task.last_exec.pct_changed)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Estado tarea AWS
                      </Typography>
                      <Typography variant="body2">{task.task_status}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        ARN ejecucion
                      </Typography>
                      <Typography variant="body2" sx={{ textAlign: 'right' }}>
                        {task.last_exec.arn}
                      </Typography>
                    </Box>
                  </Stack>

                  <Alert severity={validation.severity} sx={{ mt: 2 }}>
                    {validationMessage}
                  </Alert>
                </Box>
              </Grid>

              <Grid size={{ xs: 12, lg: 8.5 }}>
                <Box sx={{ px: 2.5, py: 2.25 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                    Historial de ejecuciones (ultimas 5)
                  </Typography>

                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Inicio</TableCell>
                          <TableCell>Estado</TableCell>
                          <TableCell>Duracion</TableCell>
                          <TableCell>Transferidos</TableCell>
                          <TableCell>Omitidos</TableCell>
                          <TableCell>% Cambio</TableCell>
                          <TableCell>Datos</TableCell>
                          <TableCell>MB/s</TableCell>
                          <TableCell>Archivos/s</TableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {task.history.flatMap((execution) => {
                          const executionKey = getExecutionKey(execution);
                          const rows = [
                            <TableRow key={executionKey} hover>
                              <TableCell>{execution.start_time}</TableCell>
                              <TableCell>
                                <Label
                                  color={execution.status === 'SUCCESS' ? 'success' : 'error'}
                                  variant="soft"
                                >
                                  {execution.status === 'SUCCESS' ? 'Exitoso' : 'Error'}
                                </Label>
                              </TableCell>
                              <TableCell>{execution.duration}</TableCell>
                              <TableCell>{execution.files_transferred}</TableCell>
                              <TableCell>{execution.files_skipped}</TableCell>
                              <TableCell>{formatPercentChange(execution.pct_changed)}</TableCell>
                              <TableCell>
                                {formatStorageFromBytes(execution.bytes_transferred)}
                              </TableCell>
                              <TableCell>{formatThroughput(execution.throughput_mbs)}</TableCell>
                              <TableCell>
                                {formatFileThroughput(execution.file_throughput)}
                              </TableCell>
                            </TableRow>,
                          ];

                          if (execution.error) {
                            const errorKey = `${task.name}-${executionKey}-error`;

                            rows.push(
                              <TableRow key={`${executionKey}-error`}>
                                <TableCell
                                  colSpan={9}
                                  sx={{
                                    color: 'error.main',
                                    borderBottom: `1px solid ${varAlpha(theme.vars.palette.error.mainChannel, 0.2)}`,
                                  }}
                                >
                                  {renderTranslatableError(errorKey, execution.error, true)}
                                </TableCell>
                              </TableRow>
                            );
                          }

                          return rows;
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Grid>
            </Grid>
          </>
        )}
      </Card>
    );
  };

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={3}>
        <Card
          sx={{
            border: `1px solid ${varAlpha(theme.vars.palette.primary.mainChannel, 0.18)}`,
            backgroundImage: isDark
              ? `linear-gradient(135deg, ${varAlpha(theme.vars.palette.info.mainChannel, 0.14)}, ${varAlpha(theme.vars.palette.primary.mainChannel, 0.1)})`
              : `linear-gradient(135deg, ${varAlpha(theme.vars.palette.info.mainChannel, 0.08)}, ${varAlpha(theme.vars.palette.primary.mainChannel, 0.06)})`,
          }}
        >
          <CardContent
            sx={{
              py: 2.5,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: { xs: 'flex-start', md: 'center' },
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box sx={{ minWidth: 320 }}>
              <Typography variant="h4">DataSync Dashboard</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                Vista operativa de ejecuciones, validacion y transferencia por disco.
              </Typography>

              <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
                <Label color="primary" variant="soft">
                  {data?.tasks.length ?? 0} tareas monitoreadas
                </Label>
                <Label color="default" variant="outlined">
                  Generado: {data?.generated_at ?? '-'}
                </Label>
              </Stack>
            </Box>

            <Stack spacing={1} alignItems={{ xs: 'flex-start', md: 'flex-end' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                API Gateway
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  px: 1.25,
                  py: 0.75,
                  borderRadius: 1,
                  border: `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.2)}`,
                  bgcolor: isDark
                    ? varAlpha(theme.vars.palette.grey['900Channel'], 0.72)
                    : varAlpha(theme.vars.palette.common.whiteChannel, 0.7),
                }}
              >
                {DATASYNC_API_URL}
              </Typography>

              <Stack direction="row" spacing={1} alignItems="center">
                <Label color="info" variant="soft">
                  Auto-refresh 5h
                </Label>
                <ButtonGroup size="small" variant="outlined">
                  <Button
                    variant={mode === 'light' ? 'contained' : 'outlined'}
                    onClick={() => setMode('light')}
                  >
                    Claro
                  </Button>
                  <Button
                    variant={mode === 'dark' ? 'contained' : 'outlined'}
                    onClick={() => setMode('dark')}
                  >
                    Oscuro
                  </Button>
                </ButtonGroup>
                <Button variant="contained" onClick={() => fetchData(true)} disabled={isRefreshing}>
                  {isRefreshing ? 'Actualizando...' : 'Actualizar'}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {!!error && <Alert severity="error">No se pudo cargar el dashboard: {error}</Alert>}

        {isLoading && !data ? (
          <Alert severity="info">Cargando datos de DataSync...</Alert>
        ) : (
          <>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
                <AnalyticsWidgetSummary
                  title="Discos monitoreados"
                  total={summary?.monitoredDisks ?? 0}
                  showTrending={false}
                  showChart={false}
                  color="info"
                  chart={{ categories: historyCategories, series: historySeries.files }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
                <AnalyticsWidgetSummary
                  title="Exitosos"
                  total={summary?.successCount ?? 0}
                  showTrending={false}
                  showChart={false}
                  color="success"
                  chart={{ categories: historyCategories, series: historySeries.success }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
                <AnalyticsWidgetSummary
                  title="Con errores"
                  total={summary?.errorCount ?? 0}
                  showTrending={false}
                  showChart={false}
                  color="error"
                  chart={{ categories: historyCategories, series: historySeries.errors }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
                <AnalyticsWidgetSummary
                  title="Total transferido"
                  total={summary?.totalTransferredBytes ?? 0}
                  value={formatStorageFromBytes(summary?.totalTransferredBytes ?? 0)}
                  showTrending={false}
                  showChart={false}
                  color="warning"
                  chart={{ categories: historyCategories, series: historySeries.transferred }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
                <AnalyticsWidgetSummary
                  title="Velocidad prom."
                  total={summary?.avgThroughputMbs ?? 0}
                  value={formatThroughput(summary?.avgThroughputMbs ?? 0)}
                  showTrending={false}
                  showChart={false}
                  color="primary"
                  chart={{ categories: historyCategories, series: historySeries.throughput }}
                />
              </Grid>
            </Grid>

            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Tareas DataSync
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}
              >
                Expande una tarjeta para revisar validacion detallada e historial tecnico.
              </Typography>

              <Stack spacing={2}>
                {data?.tasks.map(renderTaskRow)}
                {!data?.tasks.length && (
                  <Alert severity="warning">
                    El endpoint no devolvio tareas. Verifica la Lambda o la configuracion de
                    DataSync.
                  </Alert>
                )}
              </Stack>
            </Box>
          </>
        )}
      </Stack>
    </DashboardContent>
  );
}
