from sqlalchemy import text

from watchmen_model.admin import Topic
from watchmen_storage import as_table_name
from watchmen_storage_mysql.storage_mysql import StorageMySQL, TopicDataStorageMySQL
from .table_creator import (
    build_table_script, build_columns_script,
    build_indexes_script, build_unique_indexes_script,
)


class StorageTDSQL(StorageMySQL):
    """
    TDSQL MySQL 版存储实例。

    TDSQL MySQL 版是分布式数据库，建表时需要指定分片键。
    继承 MySQL 的所有 CRUD 实现，主要差异在 DDL 生成。
    """

    def __init__(self, engine, sharding_type: str = 'HASH'):
        super().__init__(engine)
        self.sharding_type = sharding_type


class TopicDataStorageTDSQL(StorageTDSQL, TopicDataStorageMySQL):
    """
    TDSQL MySQL 版 Topic 数据存储。

    分片键由 Topic.factors 中的 keyType=PARTITION 字段自动推导（参见 pick_shardkey）。
    重写 DDL 生成方法，添加分片键配置：
    - create_topic_entity: 生成带 SHARDKEY 的建表语句
    - update_topic_entity: 复用 MySQL 的列变更逻辑
    """

    # noinspection SqlResolve
    def create_topic_entity(self, topic: Topic) -> None:
        from logging import getLogger
        logger = getLogger(__name__)
        try:
            self.connect()
            # 不显式传 sharding_column，由 pick_shardkey 从 topic.factors 推导
            script = build_table_script(topic, sharding_type=self.sharding_type)
            self.connection.execute(text(script))
        except Exception as e:
            logger.error(e, exc_info=True, stack_info=True)
        finally:
            self.close()

    # noinspection DuplicatedCode
    def update_topic_entity(self, topic: Topic, original_topic: Topic) -> None:
        from logging import getLogger
        logger = getLogger(__name__)
        try:
            self.connect()
            entity_name = as_table_name(topic)
            self.connection.execute(text(f"CALL DROP_INDEXES_ON_TOPIC_CHANGED('{entity_name}')"))
            # 变更列定义
            for column_script in build_columns_script(topic, original_topic):
                try:
                    self.connection.execute(text(column_script))
                except Exception as e:
                    logger.error(e, exc_info=True, stack_info=True)
            # 重建唯一索引（必须包含 shardkey）
            for unique_index_script in build_unique_indexes_script(topic):
                try:
                    self.connection.execute(text(unique_index_script))
                except Exception as e:
                    logger.error(e, exc_info=True, stack_info=True)
            # 重建普通索引
            for index_script in build_indexes_script(topic):
                try:
                    self.connection.execute(text(index_script))
                except Exception as e:
                    logger.error(e, exc_info=True, stack_info=True)
            # 确保 tenant_id_ 和常用时间字段有索引
            for idx_col in ['tenant_id_', 'insert_time_', 'update_time_']:
                try:
                    self.connection.execute(text(f'ALTER TABLE {as_table_name(topic)} ADD INDEX ({idx_col})'))
                except Exception as e:
                    logger.error(e, exc_info=True, stack_info=True)
        except Exception as e:
            logger.error(e, exc_info=True, stack_info=True)
        finally:
            self.close()