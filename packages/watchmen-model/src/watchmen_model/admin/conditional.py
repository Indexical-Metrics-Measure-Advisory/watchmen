from typing import Optional

from watchmen_model.common import DataModel, ParameterJoint


class Conditional(DataModel):
	conditional: Optional[bool] = None
	on: Optional[ParameterJoint] = None
