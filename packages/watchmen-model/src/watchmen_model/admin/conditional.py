from watchmen_model.common import DataModel, ParameterJoint


class Conditional(DataModel):
	conditional: bool = None
	on: ParameterJoint = None
