from watchmen_model.common import Storable


class Dependency(Storable):
	model_name: str
	object_id: str
