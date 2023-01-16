from watchmen_model.common import Auditable


class CollectorChangeRecord(Auditable):
	recordId: str
	modelName: str
	tableName: str
	uniqueKeyValue: str

