import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


@dataclass
class Settings:
    host: str = os.getenv("AGENT_CLI_HOST", "http://localhost:8000")
    username: Optional[str] = os.getenv("AGENT_CLI_USERNAME")
    password: Optional[str] = os.getenv("AGENT_CLI_PASSWORD")
    pat: Optional[str] = os.getenv("AGENT_CLI_PAT")
    vault: Optional[str] = os.getenv("AGENT_CLI_VAULT")

    def resolved_vault(self, explicit: Optional[str]) -> Path:
        vault = explicit or self.vault
        if vault:
            return Path(vault).expanduser().resolve()
        return Path.cwd().resolve()


settings = Settings()
