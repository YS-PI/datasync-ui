import { varAlpha } from 'minimal-shared/utils';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ButtonGroup from '@mui/material/ButtonGroup';
import CardContent from '@mui/material/CardContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
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
  getStatusChipColor,
  isDatasyncResponse,
  formatNextExecution,
  formatPercentChange,
  taskHasRecentErrors,
  formatFileThroughput,
  getValidationMessage,
  translateAwsErrorToEs,
  formatStorageFromBytes,
  getExecutionDisplayStatus,
  getExecutionStatusLabelEs,
  executionHasCloudwatchLogs,
  formatTransferredWithSource,
} from '../datasync-format';

import type {
  DatasyncTask,
  DatasyncModule,
  DatasyncResponse,
  DatasyncExecution,
} from '../datasync-types';

const DATASYNC_API_URL =
  import.meta.env.VITE_DATASYNC_API_URL ??
  'https://kyk7nif0tj.execute-api.us-east-1.amazonaws.com/';
let datasyncResponseCache: DatasyncResponse | null = null;
let datasyncFetchPromise: Promise<DatasyncResponse> | null = null;

const DATASYNC_MODULE_LABELS: Record<DatasyncModule, string> = {
  APPROD: 'APPROD',
  ORACLE: 'Oracle',
  SIMA: 'SIMA',
  GLPI: 'GLPI',
  AULAVIRTUAL: 'Aula Virtual',
  SQLSERVER: 'SQL SERVER',
};

const DATASYNC_MODULES = new Set<DatasyncModule>([
  'APPROD',
  'ORACLE',
  'SIMA',
  'GLPI',
  'AULAVIRTUAL',
  'SQLSERVER',
]);

type LogLevelFilter = 'ALL' | 'INFO' | 'ERROR';

type OverviewAnalyticsViewProps = {
  moduleFilter?: DatasyncModule;
};

function resolveTaskModule(task: DatasyncTask): DatasyncModule {
  const moduleValue = task.module?.toString().toUpperCase();
  const taskName = task.name.toUpperCase();
  const diskValue = task.disco?.toString().toUpperCase();

  if (DATASYNC_MODULES.has(moduleValue as DatasyncModule)) {
    return moduleValue as DatasyncModule;
  }

  if (diskValue === 'SIMA' || taskName.includes('SIMA')) {
    return 'SIMA';
  }

  if (diskValue === 'GLPI' || taskName.includes('GLPI')) {
    return 'GLPI';
  }

  if (diskValue === 'AULAVIRTUAL' || taskName.includes('AULAVIRTUAL')) {
    return 'AULAVIRTUAL';
  }

  if (
    moduleValue === 'SQL SERVER' ||
    diskValue === 'SQLSERVER' ||
    diskValue === 'SQL SERVER' ||
    taskName.includes('URPBD') ||
    taskName.includes('BDURP')
  ) {
    return 'SQLSERVER';
  }

  return taskName.includes('ORACLE') ? 'ORACLE' : 'APPROD';
}

function mapResponseByModule(
  payload: DatasyncResponse,
  moduleFilter?: DatasyncModule
): DatasyncResponse {
  const tasksByModule = moduleFilter
    ? payload.tasks.filter((task) => resolveTaskModule(task) === moduleFilter)
    : payload.tasks;

  return { ...payload, tasks: sortTasksByName(tasksByModule) };
}

async function fetchDatasyncResponse(forceRefresh = false): Promise<DatasyncResponse> {
  if (!forceRefresh && datasyncResponseCache) {
    return datasyncResponseCache;
  }

  if (!forceRefresh && datasyncFetchPromise) {
    return datasyncFetchPromise;
  }

  datasyncFetchPromise = (async () => {
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

    datasyncResponseCache = payload;

    return payload;
  })();

  try {
    return await datasyncFetchPromise;
  } finally {
    datasyncFetchPromise = null;
  }
}

// ----------------------------------------------------------------------

