"""Tests for watchmen_search.text_chunker."""
from watchmen_search.text_chunker import (
	chunk_text_semantic,
	estimate_tokens,
	identify_semantic_sections,
)


def test_estimate_tokens_is_chars_div_four():
	assert estimate_tokens("") == 0
	# 8 chars / 4 = 2 tokens
	assert estimate_tokens("abcdefgh") == 2


def test_short_text_returns_single_chunk():
	text = "This is a short sentence."
	chunks = chunk_text_semantic(text)
	assert len(chunks) == 1
	assert chunks[0]["semantic_section"] == "complete"
	assert chunks[0]["content"] == text
	assert chunks[0]["char_start"] == 0
	assert chunks[0]["char_end"] == len(text)


def test_sections_are_identified_by_headings():
	text = (
		"## 假设\nthis is the hypothesis body\n\n"
		"## 结论\nthis is the conclusion body"
	)
	sections = identify_semantic_sections(text)
	types = [s[0] for s in sections]
	# The two headings should be recognized, in order.
	assert "hypothesis" in types
	assert "conclusion" in types
	assert types.index("hypothesis") < types.index("conclusion")
	# Sections are contiguous and span the whole text.
	assert sections[0][1] == 0
	assert sections[-1][2] == len(text)


def test_long_text_is_split_into_multiple_chunks():
	# A section well above the 800-token threshold (800 tokens ~= 3200 chars).
	long_paragraph = ("alpha beta gamma delta. " * 200).strip()
	text = f"## 分析\n{long_paragraph}"
	chunks = chunk_text_semantic(text)
	assert len(chunks) > 1
	# Every chunk must carry non-empty content and a section label.
	for chunk in chunks:
		assert chunk["content"]
		assert chunk["semantic_section"] in {"analysis", "complete", "general"}
		assert chunk["token_count"] >= 0
		assert chunk["char_end"] >= chunk["char_start"]
