export type DatasyncExecStatus = 'SUCCESS' | 'ERROR' | 'RUNNING' | string;

export type DatasyncCloudwatchEvent = {
  timestamp: string;
  message: string;
  stream: string;
};

export type DatasyncCloudwatch = {
  has_logs: boolean;
  log_group: string;
  events_count: number;
  events: DatasyncCloudwatchEvent[];
  console_url: string;
  query_error: string;
};

export type DatasyncExecution = {
  arn: string;
  execution_id: string;
  status: DatasyncExecStatus;
  start_time: string;
  duration: string;
  duration_secs: number;
  files_transferred: number;
  files_skipped: number;
  pct_changed: number;
  bytes_transferred: number;
  bytes_source: string;
  throughput_mbs: number;
  file_throughput: number;
  error: string;
  cloudwatch: DatasyncCloudwatch | null;
};

export type DatasyncSchedule = {
  script: string;
  datasync: string;
  cron: string;
};

export type DatasyncTask = {
  name: string;
  disco: string;
  gb: number;
  snapshot: string;
  schedule: DatasyncSchedule;
  task_status: string;
  last_exec: DatasyncExecution;
  history: DatasyncExecution[];
  cloudwatch_log_group?: string;
  cloudwatch_console_url?: string;
};

export type DatasyncResponse = {
  tasks: DatasyncTask[];
  generated_at: string;
};
