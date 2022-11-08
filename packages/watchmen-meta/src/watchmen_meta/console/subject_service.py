from datetime import datetime
from typing import List, Optional, Union

from watchmen_meta.common import AuditableShaper, LastVisitShaper, TupleNotFoundException, UserBasedTupleService, \
	UserBasedTupleShaper
from watchmen_model.common import ConnectedSpaceId, SubjectId, TenantId, UserId
from watchmen_model.console import Subject, SubjectDataset
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaOperator, EntityRow, \
	EntityShaper


class SubjectShaper(EntityShaper):
	@staticmethod
	def serialize_dataset(dataset: Optional[Union[dict, SubjectDataset]]) -> Optional[dict]:
		if dataset is None:
			return None
		elif isinstance(dataset, dict):
			return dataset
		else:
			return dataset.dict()

	def serialize(self, subject: Subject) -> EntityRow:
		row = {
			'subject_id': subject.subjectId,
			'name': subject.name,
			'connect_id': subject.connectId,
			'auto_refresh_interval': subject.autoRefreshInterval,
			'dataset': SubjectShaper.serialize_dataset(subject.dataset)
		}
		row = AuditableShaper.serialize(subject, row)
		row = UserBasedTupleShaper.serialize(subject, row)
		row = LastVisitShaper.serialize(subject, row)
		return row

	def deserialize(self, row: EntityRow) -> Subject:
		subject = Subject(
			subjectId=row.get('subject_id'),
			name=row.get('name'),
			connectId=row.get('connect_id'),
			autoRefreshInterval=row.get('auto_refresh_interval'),
			dataset=row.get('dataset')
		)
		# noinspection PyTypeChecker
		subject: Subject = AuditableShaper.deserialize(row, subject)
		# noinspection PyTypeChecker
		subject: Subject = UserBasedTupleShaper.deserialize(row, subject)
		# noinspection PyTypeChecker
		subject: Subject = LastVisitShaper.deserialize(row, subject)
		return subject


SUBJECT_ENTITY_NAME = 'subjects'
SUBJECT_ENTITY_SHAPER = SubjectShaper()


class SubjectService(UserBasedTupleService):
	def get_entity_name(self) -> str:
		return SUBJECT_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return SUBJECT_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> str:
		return 'subject_id'

	def get_storable_id(self, storable: Subject) -> SubjectId:
		return storable.subjectId

	def set_storable_id(self, storable: Subject, storable_id: SubjectId) -> Subject:
		storable.subjectId = storable_id
		return storable

	def should_record_operation(self) -> bool:
		return True

	def find_by_name(self, name: str) -> Optional[Subject]:
		return self.storage.find_one(self.get_entity_finder(
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='name'), right=name)
			]
		))

	def find_by_text(self, text: Optional[str], tenant_id: Optional[TenantId]) -> List[Subject]:
		criteria = []
		if text is not None and len(text.strip()) != 0:
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='name'), operator=EntityCriteriaOperator.LIKE, right=text))
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))

	def find_by_connect_id(self, connect_id: ConnectedSpaceId) -> List[Subject]:
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='connect_id'), right=connect_id)
			]
		))

	# noinspection DuplicatedCode
	def update_name(self, subject_id: SubjectId, name: str, user_id: UserId, tenant_id: TenantId) -> datetime:
		"""
		update name will not increase optimistic lock version
		"""
		last_modified_at = self.now()
		last_modified_by = self.principalService.get_user_id()
		updated_count = self.storage.update_only(self.get_entity_updater(
			criteria=[
				EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName=self.get_storable_id_column_name()), right=subject_id),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='user_id'), right=user_id),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)
			],
			update={
				'name': name,
				'last_modified_at': last_modified_at,
				'last_modified_by': last_modified_by
			}
		))
		if updated_count == 0:
			raise TupleNotFoundException('Update 0 row might be caused by tuple not found.')
		return last_modified_at

	def update_last_visit_time(self, subject_id: SubjectId) -> datetime:
		now = self.now()
		self.storage.update(self.get_entity_updater(
			criteria=[EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName=self.get_storable_id_column_name()), right=subject_id)],
			update={'last_visit_time': now}
		))
		return now

	def delete_by_connect_id(self, connect_id: ConnectedSpaceId) -> List[Subject]:
		# noinspection PyTypeChecker
		return self.storage.delete_and_pull(self.get_entity_deleter(
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='connect_id'), right=connect_id)
			]
		))

	# noinspection DuplicatedCode
	def find_all(self, tenant_id: Optional[TenantId]) -> List[Subject]:
		criteria = []
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))
