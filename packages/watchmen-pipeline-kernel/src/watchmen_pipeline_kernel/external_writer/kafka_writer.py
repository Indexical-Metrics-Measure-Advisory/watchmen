import asyncio
from logging import getLogger
from typing import Dict

from aiokafka import AIOKafkaProducer
from aiokafka.errors import KafkaError

from watchmen_data_kernel.external_writer import BuildExternalWriter, ExternalWriter, ExternalWriterParams
from watchmen_pipeline_kernel.common import PipelineKernelException
from watchmen_utilities import is_not_blank, serialize_to_json, run

logger = getLogger(__name__)


class AsyncKafkaProducer:
    
    _instances: Dict[str, AIOKafkaProducer] = {}
    _lock = False
    
    @classmethod
    async def get_instance(cls, bootstrap_servers: str) -> AIOKafkaProducer:

        if bootstrap_servers in cls._instances:
            return cls._instances[bootstrap_servers]
        
        while cls._lock:
            await asyncio.sleep(0.01)
        
        cls._lock = True
        try:
            if bootstrap_servers not in cls._instances:
                producer = AIOKafkaProducer(
                    bootstrap_servers=bootstrap_servers,
                    client_id="watchmen-pipeline",
                    value_serializer=lambda v: serialize_to_json(v).encode('utf-8')
                )
                await producer.start()
                cls._instances[bootstrap_servers] = producer
                logger.info(f"Kafka producer initialized for brokers: {bootstrap_servers}")
            return cls._instances[bootstrap_servers]
        finally:
            cls._lock = False
    
    @classmethod
    async def close_instance(cls, bootstrap_servers: str = None):
        if bootstrap_servers:
            if bootstrap_servers in cls._instances:
                await cls._instances[bootstrap_servers].stop()
                del cls._instances[bootstrap_servers]
                logger.info(f"Kafka producer closed for brokers: {bootstrap_servers}")
        else:
            for broker, producer in cls._instances.items():
                await producer.stop()
                logger.info(f"Kafka producer closed for brokers: {broker}")
            cls._instances.clear()
      
    
class KafkaExternalWriter(ExternalWriter):
    
    async def do_run(self, params: ExternalWriterParams) -> None:
        if not params.url or not params.url.startswith("kafka://"):
            raise PipelineKernelException(
                f"Invalid Kafka URL format: {params.url}. Use 'kafka://broker1:9092,broker2:9092'")
        
        brokers = params.url[len("kafka://"):].strip()
        
        current_data = params.currentData
        if not current_data:
            raise PipelineKernelException(
                "Fire Kafka external writer when current data is none is not supported.")
        
        topic = params.pat.strip() if is_not_blank(params.pat) else None
        if not topic:
            raise PipelineKernelException("Kafka topic name cannot be empty (check 'pat' parameter)")

        try:
            producer = await AsyncKafkaProducer.get_instance(brokers)
            
            future = await producer.send(
                topic=topic,
                value=current_data
            )
            record_metadata = await future
            logger.info(f"message send successfully: "
                        f"topic={record_metadata.topic}, "
                        f"partition={record_metadata.partition}, "
                        f"offset={record_metadata.offset}")
            
        except KafkaError as e:
            raise PipelineKernelException(f"Kafka message delivery failed: {str(e)}")
        except Exception as e:
            raise PipelineKernelException(f"Unexpected error when sending to Kafka: {str(e)}")

    def run(self, params: ExternalWriterParams) -> bool:
        run(self.do_run(params))
        return True
    

def create_kafka_writer(code: str) -> KafkaExternalWriter:
    return KafkaExternalWriter(code)


def register_kafka_writer() -> BuildExternalWriter:
    return create_kafka_writer
