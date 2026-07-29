import hashlib
import json
import logging
import re
import signal
import sys
import time
import traceback
from datetime import datetime
from typing import List

from confluent_kafka import Consumer, TopicPartition, KafkaError, Producer

logger = logging.getLogger("kafka-worker")


def on_assign(consumer: Consumer, partitions: List[TopicPartition]) -> None:
    topics = {p.topic for p in partitions}

    logger.info(
        "partitions assigned",
        extra={
            "count": len(partitions),
            "topics": sorted(topics),
        },
    )

    # 可选：按 topic 初始化状态
    for topic in topics:
        if not topic.startswith("table_"):
            logger.warning("unexpected topic assigned", extra={"topic": topic})

def on_revoke(consumer: Consumer, partitions: List[TopicPartition]) -> None:
    logger.warning(
        "partitions revoked, flushing",
        extra={
            "count": len(partitions),
            "topics": list({p.topic for p in partitions}),
        },
    )

    try:
        # ✅ 关键：在失去 partition 前提交 offset
        consumer.commit(asynchronous=False)

        # ✅ 如果你有内存 buffer / batch writer
        # flush_buffers()

    except Exception as e:
        logger.error(
            "failed to commit before revoke",
            extra={"err": str(e)},
            exc_info=True,
        )


def validate_topic_pattern(pattern: str) -> None:
    if not pattern.startswith("^table_"):
        raise ValueError(f"invalid topic pattern: {pattern}")
    try:
        re.compile(pattern)
    except re.error:
        raise ValueError(f"invalid regex: {pattern}")
    
    
def start_kafka_consumer():
    
    consumer = Consumer({
        "bootstrap.servers": "localhost:9092",
        "group.id": "Batch-Collector-worker",
        "enable.auto.commit": False,
        "auto.offset.reset": "earliest",
        "session.timeout.ms": 30000,
        "max.poll.interval.ms": 300000,
    })
    
    metadata = consumer.list_topics(timeout=10)
    matching = [t for t in metadata.topics if re.match(r"^table_.*", t)]
    if not matching:
        logger.error("no matching topics found for pattern ^table_.*")
    
    consumer.subscribe(
        topics=[r"^table_.*"],
        on_assign=on_assign,
        on_revoke=on_revoke,
    )
    
    def on_shutdown(signum, frame):
        consumer.close()
        DLQ_PRODUCER.flush(30)
        sys.exit(0)
    
    signal.signal(signal.SIGINT, on_shutdown)
    signal.signal(signal.SIGTERM, on_shutdown)
    
    while True:
        msg = consumer.poll(1.0)
        if msg is None:
            continue
        if msg.error():
            if msg.error().code() == KafkaError._PARTITION_EOF:
                continue
            logger.error("kafka error", extra={"err": msg.error().str()})
            continue
        
        try:
            process(msg)
            consumer.commit(msg)
        except Exception as e:
            logger.exception("process failed", exc_info=e)
            write_to_dlq(msg)
            consumer.commit(msg)


DLQ_TOPIC = "datamo.fullload.dlq"

DLQ_PRODUCER = Producer({
    "bootstrap.servers": "broker1:9092",
    "acks": "all",
    "enable.idempotence": True,
    "retries": 10,
    "delivery.timeout.ms": 120000,
    "linger.ms": 10,
})

MAX_DLQ_RETRY = 3


def _dlq_delivery_report(err, msg):
    """
    Callback invoked by confluent-kafka-producer after send attempt.
    MUST NOT raise exception.
    """
    meta = {
        "event": "dlq.delivery",
        "topic": msg.topic(),
        "partition": msg.partition(),
        "offset": msg.offset(),
        "key": msg.key().decode("utf-8", errors="replace") if msg.key() else None,
    }

    if err:
        # ❌ DLQ 写入失败（Broker 拒绝 / 超时 / 不可达）
        logger.error(
            "dlq delivery failed",
            extra={
                **meta,
                "error_code": err.code(),
                "error_str": err.str(),
            },
            exc_info=False,  # 避免堆栈刷屏
        )

        # ✅ 这里可以：
        # - 增加 Prometheus counter
        # - 触发告警（PagerDuty）
        # - 记录到本地 metrics（内存）
        #
        # ❌ 不要：
        # - raise
        # - 尝试再次 produce（会造成递归）
        # - 写文件（你之前已经否定）

        return

    # ✅ DLQ 写入成功
    logger.info(
        "dlq delivery succeeded",
        extra={
            **meta,
            "high_watermark": msg.offset(),
        },
    )

def write_to_dlq(msg, err: Exception, consumer_group: str, retry_count: int = 0):
    
    payload = {
        "origin_topic": msg.topic(),
        "origin_partition": msg.partition(),
        "origin_offset": msg.offset(),
        "origin_key": msg.key().decode("utf-8") if msg.key() else None,
        "origin_value": msg.value().decode("utf-8", errors="replace") if msg.value() else None,
        
        "consumer_group": consumer_group,
        "retry_count": retry_count,

        "error_class": type(err).__name__,
        "error_message": str(err),
        "stack_trace": traceback.format_exc(limit=20),  # 截断，防过大
        
        "occurred_at": datetime.utcnow().isoformat() + "Z",
    }
    
    value_bytes = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    key_bytes = f"{msg.topic()}-{msg.offset()}".encode("utf-8")
    
    for attempt in range(1, MAX_DLQ_RETRY + 1):
        try:
            DLQ_PRODUCER.produce(
                topic=DLQ_TOPIC,
                key=key_bytes,
                value=value_bytes,
                on_delivery=_dlq_delivery_report,
            )
            DLQ_PRODUCER.poll(0)
            
            logger.info(
                "dlq sent",
                extra={
                    "event": "dlq.sent",
                    "origin_topic": msg.topic(),
                    "origin_offset": msg.offset(),
                    "value_size": len(msg.value() or b""),
                    "value_sha256": sha256_of_bytes(msg.value()),
                },
            )
            
            return  # 成功即退出
        except Exception as dlq_err:
            # 记录并尝试继续
            print(
                f"[WARN] DLQ produce attempt {attempt} failed: {dlq_err}"
            )
            if attempt < MAX_DLQ_RETRY:
                time.sleep(0.5 * attempt)  # 简单线性退避
            else:
                logger.error(
                    "dlq send failed",
                    extra={
                        "event": "dlq.failure",
                        "origin_topic": msg.topic(),
                        "origin_offset": msg.offset(),
                        "value_size": len(msg.value() or b""),
                        "value_sha256": sha256_of_bytes(msg.value()),
                        "error": str(dlq_err),
                    },
                    exc_info=True,
                )


def sha256_of_bytes(b: bytes) -> str:
    h = hashlib.sha256()
    h.update(b)
    return h.hexdigest()[:16]