from datetime import datetime
from typing import List, Optional, Union

from watchmen_meta_service.common import AuditableShaper, LastVisitShaper, TupleNotFoundException, \
	UserBasedTupleService, UserBasedTupleShaper
from watchmen_model.common import ConnectedSpaceId, SubjectId, TenantId, UserId
from watchmen_model.console import Subject, SubjectDataset
from watchmen_storage import EntityCriteriaExpression, EntityRow, EntityShaper, TooManyEntitiesFoundException


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
			'dataset': SubjectDataset.serialize_dataset(subject.dataset)
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

	# noinspection DuplicatedCode
	def find_tenant_id(self, subject_id: SubjectId) -> Optional[TenantId]:
		finder = self.get_entity_finder_for_columns(
			criteria=[
				EntityCriteriaExpression(name=self.get_storable_id_column_name(), value=subject_id),
			],
			distinctColumnNames=['tenant_id']
		)
		rows = self.storage.find_distinct_values(finder)
		count = len(rows)
		if count == 0:
			return None
		elif count == 1:
			return rows[0].get('tenant_id')
		else:
			raise TooManyEntitiesFoundException(f'Too many entities found by finder[{finder}].')

	def find_by_connect_id(self, connect_id: ConnectedSpaceId) -> List[Subject]:
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(
			criteria=[
				EntityCriteriaExpression(name='connect_id', value=connect_id)
			]
		))

	def update_name(self, subject_id: SubjectId, name: str, user_id: UserId, tenant_id: TenantId) -> datetime:
		"""
		update name will not increase optimistic lock version
		"""
		last_modified_at = self.now()
		last_modified_by = self.principal_service.get_user_id()
		updated_count = self.storage.update_only(self.get_entity_updater(
			criteria=[
				EntityCriteriaExpression(name=self.get_storable_id_column_name(), value=subject_id),
				EntityCriteriaExpression(name='user_id', value=user_id),
				EntityCriteriaExpression(name='tenant_id', value=tenant_id)
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
