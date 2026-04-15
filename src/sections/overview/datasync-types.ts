export type DatasyncExecStatus = 'SUCCESS' | 'ERROR' | 'RUNNING' | string;

export type DatasyncExecution = {
  arn: string;
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
};

export type DatasyncResponse = {
  tasks: DatasyncTask[];
  generated_at: string;
};
