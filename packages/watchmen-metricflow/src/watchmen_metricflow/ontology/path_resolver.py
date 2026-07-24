

import re
from typing import List, Optional, Tuple

from watchmen_model.admin import VirtualLink, VirtualObject, VirtualOntology

from .errors import OntologySqlCompileError


_SAFE_ALIAS_RE = re.compile(r'[^a-zA-Z0-9_]')


def safe_alias(name: str) -> str:
	"""替换 SQL 别名里非法的字符，避免 SQLAlchemy / 不同方言报错。"""
	return _SAFE_ALIAS_RE.sub('_', name)


class PathResolver:
	"""把 ``derived.path`` 解析成规整的 segment 序列。

	所有方法都是纯函数式的（不依赖 self 状态），方便单测。
	"""

	def parse(
			self, ontology: VirtualOntology, path: List[str], derived_name: str
	) -> List[Tuple[VirtualLink, VirtualObject]]:
		"""返回 ``[(link, target_vo), ...]`` 序列。

		每个 segment 表示"从上一个 vo 通过 link 跳到 target_vo"。
		调用方把 primary_table 视作第一个 vo（不在返回里）。
		"""
		if not path:
			raise OntologySqlCompileError(f'Derived attribute [{derived_name}] path is empty.')
		tokens = list(path)
		objects_by_id = {vo.id: vo for vo in (ontology.virtualObjects or [])}
		objects_by_name = {vo.name: vo for vo in (ontology.virtualObjects or []) if vo.name}
		links_by_id = {link.id: link for link in (ontology.virtualLinks or [])}
		links_by_name = {link.name: link for link in (ontology.virtualLinks or []) if link.name}

		def resolve_vo(token: str) -> Optional[VirtualObject]:
			return objects_by_id.get(token) or objects_by_name.get(token)

		def resolve_link(token: str) -> Optional[VirtualLink]:
			return links_by_id.get(token) or links_by_name.get(token)

		segments: List[Tuple[VirtualLink, VirtualObject]] = []
		# 第一个 token：期望是 vo；如果不是（兼容旧版简写），就当作 link
		first = tokens[0]
		first_vo = resolve_vo(first)
		if first_vo is None:
			first_link = resolve_link(first)
			if first_link is None:
				path_text = ' -> '.join(path)
				raise OntologySqlCompileError(
					f'First token in path [{path_text}] is neither a virtual object nor a virtual link.')
			target_vo = next(
				(vo for vo in (ontology.virtualObjects or []) if vo.id == first_link.targetObjectId), None)
			if target_vo is None:
				raise OntologySqlCompileError(
					f'Target object [{first_link.targetObjectId}] not found for link [{first_link.name}].')
			segments.append((first_link, target_vo))
			tokens = tokens[1:]
		else:
			tokens = tokens[1:]
		# 剩下的 token：link, vo, link, vo, ...
		idx = 0
		while idx < len(tokens):
			if idx + 1 >= len(tokens):
				path_text = ' -> '.join(path)
				raise OntologySqlCompileError(
					f'Path [{path_text}] ends with a link without a target object.')
			link_token = tokens[idx]
			next_vo_token = tokens[idx + 1]
			link = resolve_link(link_token)
			if link is None:
				path_text = ' -> '.join(path)
				raise OntologySqlCompileError(
					f'Path token [{link_token}] in [{path_text}] is not a virtual link.')
			next_vo = resolve_vo(next_vo_token)
			if next_vo is None:
				path_text = ' -> '.join(path)
				raise OntologySqlCompileError(
					f'Path token [{next_vo_token}] in [{path_text}] is not a virtual object.')
			# 不严格校验 link.sourceObjectId/targetObjectId 与 path 一致：
			# 历史上 path 可能不严格（只写 vo 不写 link.source），保持宽容。
			segments.append((link, next_vo))
			idx += 2
		if not segments:
			path_text = ' -> '.join(path)
			raise OntologySqlCompileError(
				f'Path [{path_text}] did not produce any link segments.')
		return segments
