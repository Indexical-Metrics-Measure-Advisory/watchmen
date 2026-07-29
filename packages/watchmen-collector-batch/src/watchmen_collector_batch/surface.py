import asyncio
from concurrent.futures import ThreadPoolExecutor


kafka_executor = ThreadPoolExecutor(
    max_workers=1,
    thread_name_prefix="kafka-consumer"
)

loop.run_in_executor(kafka_executor, self._run_start_in_background)

class BatchCollectorSurface:

    def __init__(self):
        pass

    # noinspection PyMethodMayBeStatic
    def init_kafka_consumer(self) -> None:
        loop = asyncio.get_running_loop()
        # 把 Kafka Consumer 塞进一个永久运行的线程里
        loop.run_in_executor(executor, start_kafka_consumer)
    

    # noinspection PyMethodMayBeStatic
    def init_clean_up(self, scheduler: JobScheduler) -> None:
        if ask_task_listener_enabled():
            scheduler.init_clean_up_job()

    # noinspection PyMethodMayBeStatic
    def init_collector(self, scheduler: JobScheduler) -> None:
        if ask_query_based_change_data_capture_enabled():
            scheduler.init_collector_jobs()

    # noinspection PyMethodMayBeStatic
    def init_s3_connector(self, scheduler: JobScheduler) -> None:
        if ask_s3_collector_enabled():
            scheduler.init_s3_connector_job()

    # noinspection PyMethodMayBeStatic
    def init_cache_update(self, scheduler: JobScheduler) -> None:
        if ask_collector_cache_heart_beat_enabled():
            scheduler.init_collector_cache_update()

    def init(self) -> None:
        job_scheduler = ask_job_scheduler()
        self.init_task_listener(job_scheduler)
        self.init_clean_up(job_scheduler)
        self.init_collector(job_scheduler)
        self.init_s3_connector(job_scheduler)
        self.init_cache_update(job_scheduler)
        job_scheduler.start()


batch_collector_surface = BatchCollectorSurface()
