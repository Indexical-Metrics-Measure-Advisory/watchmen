from base64 import b64decode, b64encode
from typing import List, Optional

from watchmen_meta.common import ask_datasource_aes_enabled, ask_datasource_aes_params, TupleService, TupleShaper
from watchmen_model.common import DataPage, DataSourceId, Pageable, TenantId
from watchmen_model.system import DataSource, DataSourceParam
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaOperator, EntityRow, \
	EntityShaper
from watchmen_utilities import ArrayHelper, is_empty


class DataSourceShaper(EntityShaper):
	def __init__(self):
		key, iv = ask_datasource_aes_params()
		self.aes_key = None if is_empty(key) else key.encode('utf-8')
		self.aes_iv = None if is_empty(iv) else iv.encode('utf-8')

	def ask_aes(self):
		from Crypto.Cipher import AES
		return AES.new(self.aes_key, AES.MODE_CFB, self.aes_iv)

	@staticmethod
	def serialize_param(param: Optional[DataSourceParam]) -> Optional[dict]:
		if param is None:
			return None
		if isinstance(param, dict):
			return param
		else:
			return param.to_dict()

	@staticmethod
	def serialize_params(params: Optional[List[DataSourceParam]]) -> Optional[list]:
		if params is None:
			return None
		return ArrayHelper(params).map(lambda x: DataSourceShaper.serialize_param(x)).to_list()

	def encrypt_pwd(self, pwd: Optional[str]) -> str:
		if not ask_datasource_aes_enabled() or is_empty(str):
			return pwd
		else:
			return '{AES}' + b64encode(self.ask_aes().encrypt(pwd.encode('utf-8'))).decode()

	def decrypt_pwd(self, pwd: Optional[str]) -> str:
		if not ask_datasource_aes_enabled() or is_empty(str):
			return pwd
		elif not pwd.startswith('{AES}'):
			return pwd
		else:
			return self.ask_aes().decrypt(b64decode(pwd[5:])).decode('utf-8')

	def serialize(self, data_source: DataSource) -> EntityRow:
		return TupleShaper.serialize_tenant_based(data_source, {
			'data_source_id': data_source.dataSourceId,
			'data_source_code': data_source.dataSourceCode,
			'data_source_type': data_source.dataSourceType,
			'host': data_source.host,
			'port': data_source.port,
			'username': data_source.username,
			'password': self.encrypt_pwd(data_source.password),
			'name': data_source.name,
			'url': data_source.url,
			'params': DataSourceShaper.serialize_params(data_source.params)
		})

	def deserialize(self, row: EntityRow) -> DataSource:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, DataSource(
			dataSourceId=row.get('data_source_id'),
			dataSourceCode=row.get('data_source_code'),
			dataSourceType=row.get('data_source_type'),
			host=row.get('host'),
			port=row.get('port'),
			username=row.get('username'),
			password=self.decrypt_pwd(row.get('password')),
			name=row.get('name'),
			url=row.get('url'),
			params=row.get('params')
		))


DATA_SOURCE_ENTITY_NAME = 'data_sources'
DATA_SOURCE_ENTITY_SHAPER = DataSourceShaper()


class DataSourceService(TupleService):
	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> str:
		return DATA_SOURCE_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return DATA_SOURCE_ENTITY_SHAPER

	def get_storable_id(self, storable: DataSource) -> DataSourceId:
		return storable.dataSourceId

	def set_storable_id(self, storable: DataSource, storable_id: DataSourceId) -> DataSource:
		storable.dataSourceId = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'data_source_id'

	# noinspection DuplicatedCode
	def find_by_text(
			self, text: Optional[str], tenant_id: Optional[TenantId], pageable: Pageable) -> DataPage:
		criteria = []
		if text is not None and len(text.strip()) != 0:
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='name'), operator=EntityCriteriaOperator.LIKE, right=text))
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		return self.storage.page(self.get_entity_pager(criteria, pageable))

	def find_all(self, tenant_id: Optional[TenantId]) -> List[DataSource]:
		criteria = []
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria))
