from watchmen_auth import PrincipalService
from watchmen_collector_batch.model import DataShard
from watchmen_meta.common import TupleService, TupleShaper
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Storable
from watchmen_storage import EntityName, EntityRow, EntityShaper, TransactionalStorageSPI, SnowflakeGenerator


class DataShardShaper(EntityShaper):
    def serialize(self, entity: DataShard) -> EntityRow:
        return TupleShaper.serialize_tenant_based(entity,
                                                  {
                                                      'shard_id': entity.shardId,
                                                      'name': entity.Name,
                                                      'table_name': entity.tableName,
                                                      'start_id': entity.startId,
                                                      'end_id': entity.endId,
                                                      'status': entity.status,
                                                      'result': entity.result,
                                                      'type': entity.type
                                                  })
    
    def deserialize(self, row: EntityRow) -> DataShard:
        # noinspection PyTypeChecker
        return TupleShaper.deserialize_tenant_based(row,
                                                    DataShard(
                                                        shardId=row.get('shard_id'),
                                                        name=row.get('name'),
                                                        tableName=row.get('table_name'),
                                                        startId=row.get('start_id'),
                                                        endId=row.get('end_id'),
                                                        status=row.get('status'),
                                                        result=row.get('result'),
                                                        type=row.get('type')
                                                    ))


COLLECTOR_BATCH_DATA_SHARD_TABLE = 'collector_batch_data_shard'
COLLECTOR_BATCH_DATA_SHARD_ENTITY_SHAPER = DataShardShaper()


class DataShardService(TupleService):
    
    def should_record_operation(self) -> bool:
        return False
    
    def get_entity_name(self) -> EntityName:
        return COLLECTOR_BATCH_DATA_SHARD_TABLE
    
    def get_entity_shaper(self) -> EntityShaper:
        return COLLECTOR_BATCH_DATA_SHARD_ENTITY_SHAPER
    
    # noinspection SpellCheckingInspection
    def get_storable_id_column_name(self) -> EntityName:
        return 'shard_id'
    
    # noinspection SpellCheckingInspection
    def get_storable_id(self, storable: DataShard) -> StorableId:
        # noinspection PyTypeChecker
        return storable.shardId
    
    # noinspection SpellCheckingInspection
    def set_storable_id(self, storable: DataShard, storable_id: int) -> Storable:
        storable.shardId = storable_id
        return storable
    
    def create_shard(self, record: DataShard) -> None:
        self.begin_transaction()
        try:
            self.create(record)
            self.commit_transaction()
        except Exception as e:
            self.rollback_transaction()
            raise e
        finally:
            self.close_transaction()


def get_data_shard_service(storage: TransactionalStorageSPI,
                           snowflake_generator: SnowflakeGenerator,
                           principal_service: PrincipalService
                           ) -> DataShardService:
    return DataShardService(storage, snowflake_generator, principal_service)
