# Watchmen DQC

DQC of _**Watchmen**_.

## Monitor rules runner engines

Monitor rules can be executed by one of three engines, selected by `MONITOR_RULES_RUNNER_ENGINE`:

| engine        | behavior                                                                                                                                                                                  |
|---------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `storage`     | (default) rules run in the server process, all reads are pushed down to the topic storage.                                                                                                  |
| `pyspark`     | rules run in the server process on an embedded spark session. counting, criteria assertions and aggregations are still pushed down to the storage; only the full-distribution rules (median / quantile / stdev) are computed on spark, via `SparkTopicDataService.find_distribution_frame` (see `watchmen-data-kernel` `watchmen_data_kernel.spark`). |
| `spark_submit` | the server locks the topic (see job locks below) and submits one `spark-submit` job per topic to an external spark cluster, where `watchmen_dqc/monitor/spark/spark_executor.py` runs the same rules. |

Manual triggering through `GET /dqc/monitor/rules/run` follows the same engine and is guarded by
the same job lock, it returns immediately after the tasks are submitted to background threads.

## Spark acceleration design

`SparkTopicDataService` (in `watchmen-data-kernel`) is a delegate-first decorator of a topic data
service: ordinary reads keep the exact semantics of the storage engine, and only
`find_distribution_frame(criteria, column_names)` loads data into spark — just the requested
columns, within the given criteria (usually the monitored date range), into an explicit
string-typed frame. Consumers cast to the expected type themselves. pyspark is imported lazily.

## Spark submit deployment

- The watchmen python sources are zipped and distributed via `--py-files` automatically, when the
  server runs from a monorepo checkout (a `packages/` directory is found). When the server is
  pip-installed, no bundle is built and **watchmen packages must be installed on the spark driver
  and every worker node**.
- `spark.driver.extraClassPath`-style hacks are not used; credentials never appear on the command
  line. `META_STORAGE_*` / `WATCHMEN_*` environment variables are written into a 0600 temp file,
  distributed via `--files` and loaded by the executor before any watchmen import.
- Additional python paths (native libraries that cannot be zipped) must be provided through
  `MONITOR_SPARK_PYTHON_PATH` and must exist with the same path on every worker node.

## Settings

| setting                          | default                                  | description                                                                    |
|----------------------------------|------------------------------------------|--------------------------------------------------------------------------------|
| `MONITOR_JOBS`                   | `false`                                  | enable the scheduled monitor jobs.                                              |
| `MONITOR_RULES_RUNNER_ENGINE`    | `storage`                                | `storage` / `pyspark` / `spark_submit`.                                         |
| `MONITOR_SPARK_SUBMIT_COMMAND`   | `spark-submit`                           | the spark-submit executable.                                                    |
| `MONITOR_SPARK_SUBMIT_ARGS`      | `--master local[*] --deploy-mode client` | extra spark-submit arguments.                                                   |
| `MONITOR_SPARK_SUBMIT_TIMEOUT`   | `3600`                                   | max seconds to wait for one spark-submit process.                               |
| `MONITOR_SPARK_PYTHON_PATH`      | empty                                    | extra python paths (os.pathsep separated), must exist on every worker node.      |
| `MONITOR_SPARK_PYTHON`           | empty                                    | python executable on worker nodes; empty uses the worker default python.         |
| `MONITOR_JOB_LOCK_STALE_SECONDS` | `86400`                                  | a job lock stuck in ready status longer than this is reclaimed by the next run.  |
| `MONITOR_JOB_TRIGGER`            | `cron`                                   | apscheduler trigger of the scheduled jobs.                                       |
| `MONITOR_JOB_DAILY_*`            | `mon-sun`, 0h 1m                         | daily job schedule.                                                              |
| `MONITOR_JOB_WEEKLY_*`           | `sun`, 0h 1m                             | weekly job schedule.                                                             |
| `MONITOR_JOB_MONTHLY_*`          | day 1, 0h 1m                             | monthly job schedule.                                                            |
| `MONITOR_RESULT_PIPELINE_ASYNC`  | `false`                                  | trigger result pipelines asynchronously when no event loop runs on current thread.|

## Job locks

Every scheduled or manual run locks `(tenant, topic, frequency, process_date)` in
`monitor_job_locks` before executing, so the same scope never runs twice. A lock stuck in
`ready` status longer than `MONITOR_JOB_LOCK_STALE_SECONDS` (e.g. left by a crashed server or a
killed spark-submit) is reclaimed by the next run.
