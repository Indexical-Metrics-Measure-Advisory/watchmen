from watchmen_model.common import LastVisit
from watchmen_storage import EntityRow


class LastVisitShaper:
	@staticmethod
	def serialize(last_visit: LastVisit, row: EntityRow) -> EntityRow:
		row['last_visit_time'] = last_visit.lastVisitTime
		return row

	@staticmethod
	def deserialize(row: EntityRow, last_visit: LastVisit) -> LastVisit:
		last_visit.lastVisitTime = row.get('last_visit_time')
		return last_visit
