"""Generic semantic text chunking utilities.

Extracted verbatim (logic-wise) from ``rag_emb_service.py``'s
``_estimate_tokens`` / ``_identify_semantic_sections`` /
``_chunk_text_semantic`` / ``_split_large_section`` /
``_add_overlap_to_chunks`` methods. They are now module-level functions with
no ``self`` and no hypothesis coupling, so any caller can chunk long-form text
before embedding.
"""
import re
from typing import Any, Dict, List, Tuple

# Rough approximation: 1 token ~= 4 characters (English + mixed CJK). The
# embedding window we target is 400-800 tokens.
_CHARS_PER_TOKEN = 4
_SMALL_TEXT_TOKEN_THRESHOLD = 800
_TARGET_CHUNK_TOKENS = 600
_OVERLAP_TOKENS = 75

# Section markers recognized when splitting markdown-like text. Each pattern
# is anchored to a leading '## ' heading.
_SECTION_PATTERNS: Dict[str, List[str]] = {
	'hypothesis': [r'##\s*假设', r'##\s*Hypothesis', r'##\s*假设分析', r'##\s*问题假设'],
	'conclusion': [r'##\s*结论', r'##\s*Conclusion', r'##\s*总结', r'##\s*Summary'],
	'recommendation': [r'##\s*建议', r'##\s*Recommendation', r'##\s*推荐', r'##\s*行动建议'],
	'analysis': [r'##\s*分析', r'##\s*Analysis', r'##\s*数据分析', r'##\s*结果分析'],
	'executive_summary': [r'##\s*执行摘要', r'##\s*Executive Summary', r'##\s*概要'],
	'future_action': [r'##\s*未来行动', r'##\s*Future Action', r'##\s*后续步骤'],
}


def estimate_tokens(text: str) -> int:
	"""Estimate the token count of ``text`` (1 token ~= 4 chars)."""
	return len(text) // _CHARS_PER_TOKEN


def identify_semantic_sections(text: str) -> List[Tuple[str, int, int, str]]:
	"""Split ``text`` into semantic sections by markdown headings.

	Returns a list of ``(section_type, start_pos, end_pos, title)`` tuples
	spanning the whole input. Unmatched ranges collapse into a single
	``'general'`` section.
	"""
	sections: List[Tuple[str, int, int, str]] = []
	lines = text.split('\n')
	current_pos = 0
	current_section: Optional[str] = None
	section_start = 0
	section_title = ""

	for line in lines:
		line_start = current_pos
		current_pos += len(line) + 1  # +1 for the newline

		new_section: Optional[str] = None
		new_title = ""
		for section_type, patterns in _SECTION_PATTERNS.items():
			for pattern in patterns:
				if re.match(pattern, line.strip(), re.IGNORECASE):
					new_section = section_type
					new_title = line.strip()
					break
			if new_section:
				break

		if new_section and current_section:
			sections.append((current_section, section_start, line_start, section_title))
		if new_section:
			current_section = new_section
			section_start = line_start
			section_title = new_title

	if current_section:
		sections.append((current_section, section_start, len(text), section_title))
	if not sections:
		sections.append(('general', 0, len(text), ''))
	return sections


def _split_large_section(section_text: str, section_type: str, title: str, base_start: int) -> List[Dict[str, Any]]:
	"""Split a section larger than ``_SMALL_TEXT_TOKEN_THRESHOLD`` by paragraph."""
	chunks: List[Dict[str, Any]] = []
	target_size = _TARGET_CHUNK_TOKENS
	overlap_size = _OVERLAP_TOKENS
	paragraphs = section_text.split('\n\n')
	current_chunk = ""
	current_start = base_start

	for paragraph in paragraphs:
		paragraph = paragraph.strip()
		if not paragraph:
			continue
		test_chunk = current_chunk + ("\n\n" if current_chunk else "") + paragraph
		test_tokens = estimate_tokens(test_chunk)
		if test_tokens <= target_size:
			current_chunk = test_chunk
		else:
			if current_chunk:
				chunks.append({
					'content': current_chunk,
					'semantic_section': section_type,
					'section_title': title,
					'token_count': estimate_tokens(current_chunk),
					'char_start': current_start,
					'char_end': current_start + len(current_chunk),
				})
				current_start += len(current_chunk)
			current_chunk = paragraph

	if current_chunk:
		chunks.append({
			'content': current_chunk,
			'semantic_section': section_type,
			'section_title': title,
			'token_count': estimate_tokens(current_chunk),
			'char_start': current_start,
			'char_end': current_start + len(current_chunk),
		})
	_ = overlap_size  # overlap is applied in _add_overlap_to_chunks
	return chunks


def _add_overlap_to_chunks(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
	"""Give each chunk a small overlap with its neighbours for context continuity."""
	if len(chunks) <= 1:
		return chunks
	overlap_chars = _OVERLAP_TOKENS * _CHARS_PER_TOKEN
	enhanced: List[Dict[str, Any]] = []

	for i, chunk in enumerate(chunks):
		content = chunk['content']
		if i > 0:
			prev_content = chunks[i - 1]['content']
			if len(prev_content) > overlap_chars:
				overlap_text = prev_content[-overlap_chars:]
				for j in range(len(overlap_text)):
					if overlap_text[j] in '.!?\n':
						overlap_text = overlap_text[j + 1:]
						break
				content = overlap_text.strip() + "\n\n" + content
		if i < len(chunks) - 1:
			next_content = chunks[i + 1]['content']
			if len(next_content) > overlap_chars:
				overlap_text = next_content[:overlap_chars]
				for j in range(len(overlap_text) - 1, -1, -1):
					if overlap_text[j] in '.!?\n':
						overlap_text = overlap_text[:j + 1]
						break
				content = content + "\n\n" + overlap_text.strip()
		enhanced_chunk = chunk.copy()
		enhanced_chunk['content'] = content
		enhanced_chunk['token_count'] = estimate_tokens(content)
		enhanced.append(enhanced_chunk)
	return enhanced


def chunk_text_semantic(text: str) -> List[Dict[str, Any]]:
	"""Chunk ``text`` for embedding.

	Returns a list of dicts with keys: ``content``, ``semantic_section``,
	``section_title``, ``token_count``, ``char_start``, ``char_end``.
	"""
	if estimate_tokens(text) <= _SMALL_TEXT_TOKEN_THRESHOLD:
		return [{
			'content': text,
			'semantic_section': 'complete',
			'section_title': '',
			'token_count': estimate_tokens(text),
			'char_start': 0,
			'char_end': len(text),
		}]
	sections = identify_semantic_sections(text)
	chunks: List[Dict[str, Any]] = []
	for section_type, start_pos, end_pos, title in sections:
		section_text = text[start_pos:end_pos].strip()
		if estimate_tokens(section_text) <= _SMALL_TEXT_TOKEN_THRESHOLD:
			chunks.append({
				'content': section_text,
				'semantic_section': section_type,
				'section_title': title,
				'token_count': estimate_tokens(section_text),
				'char_start': start_pos,
				'char_end': end_pos,
			})
		else:
			chunks.extend(_split_large_section(section_text, section_type, title, start_pos))
	return _add_overlap_to_chunks(chunks)
