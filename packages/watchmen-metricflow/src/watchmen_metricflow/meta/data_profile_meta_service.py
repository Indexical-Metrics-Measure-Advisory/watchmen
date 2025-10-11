from typing import List, Optional, Dict

from watchmen_meta.common import UserBasedTupleService, UserBasedTupleShaper, AuditableShaper, TupleShaper
from watchmen_model.common import TenantId
from watchmen_storage import EntityShaper, EntityRow, EntityCriteriaExpression, ColumnNameLiteral
from ..model.data_profile import DataProfile, DatabaseOutput


class DataProfileShaper(UserBasedTupleShaper):
    """数据配置文件数据塑形器"""

    @staticmethod
    def serialize_database_output(output: DatabaseOutput) -> dict:
        """序列化数据库输出配置"""
        if isinstance(output, dict):
            return output
        else:
            return output.model_dump()

    @staticmethod
    def serialize_database_outputs(outputs: Optional[Dict[str, DatabaseOutput]]) -> Optional[dict]:
        """序列化数据库输出配置字典"""
        if outputs is None:
            return None
        result = {}
        for key, output in outputs.items():
            result[key] = DataProfileShaper.serialize_database_output(output)
        return result

    def serialize(self, data_profile: DataProfile) -> EntityRow:
        """序列化数据配置文件"""
        row = {
            "id": data_profile.id,
            'name': data_profile.name,
            'target': data_profile.target,
            'outputs': DataProfileShaper.serialize_database_outputs(data_profile.outputs),

        }

        row = TupleShaper.serialize_tenant_based(data_profile, row)
        row = AuditableShaper.serialize(data_profile, row)

        return row

    def deserialize(self, row: EntityRow) -> DataProfile:
        """反序列化数据配置文件"""
        data_profile_data = {
            "id": row.get("id"),
            'name': row.get('name'),
            'target': row.get('target'),
            'outputs': row.get('outputs', {}),

        }

        data_profile = DataProfile.model_validate(data_profile_data)
        
        # noinspection PyTypeChecker
        data_profile: DataProfile = AuditableShaper.deserialize(row, data_profile)
        # noinspection PyTypeChecker
        data_profile: DataProfile = TupleShaper.deserialize_tenant_based(row, data_profile)
        return data_profile


DATA_PROFILE_ENTITY_NAME = 'data_profiles'
DATA_PROFILE_ENTITY_SHAPER = DataProfileShaper()


class DataProfileService(UserBasedTupleService):
    """数据配置文件服务"""
    
    def should_record_operation(self) -> bool:
        return False

    def get_entity_name(self) -> str:
        return DATA_PROFILE_ENTITY_NAME

    def get_entity_shaper(self) -> EntityShaper:
        return DATA_PROFILE_ENTITY_SHAPER

    def get_storable_id(self, storable: DataProfile) -> str:
        return storable.name

    def set_storable_id(self, storable: DataProfile, storable_id: str) -> DataProfile:
        storable.name = storable_id
        return storable

    def get_storable_id_column_name(self) -> str:
        return 'name'

    def find_all(self, tenant_id: Optional[TenantId] = None) -> List[DataProfile]:
        """查找所有数据配置文件"""
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))

    def find_by_name(self, name: str, tenant_id: Optional[TenantId] = None) -> Optional[DataProfile]:
        """根据名称查找数据配置文件"""
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        if name is not None and len(name.strip()) != 0:
            criteria.append(EntityCriteriaExpression(
                left=ColumnNameLiteral(columnName='name'), right=name))
        # noinspection PyTypeChecker
        results = self.storage.find(self.get_entity_finder(criteria=criteria))
        return results[0] if results else None

    def find_by_target(self, target: str, tenant_id: Optional[TenantId] = None) -> List[DataProfile]:
        """根据目标查找数据配置文件"""
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        if target is not None and len(target.strip()) != 0:
            criteria.append(EntityCriteriaExpression(
                left=ColumnNameLiteral(columnName='target'), right=target))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))

    def find_by_id(self, profile_id: str, tenant_id: Optional[TenantId] = None) -> Optional[DataProfile]:
        """根据ID查找数据配置文件"""
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        if profile_id is not None and len(profile_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(
                left=ColumnNameLiteral(columnName='id'), right=profile_id))
        # noinspection PyTypeChecker
        results = self.storage.find(self.get_entity_finder(criteria=criteria))
        return results[0] if results else None

    def update_by_name(self, name: str, data_profile: DataProfile) -> DataProfile:
        """根据名称更新数据配置文件"""
        if name is None or len(name.strip()) == 0:
            raise ValueError("name cannot be empty")
        criteria = [
            EntityCriteriaExpression(
                left=ColumnNameLiteral(columnName='name'), right=name)
        ]
        # noinspection PyTypeChecker
        self.storage.update(self.get_entity_updater(criteria=criteria, update=self.get_entity_shaper().serialize(data_profile)))
        return data_profile

    def update_by_id(self, profile_id: str, data_profile: DataProfile) -> DataProfile:
        """根据ID更新数据配置文件"""
        if profile_id is None or len(profile_id.strip()) == 0:
            raise ValueError("profile_id cannot be empty")
        criteria = [
            EntityCriteriaExpression(
                left=ColumnNameLiteral(columnName='id'), right=profile_id)
        ]
        # noinspection PyTypeChecker
        self.storage.update(self.get_entity_updater(criteria=criteria, update=self.get_entity_shaper().serialize(data_profile)))
        return data_profile

    def delete_by_name(self, name: str, tenant_id: Optional[TenantId] = None) -> None:
        """根据名称删除数据配置文件"""
        if name is None or len(name.strip()) == 0:
            raise ValueError("name cannot be empty")
        criteria = [
            EntityCriteriaExpression(
                left=ColumnNameLiteral(columnName='name'), right=name)
        ]
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        # noinspection PyTypeChecker
        self.storage.delete(self.get_entity_deleter(criteria=criteria))

    def delete_by_id(self, profile_id: str, tenant_id: Optional[TenantId] = None) -> None:
        """根据ID删除数据配置文件"""
        if profile_id is None or len(profile_id.strip()) == 0:
            raise ValueError("profile_id cannot be empty")
        criteria = [
            EntityCriteriaExpression(
                left=ColumnNameLiteral(columnName='id'), right=profile_id)
        ]
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        # noinspection PyTypeChecker
        self.storage.delete(self.get_entity_deleter(criteria=criteria))