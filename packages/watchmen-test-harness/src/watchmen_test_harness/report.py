"""Aggregated run summary: markdown report + stdout table.

Every runner phase reports a status (pass/fail/skip) with detail; the module turns
that into `summary.md` inside the results directory so CI or the ai-dev gate can
consume one file, and prints the same table for humans.
"""

from pathlib import Path
from typing import Dict

_STATUS_ICON = {'pass': 'PASS', 'fail': 'FAIL', 'skip': 'SKIP'}


def write_summary(results_dir: Path, phases: Dict[str, Dict[str, str]]) -> str:
	"""Writes summary.md and echoes it; returns the markdown content."""
	lines = ['# watchmen-test-harness run', '', '| Phase | Status | Detail |', '|---|---|---|']
	for name, outcome in phases.items():
		status = _STATUS_ICON.get(outcome.get('status', 'fail'), 'FAIL')
		detail = outcome.get('detail', '').replace('|', '\\|').replace('\n', ' ')
		lines.append(f'| {name} | {status} | {detail} |')

	failed = [n for n, o in phases.items() if o.get('status') == 'fail']
	skipped = [n for n, o in phases.items() if o.get('status') == 'skip']
	lines += ['', f'**Result**: {"FAILED" if failed else "PASSED"}'
		f' (failed: {", ".join(failed) if failed else "none"};'
		f' skipped: {", ".join(skipped) if skipped else "none"})']

	content = '\n'.join(lines) + '\n'
	results_dir.mkdir(parents=True, exist_ok=True)
	(results_dir / 'summary.md').write_text(content, encoding='utf-8')
	print('\n' + content)
	return content
