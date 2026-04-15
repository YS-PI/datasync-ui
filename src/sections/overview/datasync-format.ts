import type { ChipProps } from '@mui/material/Chip';
import type { AlertColor } from '@mui/material/Alert';

import { fNumber } from 'src/utils/format-number';

import type { DatasyncTask, DatasyncResponse, DatasyncExecution } from './datasync-types';

const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;

export type DatasyncSummary = {
  monitoredDisks: number;
  successCount: number;
  errorCount: number;
  totalTransferredBytes: number;
  avgThroughputMbs: number;
};

export function isDatasyncResponse(value: unknown): value is DatasyncResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<DatasyncResponse>;

  return Array.isArray(candidate.tasks) && typeof candidate.generated_at === 'string';
}

export function summarizeDatasync(response: DatasyncResponse): DatasyncSummary {
  const monitoredDisks = response.tasks.length;

  const successCount = response.tasks.filter((task) => task.last_exec.status === 'SUCCESS').length;
  const errorCount = response.tasks.filter((task) => task.last_exec.status === 'ERROR').length;

  const totalTransferredBytes = response.tasks.reduce(
    (acc, task) => acc + task.last_exec.bytes_transferred,
    0
  );

  const avgThroughputMbs =
    monitoredDisks > 0
      ? response.tasks.reduce((acc, task) => acc + task.last_exec.throughput_mbs, 0) /
        monitoredDisks
      : 0;

  return {
    monitoredDisks,
    successCount,
    errorCount,
    totalTransferredBytes,
    avgThroughputMbs,
  };
}

export function formatStorageFromBytes(value: number): string {
  if (value >= GB) {
    return `${fNumber(value / GB)} GB`;
  }

  if (value >= MB) {
    return `${fNumber(value / MB)} MB`;
  }

  if (value >= KB) {
    return `${fNumber(value / KB)} KB`;
  }

  return `${fNumber(value)} B`;
}

export function formatThroughput(value: number): string {
  return `${fNumber(value)} MB/s`;
}

export function formatFileThroughput(value: number): string {
  return `${fNumber(value)} archivos/s`;
}

export function formatPercentChange(value: number): string {
  return `${fNumber(value)}%`;
}

export function formatTransferredWithSource(bytes: number, source: string): string {
  const safeSource = source?.trim() || 'n/a';
  return `${formatStorageFromBytes(bytes)} (${safeSource})`;
}

function parseScheduleTime(schedule: string): { hours: number; minutes: number } | null {
  const match = schedule.match(/(\d{1,2}):(\d{2})/);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours > 23 || minutes > 59) {
    return null;
  }

  return { hours, minutes };
}

export function getNextExecutionDate(schedule: string, now = new Date()): Date | null {
  const parsed = parseScheduleTime(schedule);

  if (!parsed) {
    return null;
  }

  const nextExecution = new Date(now);
  nextExecution.setHours(parsed.hours, parsed.minutes, 0, 0);

  if (nextExecution.getTime() <= now.getTime()) {
    nextExecution.setDate(nextExecution.getDate() + 1);
  }

  return nextExecution;
}

export function formatNextExecution(schedule: string, now = new Date()): string {
  const nextExecution = getNextExecutionDate(schedule, now);

  if (!nextExecution) {
    return '-';
  }

  const localTime = new Intl.DateTimeFormat('es-PE', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(nextExecution);

  const utcTime = new Intl.DateTimeFormat('es-PE', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  }).format(nextExecution);

  const hoursRemaining = (nextExecution.getTime() - now.getTime()) / (1000 * 60 * 60);

  return `${localTime} (${utcTime} UTC) - en ${fNumber(hoursRemaining, { maximumFractionDigits: 1 })}h`;
}

export function getValidationMessage(task: DatasyncTask): {
  severity: AlertColor;
  message: string;
} {
  if (task.last_exec.error) {
    return {
      severity: 'error',
      message: task.last_exec.error,
    };
  }

  const lastHistoryError = task.history.find((item) => item.error)?.error;

  if (lastHistoryError) {
    return {
      severity: 'warning',
      message: 'Hay errores en ejecuciones anteriores. Revisa el historial y CloudWatch.',
    };
  }

  return {
    severity: 'success',
    message: 'Todos los datos validados correctamente',
  };
}

