"""OpenCode CLI executor abstraction layer.

Blueprint: each Worker container bundles an independent OpenCode Server CLI
plus domain-specific CLIs (dataplatform-cli, dbt-cli, soda-core-cli, cube-cli).
Workers never shell out directly; they go through this executor so we can
mock the CLI in dev and swap in real subprocess/Celery calls in production.
"""

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional
from uuid import uuid4

logger = logging.getLogger(__name__)


@dataclass
class ExecutionResult:
    """Result of an OpenCode CLI invocation."""
    success: bool = True
    exit_code: int = 0
    stdout: List[str] = field(default_factory=list)
    stderr: List[str] = field(default_factory=list)
    artifacts: Dict[str, Any] = field(default_factory=dict)  # parsed outputs / files
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None


# Streaming callback receives each stdout line as it's produced.
StreamCallback = Callable[[str], None]


class OpenCodeExecutor(ABC):
    """Abstraction over the OpenCode Server CLI bundled in each worker container.

    Workers call `run(...)` to invoke their domain CLI (dataplatform-cli, dbt,
    soda-core, cube). Implementations handle the actual execution strategy:
      - MockOpenCodeExecutor: returns canned output for dev/tests
      - SubprocessOpenCodeExecutor: shells out to the real CLI
      - RemoteOpenCodeExecutor: dispatches to a remote OpenCode Server
    """

    @abstractmethod
    def run(
        self,
        command: str,
        args: List[str],
        cwd: Optional[str] = None,
        stream_callback: Optional[StreamCallback] = None,
    ) -> ExecutionResult:
        """Execute a CLI command and stream stdout line-by-line."""


class MockOpenCodeExecutor(OpenCodeExecutor):
    """Mock executor that simulates OpenCode CLI output for dev mode.

    Recognizes the blueprint's domain CLIs and returns realistic canned
    output so workers can be developed without the real CLIs installed.
    """

    def run(
        self,
        command: str,
        args: List[str],
        cwd: Optional[str] = None,
        stream_callback: Optional[StreamCallback] = None,
    ) -> ExecutionResult:
        started = datetime.utcnow()
        stdout_lines = self._mock_output(command, args)
        for line in stdout_lines:
            if stream_callback:
                stream_callback(line)
        finished = datetime.utcnow()
        return ExecutionResult(
            success=True,
            exit_code=0,
            stdout=stdout_lines,
            stderr=[],
            artifacts={"mock": True},
            started_at=started,
            finished_at=finished,
        )

    def _mock_output(self, command: str, args: List[str]) -> List[str]:
        """Return canned stdout lines for known CLIs."""
        if command == "dataplatform-cli":
            return [
                "[dataplatform-cli] scanning registered data sources...",
                "[dataplatform-cli] found 3 tables: customer_coupon, coupon_campaign, coupon_redemption",
                "[dataplatform-cli] dumping schema to /yaml_metadata/schema.yaml",
                "[dataplatform-cli] done.",
            ]
        if command == "dbt":
            return [
                "[dbt] running: dbt " + " ".join(args),
                "[dbt] Found 5 models, 2 tests, 0 snapshots",
                "[dbt] 1 of 1 OK created sql incremental model demo.coupon_campaign",
                "[dbt] Finished running. 1 pass, 0 fail.",
            ]
        if command == "soda-core":
            return [
                "[soda-core] scanning /dq_rules/rules.yml",
                "[soda-core] profilers: completeness, freshness, uniqueness, consistency",
                "[soda-core] customer_coupon: completeness=98.5, freshness=95.0",
                "[soda-core] all checks passed.",
            ]
        if command == "cube-cli":
            return [
                "[cube-cli] analyzing warehouse query logs...",
                "[cube-cli] top concepts: Customer Segmentation, Campaign ROI",
                "[cube-cli] synthesized 2 semantic tags.",
            ]
        return [f"[{command}] mock execution of {' '.join(args)}"]