export function OverviewAnalyticsView({ moduleFilter }: OverviewAnalyticsViewProps) {
  const theme = useTheme();
  const { mode, setMode } = useColorScheme();
  const isDark = mode === 'dark';
  const folderIconSrc = '/assets/aws/3643772-archive-archives-document-folder-open_113445.svg';
  const s3IconSrc = isDark
    ? '/assets/aws/amazon_s_icon_130997-transparent.svg'
    : '/assets/aws/amazon_s_icon_130997.svg';

  const [data, setData] = useState<DatasyncResponse | null>(() =>
    datasyncResponseCache ? mapResponseByModule(datasyncResponseCache, moduleFilter) : null
  );
  const [expandedTask, setExpandedTask] = useState<string | false>(false);
  const [isLoading, setIsLoading] = useState(!datasyncResponseCache);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translatedErrors, setTranslatedErrors] = useState<Record<string, boolean>>({});
  const [logLevelFilter, setLogLevelFilter] = useState<LogLevelFilter>('ALL');
  const [selectedLogExecution, setSelectedLogExecution] = useState<{
    taskName: string;
    execution: DatasyncExecution;
  } | null>(null);
  const hasInitializedExpandedTaskRef = useRef(false);

  const fetchData = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setIsRefreshing(true);
      }

      try {
        const payload = await fetchDatasyncResponse(isManualRefresh);
        const scopedPayload = mapResponseByModule(payload, moduleFilter);
        const sortedTasks = scopedPayload.tasks;

        setData(scopedPayload);
        setError(null);

        setExpandedTask((current) => {
          if (!hasInitializedExpandedTaskRef.current) {
            hasInitializedExpandedTaskRef.current = true;
            return false;
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
        const errorMessage =
          fetchError instanceof Error ? fetchError.message : 'Error no controlado';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
        if (isManualRefresh) {
          setIsRefreshing(false);
        }
      }
    },
    [moduleFilter]
  );

  const moduleLabel = moduleFilter ? DATASYNC_MODULE_LABELS[moduleFilter] : 'DataSync';
  const summaryTitle = moduleFilter === 'APPROD' ? 'Discos monitoreados' : 'Tareas monitoreadas';

  useEffect(() => {
    void fetchData();
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
        const executionDisplayStatus = getExecutionDisplayStatus(execution);

        if (executionDisplayStatus === 'SUCCESS') {
          successCount += 1;
        }

        if (executionDisplayStatus === 'ERROR') {
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

  const getCloudwatchEventLevel = (message: string): Exclude<LogLevelFilter, 'ALL'> =>
    message.trim().startsWith('[ERROR]') ? 'ERROR' : 'INFO';

  const selectedExecutionEvents = useMemo(
    () => selectedLogExecution?.execution.cloudwatch?.events ?? [],
    [selectedLogExecution]
  );

  const logEventCounts = useMemo(() => {
    const counts = { all: selectedExecutionEvents.length, info: 0, error: 0 };

    selectedExecutionEvents.forEach((event) => {
      if (getCloudwatchEventLevel(event.message) === 'ERROR') {
        counts.error += 1;
      } else {
        counts.info += 1;
      }
    });

    return counts;
  }, [selectedExecutionEvents]);

  const filteredLogEvents = useMemo(() => {
    if (logLevelFilter === 'ALL') {
      return selectedExecutionEvents;
    }

    return selectedExecutionEvents.filter(
      (event) => getCloudwatchEventLevel(event.message) === logLevelFilter
    );
  }, [logLevelFilter, selectedExecutionEvents]);

  const renderTransferStatusIcon = (
    status: 'RUNNING' | 'SUCCESS' | 'ERROR' | 'NO_EXECUTIONS',
    diskLabel?: string
  ) => {
    const lineChannel =
      status === 'RUNNING'
        ? theme.vars.palette.info.mainChannel
        : status === 'ERROR'
          ? theme.vars.palette.error.mainChannel
          : status === 'NO_EXECUTIONS'
            ? theme.vars.palette.grey['500Channel']
            : theme.vars.palette.success.mainChannel;

    const lineColor = varAlpha(lineChannel, status === 'RUNNING' ? 0.3 : 0.48);

    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <Box
          sx={{
            position: 'relative',
            width: 128,
            height: 48,
            borderRadius: 1,
            border: `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.25)}`,
            bgcolor: isDark
              ? varAlpha(theme.vars.palette.grey['900Channel'], 0.62)
              : varAlpha(theme.vars.palette.common.whiteChannel, 0.75),
          }}
        >
          <Box
            component="img"
            src={folderIconSrc}
            alt="Carpeta origen"
            sx={{
              position: 'absolute',
              left: 8,
              top: 8,
              width: 32,
              height: 32,
              objectFit: 'contain',
              filter: isDark ? 'brightness(0) invert(1)' : 'none',
            }}
          />

          <Box
            component="img"
            src={s3IconSrc}
            alt="Bucket S3 destino"
            sx={{
              position: 'absolute',
              right: 4,
              top: 4,
              width: 40,
              height: 40,
              objectFit: 'contain',
            }}
          />

          <Box
            sx={{
              position: 'absolute',
              left: 46,
              right: 46,
              top: 23,
              height: 3,
              borderRadius: 999,
              bgcolor: lineColor,
              '&::after': {
                content: '""',
                position: 'absolute',
                right: -6,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 0,
                height: 0,
                borderTop: '5px solid transparent',
                borderBottom: '5px solid transparent',
                borderLeft: `7px solid ${lineColor}`,
              },
            }}
          />

          {status === 'RUNNING' ? (
            <Box
              sx={{
                position: 'absolute',
                left: 46,
                top: 18,
                width: 9,
                height: 9,
                borderRadius: '50%',
                bgcolor: 'info.main',
                boxShadow: `0 0 0 4px ${varAlpha(theme.vars.palette.info.mainChannel, 0.22)}`,
                animation: 'datasync-transfer-flow 1.1s ease-in-out infinite',
                '@keyframes datasync-transfer-flow': {
                  '0%': { transform: 'translateX(0)', opacity: 0.3 },
                  '45%': { opacity: 1 },
                  '100%': { transform: 'translateX(30px)', opacity: 0.3 },
                },
              }}
            />
          ) : (
            <Box
              sx={{
                position: 'absolute',
                left: 20,
                top: 28,
                width: 16,
                height: 16,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                fontSize: 12,
                fontWeight: 700,
                lineHeight: 1,
                color: 'common.white',
                bgcolor:
                  status === 'ERROR'
                    ? 'error.main'
                    : status === 'NO_EXECUTIONS'
                      ? 'text.disabled'
                      : 'success.main',
                boxShadow: `0 0 0 2px ${isDark ? theme.vars.palette.grey[800] : theme.vars.palette.common.white}`,
              }}
            >
              {status === 'ERROR' ? '×' : status === 'NO_EXECUTIONS' ? '-' : '✓'}
            </Box>
          )}
        </Box>

        {diskLabel && (
          <Box
            sx={{
              minWidth: 42,
              height: 42,
              borderRadius: 1,
              display: 'grid',
              placeItems: 'center',
              border: `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.3)}`,
            }}
          >
            <Typography variant="subtitle1">{diskLabel}</Typography>
          </Box>
        )}
      </Stack>
    );
  };

  const renderTaskRow = (task: DatasyncTask) => {
    const taskModule = resolveTaskModule(task);
    const isApprodTask = taskModule === 'APPROD';
    const isOracleTask = taskModule === 'ORACLE';
    const hasRecentErrors = taskHasRecentErrors(task);
    const isExpanded = expandedTask === task.name;
    const validation = getValidationMessage(task);
    const taskLastErrorKey = `${task.name}-last-error`;
    const lastExecDisplayStatus = getExecutionDisplayStatus(task.last_exec);
    const isCurrentRunning =
      lastExecDisplayStatus === 'RUNNING' || task.task_status.toUpperCase() === 'RUNNING';
    const hasNoExecutions = lastExecDisplayStatus === 'NO_EXECUTIONS';
    const isCurrentError = lastExecDisplayStatus === 'ERROR' && !isCurrentRunning;
    const borderStatusColor = isCurrentRunning
      ? theme.vars.palette.info.main
      : hasNoExecutions
        ? theme.vars.palette.grey[500]
      : isCurrentError
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
              <Label
                color={isCurrentRunning ? 'info' : isCurrentError ? 'error' : 'success'}
                variant="soft"
              >
                {isCurrentRunning
                  ? 'En curso'
                  : hasNoExecutions
                    ? 'Sin ejecuciones'
                    : isCurrentError
                      ? 'En error'
                      : 'Operacion estable'}
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
            <Grid size={{ xs: 12, md: 3.5 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                {renderTransferStatusIcon(
                  lastExecDisplayStatus,
                  isApprodTask ? task.disco : undefined
                )}
                <Box>
                  <Typography variant="subtitle1">{task.name}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {isApprodTask
                      ? `${task.gb} GB · Snapshot ${task.snapshot}`
                      : isOracleTask
                        ? 'Respaldo Oracle'
                        : `Backup ${DATASYNC_MODULE_LABELS[taskModule]}`}
                  </Typography>
                </Box>
              </Stack>
            </Grid>

            <Grid size={{ xs: 6, md: 1.25 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Estado
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Label color={getStatusChipColor(lastExecDisplayStatus)} variant="soft">
                  {getExecutionStatusLabelEs(lastExecDisplayStatus)}
                </Label>
              </Box>
            </Grid>

            <Grid size={{ xs: 6, md: 2 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Ultima ejecucion
              </Typography>
              <Typography variant="body2">{task.last_exec.start_time}</Typography>
            </Grid>

            <Grid size={{ xs: 6, md: 1.25 }}>
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
                    {isApprodTask && (
                      <>
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
                      </>
                    )}
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
                        Vel. datos (MiB/s)
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
                        Verificados
                      </Typography>
                      <Typography variant="body2">{task.last_exec.files_verified}</Typography>
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
                        {task.last_exec.arn || '—'}
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
                          <TableCell>Verificados</TableCell>
                          <TableCell>% Cambio</TableCell>
                          <TableCell>Datos</TableCell>
                          <TableCell>MiB/s</TableCell>
                          <TableCell>Archivos/s</TableCell>
                          <TableCell>Logs</TableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {!task.history.length && (
                          <TableRow>
                            <TableCell colSpan={11} sx={{ color: 'text.secondary' }}>
                              Esta tarea aun no tiene ejecuciones registradas en DataSync.
                            </TableCell>
                          </TableRow>
                        )}
                        {task.history.flatMap((execution) => {
                          const executionKey = getExecutionKey(execution);
                          const rows = [
                            <TableRow key={executionKey} hover>
                              <TableCell>{execution.start_time}</TableCell>
                              <TableCell>
                                <Label
                                  color={getStatusChipColor(getExecutionDisplayStatus(execution))}
                                  variant="soft"
                                >
                                  {getExecutionStatusLabelEs(getExecutionDisplayStatus(execution))}
                                </Label>
                              </TableCell>
                              <TableCell>{execution.duration}</TableCell>
                              <TableCell>{execution.files_transferred}</TableCell>
                              <TableCell>{execution.files_skipped}</TableCell>
                              <TableCell>{execution.files_verified}</TableCell>
                              <TableCell>{formatPercentChange(execution.pct_changed)}</TableCell>
                              <TableCell>
                                {formatStorageFromBytes(execution.bytes_transferred)}
                              </TableCell>
                              <TableCell>{formatThroughput(execution.throughput_mbs)}</TableCell>
                              <TableCell>
                                {formatFileThroughput(execution.file_throughput)}
                              </TableCell>
                              <TableCell>
                                {executionHasCloudwatchLogs(execution) ? (
                                  <Tooltip title="Ver logs de CloudWatch">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => {
                                        setLogLevelFilter('ALL');
                                        setSelectedLogExecution({ taskName: task.name, execution });
                                      }}
                                    >
                                      <Iconify icon="solar:eye-bold" width={16} />
                                    </IconButton>
                                  </Tooltip>
                                ) : (
                                  <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                                    -
                                  </Typography>
                                )}
                              </TableCell>
                            </TableRow>,
                          ];

                          if (execution.error) {
                            const errorKey = `${task.name}-${executionKey}-error`;

                            rows.push(
                              <TableRow key={`${executionKey}-error`}>
                                <TableCell
                                  colSpan={11}
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
              <Typography variant="h4">BKSync Dashboard - {moduleLabel}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                Monitoreo y validación de transferencias de archivos.
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
          <OverviewLoadingSkeleton />
        ) : (
          <>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
                <AnalyticsWidgetSummary
                  title={summaryTitle}
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
                Tareas {moduleLabel}
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

      <Dialog
        open={Boolean(selectedLogExecution)}
        onClose={() => {
          setSelectedLogExecution(null);
          setLogLevelFilter('ALL');
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Logs CloudWatch
          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>
            {selectedLogExecution
              ? `${selectedLogExecution.taskName} · ${selectedLogExecution.execution.execution_id}`
              : ''}
          </Typography>
        </DialogTitle>

        <DialogContent dividers>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            sx={{ mb: 1.5 }}
          >
            <ButtonGroup size="small" variant="outlined">
              <Button
                color="primary"
                variant={logLevelFilter === 'ALL' ? 'contained' : 'outlined'}
                onClick={() => setLogLevelFilter('ALL')}
              >
                Todos ({logEventCounts.all})
              </Button>
              <Button
                color="info"
                variant={logLevelFilter === 'INFO' ? 'contained' : 'outlined'}
                onClick={() => setLogLevelFilter('INFO')}
              >
                INFO ({logEventCounts.info})
              </Button>
              <Button
                color="error"
                variant={logLevelFilter === 'ERROR' ? 'contained' : 'outlined'}
                onClick={() => setLogLevelFilter('ERROR')}
              >
                ERROR ({logEventCounts.error})
              </Button>
            </ButtonGroup>

            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Filtro activo: {logLevelFilter}
            </Typography>
          </Stack>

          {!!selectedLogExecution?.execution.error && (
            <Alert severity="error" sx={{ mb: 1.5 }}>
              {renderTranslatableError(
                `${selectedLogExecution.execution.execution_id}-main-error`,
                selectedLogExecution.execution.error,
                true
              )}
            </Alert>
          )}

          {filteredLogEvents.length ? (
            <Stack spacing={1.25}>
              {filteredLogEvents.map((event, idx) => (
                <Box
                  key={`${selectedLogExecution?.execution.execution_id ?? 'execution'}-${idx}-${event.timestamp}`}
                  sx={{
                    p: 1.25,
                    borderRadius: 1,
                    border: `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.24)}`,
                    bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.04),
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    {event.timestamp}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    Stream: {event.stream}
                  </Typography>
                  <Stack direction="row" spacing={0.75} sx={{ mt: 0.5, mb: 0.25 }}>
                    <Label
                      variant="soft"
                      color={getCloudwatchEventLevel(event.message) === 'ERROR' ? 'error' : 'info'}
                    >
                      {getCloudwatchEventLevel(event.message)}
                    </Label>
                  </Stack>
                  <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                    {event.message}
                  </Typography>
                </Box>
              ))}
            </Stack>
          ) : (
            <Alert severity="info">
              {selectedExecutionEvents.length
                ? `No hay eventos ${logLevelFilter} para esta ejecucion.`
                : 'No hay eventos de CloudWatch para esta ejecucion.'}
            </Alert>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            component="a"
            href={selectedLogExecution?.execution.cloudwatch?.console_url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            disabled={!selectedLogExecution?.execution.cloudwatch?.console_url}
          >
            Abrir CloudWatch
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setSelectedLogExecution(null);
              setLogLevelFilter('ALL');
            }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}

function OverviewLoadingSkeleton() {
  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        {Array.from({ length: 5 }).map((_, idx) => (
          <Grid key={`summary-skeleton-${idx}`} size={{ xs: 12, sm: 6, lg: 2.4 }}>
            <Card>
              <CardContent>
                <Skeleton variant="text" width="60%" height={20} />
                <Skeleton variant="text" width="40%" height={36} />
                <Skeleton variant="rounded" height={28} sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card>
        <CardContent>
          <Skeleton variant="text" width={160} height={28} />
          <Skeleton variant="text" width={280} height={20} sx={{ mb: 2 }} />

          <Stack spacing={1.5}>
            {Array.from({ length: 3 }).map((_, idx) => (
              <Skeleton key={`task-skeleton-${idx}`} variant="rounded" height={96} />
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
