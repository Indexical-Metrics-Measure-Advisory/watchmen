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
			'auto_refresh_interval': subject.autoRefreshInterval,
			'report_ids': subject.reportIds,
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
			autoRefreshInterval=row.get('auto_refresh_interval'),
			reportIds=row.get('report_ids'),
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

	def get_tuple_id_column_name(self) -> str:
		return 'subject_id'

	def get_tuple_id(self, a_tuple: Subject) -> SubjectId:
		return a_tuple.subjectId

	def set_tuple_id(self, a_tuple: Subject, tuple_id: SubjectId) -> Subject:
		a_tuple.subjectId = tuple_id
		return a_tuple
