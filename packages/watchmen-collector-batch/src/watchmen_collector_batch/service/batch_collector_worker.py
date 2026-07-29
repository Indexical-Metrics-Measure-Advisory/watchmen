import json
import logging
from typing import List, Dict, Sequence

from confluent_kafka import Consumer, KafkaException
import oracledb

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kafka-worker")


class BatchCollectorWorker:
    
    def __init__(
        self,
        consumer: Consumer,
        worker: BatchCollectorWorker,
        table: str,
        pk: Sequence[str],
        columns: Sequence[str],
    ):
        self.consumer = consumer
        self.writer = writer
        self.table = table
        self.pk = pk
        self.columns = columns

    def run(self) -> None:
        try:
            while True:
                msg = self.consumer.poll(1.0)
                if msg is None:
                    continue

                if msg.error():
                    raise KafkaException(msg.error())

                batch: List[Dict] = json.loads(msg.value())

                success, failures = self.writer.write(
                    table=self.table,
                    pk=self.pk,
                    columns=self.columns,
                    records=batch,
                )

                if failures:
                    logger.error(
                        "batch partially failed",
                        extra={
                            "topic": msg.topic(),
                            "partition": msg.partition(),
                            "offset": msg.offset(),
                            "success": success,
                            "failures": len(failures),
                        },
                    )
                else:
                    logger.info(
                        "batch committed",
                        extra={
                            "topic": msg.topic(),
                            "partition": msg.partition(),
                            "offset": msg.offset(),
                            "rows": success,
                        },
                    )

                self.consumer.commit(msg)

        except KeyboardInterrupt:
            logger.info("kafka worker stopped by user")
        finally:
            self.consumer.close()


def main() -> None:
    consumer = Consumer({
        "bootstrap.servers": "localhost:9092",
        "group.id": "datamo-worker",
        "enable.auto.commit": False,
        "auto.offset.reset": "earliest",
    })

    consumer.subscribe(["datamo.batch.topic"])

    oracle_conn = oracledb.connect(
        user="xxx",
        password="xxx",
        dsn="xxx",
    )

    writer = OracleBatchWriter(oracle_conn, batch_size=500)

    worker = KafkaWorker(
        consumer=consumer,
        writer=writer,
        table="mart_gl_entry",
        pk="case_id",
        columns=["case_id", "amount", "status"],
    )

    worker.run()


if __name__ == "__main__":
    main()