from typing import List, Optional

from watchmen_meta_service.common import TupleService, TupleShaper
from watchmen_model.common import DataPage, ExternalWriterId, Pageable, TenantId
from watchmen_model.system import ExternalWriter
from watchmen_storage import EntityCriteriaExpression, EntityCriteriaOperator, EntityFinder, EntityPager, EntityRow, \
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

	def get_tuple_id(self, a_tuple: ExternalWriter) -> ExternalWriterId:
		return a_tuple.writerId

	def set_tuple_id(self, a_tuple: ExternalWriter, tuple_id: ExternalWriterId) -> ExternalWriter:
		a_tuple.writerId = tuple_id
		return a_tuple

	def get_tuple_id_column_name(self) -> str:
		return 'writer_id'

	def find_external_writers_by_text(
			self, text: Optional[str], tenant_id: Optional[TenantId], pageable: Pageable) -> DataPage:
		criteria = []
		if text is not None and len(text.strip()) != 0:
			criteria.append(EntityCriteriaExpression(name='name', operator=EntityCriteriaOperator.LIKE, value=text))
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(name='tenant_id', value=tenant_id))
		return self.storage.page(EntityPager(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=criteria,
			pageable=pageable
		))

	def find_external_writers(self, tenant_id: Optional[TenantId]) -> List[ExternalWriter]:
		criteria = []
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(name='tenant_id', value=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(EntityFinder(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=criteria
		))
