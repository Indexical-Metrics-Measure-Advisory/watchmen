import argparse
import os
import sys
from datetime import datetime


def load_env_file(env_file_name: str) -> None:
	"""
	load environment variables from the file distributed by spark --files,
	must be invoked BEFORE importing any watchmen module,
	since watchmen settings are resolved from environment variables on import.
	"""
	try:
		from pyspark import SparkFiles
		env_file_path = SparkFiles.get(env_file_name)
	except ImportError:
		# pyspark is unavailable (e.g. running locally without spark), try current directory
		env_file_path = env_file_name
	if not os.path.exists(env_file_path):
		print(f"Env file[{env_file_path}] not found, watchmen settings will rely on existing environment.")
		return
	with open(env_file_path, "r") as f:
		for line in f:
			line = line.strip()
			if len(line) == 0 or line.startswith("#") or "=" not in line:
				continue
			key, _, value = line.partition("=")
			os.environ[key.strip()] = value.strip()
	print(f"Env file[{env_file_name}] loaded.")


def parse_args() -> argparse.Namespace:
	parser = argparse.ArgumentParser(description='Watchmen DQC Spark Executor')
	parser.add_argument('--tenant-id', required=True, help='Tenant ID')
	parser.add_argument('--topic-id', required=True, help='Topic ID to monitor')
	parser.add_argument('--frequency', required=True, choices=['daily', 'weekly', 'monthly'],
		help='Monitor frequency')
	parser.add_argument('--process-date', required=True, help='Process date in YYYY-MM-DD format')
	parser.add_argument('--env-file', required=False,
		help='Environment file name distributed by spark --files')
	return parser.parse_args()


def run_spark_dqc(tenant_id: str, topic_id: str, frequency: str, process_date_str: str) -> None:
	# imports must be done after environment variables are loaded
	try:
		from watchmen_auth import fake_tenant_admin
		from watchmen_dqc.monitor.rules_runner import create_monitor_rules_runner
		from watchmen_model.dqc import MonitorRuleStatisticalInterval
	except ImportError as e:
		print(f"Import Error: {e}. Please ensure watchmen packages are in PYTHONPATH or passed via --py-files.")
		sys.exit(1)

	# force engine to pyspark inside spark executor
	os.environ["MONITOR_RULES_RUNNER_ENGINE"] = "pyspark"

	print(f"Starting Spark DQC Executor for Tenant[{tenant_id}], Topic[{topic_id}], Frequency[{frequency}]")

	process_date = datetime.strptime(process_date_str, '%Y-%m-%d').date()
	freq = MonitorRuleStatisticalInterval(frequency.lower())

	# fake a tenant admin principal
	principal_service = fake_tenant_admin(tenant_id)

	runner = create_monitor_rules_runner(principal_service)
	runner.run(process_date, topic_id=topic_id, frequency=freq)

	print("Spark DQC Execution Finished Successfully.")


if __name__ == "__main__":
	args = parse_args()
	if args.env_file:
		load_env_file(args.env_file)
	try:
		run_spark_dqc(args.tenant_id, args.topic_id, args.frequency, args.process_date)
	except Exception as e:
		print(f"Error during Spark DQC execution: {e}")
		sys.exit(1)
