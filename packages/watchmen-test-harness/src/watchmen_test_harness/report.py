from pathlib import Path
from typing import Dict, Optional, Union

from watchmen_test_harness.evaluation_models import GateResult, SuiteResult


_STATUS_ICON = {'pass': 'PASS', 'fail': 'FAIL', 'skip': 'SKIP', 'error': 'ERROR'}


def write_summary(
		results_dir: Path,
		phases: Dict[str, Union[SuiteResult, Dict[str, str]]],
		gate: Optional[GateResult] = None) -> str:
	lines = ['# watchmen-test-harness run', '', '| Phase | Status | Detail |', '|---|---|---|']
	for name, raw_outcome in phases.items():
		outcome = raw_outcome if isinstance(raw_outcome, SuiteResult) else SuiteResult(
			name=name, status=raw_outcome.get('status', 'fail'), detail=raw_outcome.get('detail', '')
		)
		status = _STATUS_ICON[outcome.status]
		detail = outcome.detail.replace('|', '\\|').replace('\n', ' ')
		lines.append(f'| {name} | {status} | {detail} |')

	failed = [
		name for name, outcome in phases.items()
		if (outcome.status if isinstance(outcome, SuiteResult) else outcome.get('status')) in {'fail', 'error'}
	]
	skipped = [
		name for name, outcome in phases.items()
		if (outcome.status if isinstance(outcome, SuiteResult) else outcome.get('status')) == 'skip'
	]
	result = 'FAILED' if failed or (gate and gate.status == 'fail') else 'PASSED'
	lines += ['', f'**Result**: {result}'
		f' (failed: {", ".join(failed) if failed else "none"};'
		f' skipped: {", ".join(skipped) if skipped else "none"})']
	if gate:
		lines += ['', f'**Gate**: {gate.status.upper()}']
		for check in gate.checks:
			if check.status == 'fail':
				lines.append(f'- {check.name}: {check.detail}')

	content = '\n'.join(lines) + '\n'
	results_dir.mkdir(parents=True, exist_ok=True)
	(results_dir / 'summary.md').write_text(content, encoding='utf-8')
	print('\n' + content)
	return content