export function getStatusChipColor(status: string): ChipProps['color'] {
  if (status === 'RUNNING') {
    return 'info';
  }

  if (status === 'SUCCESS') {
    return 'success';
  }

  if (status === 'ERROR') {
    return 'error';
  }

  return 'default';
}

export function getStatusAlertColor(status: string): AlertColor {
  if (status === 'RUNNING') {
    return 'info';
  }

  if (status === 'SUCCESS') {
    return 'success';
  }

  if (status === 'ERROR') {
    return 'error';
  }

  return 'info';
}

export function taskHasRecentErrors(task: DatasyncTask): boolean {
  return task.history.some((execution) => execution.status === 'ERROR' || Boolean(execution.error));
}

export function sortTasksByName(tasks: DatasyncTask[]): DatasyncTask[] {
  const getTaskPriority = (task: DatasyncTask): number => {
    const lastStatus = getExecutionDisplayStatus(task.last_exec);

    if (lastStatus === 'ERROR') {
      return 0;
    }

    if (taskHasRecentErrors(task)) {
      return 1;
    }

    return 2;
  };

  return [...tasks].sort((a, b) => {
    const priorityDiff = getTaskPriority(a) - getTaskPriority(b);

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return a.name.localeCompare(b.name);
  });
}

export function getExecutionKey(execution: DatasyncExecution): string {
  return `${execution.arn}-${execution.start_time}`;
}

export function isExecutionRunning(execution: DatasyncExecution): boolean {
  const durationText = execution.duration?.toLowerCase?.() ?? '';

  return execution.status === 'RUNNING' || durationText.includes('en curso');
}

export function getExecutionDisplayStatus(
  execution: DatasyncExecution
): 'RUNNING' | 'SUCCESS' | 'ERROR' {
  if (isExecutionRunning(execution)) {
    return 'RUNNING';
  }

  if (execution.status === 'SUCCESS') {
    return 'SUCCESS';
  }

  return 'ERROR';
}

export function getExecutionStatusLabelEs(status: string): string {
  if (status === 'RUNNING') {
    return 'RUNNING';
  }

  if (status === 'SUCCESS') {
    return 'Exitoso';
  }

  if (status === 'ERROR') {
    return 'Error';
  }

  return status;
}

export function executionHasCloudwatchLogs(execution: DatasyncExecution): boolean {
  return (
    execution.status === 'ERROR' &&
    (Boolean(execution.cloudwatch?.has_logs) || Boolean(execution.error))
  );
}

export function translateAwsErrorToEs(error: string): string {
  if (!error) {
    return error;
  }

  let translated = error;

  const replacements: Array<[RegExp, string]> = [
    [/Task failed to access location/gi, 'La tarea no pudo acceder a la ubicacion'],
    [/Transfer and verification completed\./gi, 'La transferencia y verificacion finalizaron.'],
    [
      /There were some errors in your task execution\./gi,
      'Se detectaron errores durante la ejecucion de la tarea.',
    ],
    [
      /See a list of affected files in task reports and CloudWatch logs\./gi,
      'Revisa la lista de archivos afectados en reportes de tarea y logs de CloudWatch.',
    ],
    [
      /If no files are listed, contact AWS Support\./gi,
      'Si no aparecen archivos afectados, contacta a AWS Support.',
    ],
    [/No such file or directory/gi, 'No existe el archivo o directorio'],
    [/Permission denied/gi, 'Permiso denegado'],
    [/mount error\((\d+)\)/gi, 'error de montaje ($1)'],
    [
      /Refer to the mount\.cifs\(8\) manual page \(e\.g\. man mount\.cifs\)/gi,
      'Revisa la documentacion de mount.cifs (ejemplo: man mount.cifs)',
    ],
  ];

  replacements.forEach(([pattern, value]) => {
    translated = translated.replace(pattern, value);
  });

  return translated;
}
