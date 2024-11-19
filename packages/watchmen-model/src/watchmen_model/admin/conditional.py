from typing import Optional

from watchmen_model.common import ParameterJoint
from watchmen_utilities import ExtendedBaseModel


class Conditional(ExtendedBaseModel):
	conditional: Optional[bool] = None
	on: Optional[ParameterJoint] = None
