from watchmen_dqc.monitor import create_periodic_monitor_jobs, shutdown_periodic_monitor_jobs


def init_monitor_jobs() -> None:
	create_periodic_monitor_jobs()


def shutdown_monitor_jobs() -> None:
	shutdown_periodic_monitor_jobs()
