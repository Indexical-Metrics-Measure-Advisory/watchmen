from typing import Optional, Union

from watchmen_meta_service.common import AuditableShaper, LastVisitShaper, UserBasedTupleService, UserBasedTupleShaper
from watchmen_model.common import SubjectId
from watchmen_model.console import Subject, SubjectDataset
from watchmen_storage import EntityRow, EntityShaper


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
