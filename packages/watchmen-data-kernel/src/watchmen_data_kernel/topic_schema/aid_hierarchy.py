from logging import getLogger
from typing import Any, Dict, List, Optional

from watchmen_storage import SnowflakeGenerator
from watchmen_utilities import ArrayHelper, is_blank

MY_AID_ID = 'aid_me'
AID_ROOT = 'aid_root'

logger = getLogger(__name__)


class Ancestor:
	def __init__(self, name: str, aid_id: int):
		self.name = name
		self.aidId = aid_id


# noinspection GrazieInspection
def apply_ancestor_aid_id(
		data: Dict[str, Any], my_hierarchy_number: int,
		ancestor: Ancestor, used_ancestor_keys: Dict[str, bool],
) -> None:
	"""
	apply ancestor aid id to given data.\n
	if not applied(used keys is 0), apply as to root, use "aid_root" as name,\n
	use "aid_{ancestor.name}" as name when this name is not used,\n
	use "aid_{ancestor.name}_{distance_to_ancestor}" as name when name in step b is used.
	distance is the difference value of my hierarchy number and ancestor's hierarchy number

	for example:
	root.a.b.c.b.e, now data is e, will create the following aid properties:\n
	aid_root: to root,\n
	aid_a: to a,\n
	aid_b: to b,\n
	aid_c: to c,\n
	aid_b_1: to b which is closer to me(e).
	"""
	used_count = len(used_ancestor_keys)
	if len(used_ancestor_keys) == 0:
		# first one is always key of root
		name = AID_ROOT
	else:
		name = f'aid_{ancestor.name}'
		if name in used_ancestor_keys:
			name = f'aid_{ancestor.name}_{my_hierarchy_number - used_count}'
	data[name] = ancestor.aidId
	used_ancestor_keys[name] = True


def aid(
		data: Dict[str, Any], ancestors: Optional[List[Ancestor]], snowflake_generator: SnowflakeGenerator
) -> None:
	"""
	given data should be modified
	"""

	try:
		# create aid me
		aid_me = snowflake_generator.next_id()
		data[MY_AID_ID] = aid_me

		# create ancestor aid ids
		my_hierarchy_number = len(ancestors)
		used_ancestor_keys: Dict[str, bool] = {}
		ArrayHelper(ancestors).each(lambda x: apply_ancestor_aid_id(data, my_hierarchy_number, x, used_ancestor_keys))

		for key in data:
			value = data[key]
			my_ancestors = ArrayHelper(ancestors).copy().grab(Ancestor(name=key, aid_id=aid_me)).to_list()
			if isinstance(value, dict):
				aid(value, my_ancestors, snowflake_generator)
			elif isinstance(value, list):
				def aid_each(element: Any) -> None:
					if isinstance(element, dict):
						aid(element, my_ancestors, snowflake_generator)
					elif isinstance(element, list):
						ArrayHelper(element).each(aid_each)

				ArrayHelper(value).each(aid_each)
	except Exception as e:
		hierarchy = ArrayHelper(ancestors).map(lambda x: x.name).join('/')
		if is_blank(hierarchy):
			hierarchy = 'root'
		logger.error(f'Error occurred on hierarchy [{hierarchy}].')
		raise e
