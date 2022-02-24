from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.common import DataPage, ExternalWriterId, Pageable, TenantId
from watchmen_model.system import ExternalWriter
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaOperator, EntityRow, \
	EntityShaper


class ExternalWriterShaper(EntityShaper):
	def serialize(self, external_writer: ExternalWriter) -> EntityRow:
		return TupleShaper.serialize_tenant_based(external_writer, {
			'writer_id': external_writer.writerId,
			'writer_code': external_writer.writerCode,
			'type': external_writer.type,
			'pat': external_writer.pat,
			'url': external_writer.url
		})

	def deserialize(self, row: EntityRow) -> ExternalWriter:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, ExternalWriter(
			writerId=row.get('writer_id'),
			writerCode=row.get('writer_code'),
			type=row.get('type'),
			pat=row.get('pat'),
			url=row.get('url')
		))


EXTERNAL_WRITER_ENTITY_NAME = 'external_writers'
EXTERNAL_WRITER_ENTITY_SHAPER = ExternalWriterShaper()


class ExternalWriterService(TupleService):
	def get_entity_name(self) -> str:
		return EXTERNAL_WRITER_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return EXTERNAL_WRITER_ENTITY_SHAPER

	def get_storable_id(self, storable: ExternalWriter) -> ExternalWriterId:
		return storable.writerId

	def set_storable_id(self, storable: ExternalWriter, storable_id: ExternalWriterId) -> ExternalWriter:
		storable.writerId = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'writer_id'

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

	def find_all(self, tenant_id: Optional[TenantId]) -> List[ExternalWriter]:
		criteria = []
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria))
