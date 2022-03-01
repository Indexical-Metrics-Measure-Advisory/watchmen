from typing import Optional, Union

from watchmen_model.common import GraphicRect


def construct_rect(rect: Optional[Union[dict, GraphicRect]]) -> Optional[GraphicRect]:
	if rect is None:
		return None
	elif isinstance(rect, GraphicRect):
		return rect
	else:
		return GraphicRect(**rect)
