from __future__ import annotations

import logging
import pathlib
from dbt.task.debug import DebugTask
from dbt_metricflow.cli import PACKAGE_NAME
from dbt_metricflow.cli.cli_configuration import CLIConfiguration
from dbt_metricflow.cli.dbt_connectors.adapter_backed_client import AdapterBackedSqlClient
from dbt_metricflow.cli.dbt_connectors.dbt_config_accessor import dbtArtifacts, dbtProjectMetadata
from metricflow.protocols.sql_client import SqlClient
from pathlib import Path
from typing import Optional

from watchmen_metricflow.metricflow.config.db_version.dbt_artifacts_watchmen import DBTArtifactsWatchmen
from watchmen_metricflow.metricflow.config.db_version.profile_load import load_profile
from watchmen_metricflow.metricflow.config.db_version.project_load import load_project
from watchmen_metricflow.model.dbt_project import ProjectModel
# from watchmen_metricflow.service import ConfigService

logger = logging.getLogger(__name__)

#
# def get_config_service() -> ConfigService:
#     return ConfigService()


class CLIConfigurationDB(CLIConfiguration):
    """Configuration object used for the MetricFlow CLI."""

    DBT_PROFILES_DIR_ENV_VAR_NAME = "DBT_PROFILES_DIR"
    DBT_PROJECT_DIR_ENV_VAR_NAME = "DBT_PROJECT_DIR"

    def __init__(self, tenant_id, semantic_models, metrics, profile) -> None:  # noqa: D107
        super().__init__()
        self._log_stream = None  
        self.tenant_id = tenant_id
        self.metrics = metrics
        self.semantic_models = semantic_models
        self.profile = profile
        self.data_source = None

    @property
    def is_setup(self) -> bool:
        """Returns true if this configuration object has already been set up.

        This can be used of avoid running `setup()` multiple times when a single configuration object is shared
        between test cases.
        """
        return self._is_setup

    def setup(
            self,
            dbt_profiles_path: Optional[pathlib.Path] = None,
            dbt_project_path: Optional[pathlib.Path] = None,
            configure_file_logging: bool = True,
    ) -> None:
        """Setup this configuration for executing commands.

        """
        try:
            # todo
            # config_service:ConfigService = get_config_service()
            # project_model:ProjectModel = config_service.get_dbt_project(self.tenant_id)
            project_dict = {
                "project": {
                    "name": "mf_tutorial_project",
                    "version": "1.0.0",

                    "profile": "mf_tutorial",

                    "models": {},
                    "seeds": {},
                    "snapshots": {},
                    "sources": {},
                    "vars": {}
                },
                "model_configs": {
                    "insurance_models": {
                        "materialized": "table",
                        "quote": True,
                        "enabled": True,
                        "tags": [
                            "insurance",
                            "test"
                        ],
                        "pre_hook": [],
                        "post_hook": []
                    }
                }
            }
            project_model = ProjectModel.model_validate(project_dict)

            project_root = str(dbt_project_path) if dbt_project_path else str(Path.cwd())
            project_path = Path(project_root).resolve()

            ## todo only one profile
            profile = load_profile(self.profile)

            DebugTask.attempt_connection(profile)

            project = load_project(
                project_dict=project_model.project.model_dump(),
                version_check=True,
                profile=profile,
                cli_vars=None
            )

            self._dbt_project_metadata = dbtProjectMetadata(
                profile=profile,
                project=project,
                project_path=project_path
            )

            # if configure_file_logging:
            #     self._configure_logging(log_file_path=self.log_file_path)

        except Exception as e:
            if "Could not find adapter type" in str(e):
                raise RuntimeError(
                    f"Missing adapter package. Install the appropriate adapter package "
                    f"(`{PACKAGE_NAME}[dbt-*]`) for the dbt project {dbt_project_path!r}. "
                    f"Example: `pip install '{PACKAGE_NAME}[dbt-duckdb]'`."
                ) from e
            raise

        self._is_setup = True

    def _get_dbt_project_metadata(self) -> dbtProjectMetadata:
        if self._dbt_project_metadata is None:
            raise RuntimeError(
                f"{self.__class__.__name__}.setup() should have been called before accessing the configuration."
            )
        return self._dbt_project_metadata

    @property
    def dbt_artifacts(self) -> dbtArtifacts:
        """Property accessor for all dbt artifacts."""
        if self._dbt_artifacts is None:
            self._dbt_artifacts = DBTArtifactsWatchmen.load_from_project_metadata(self.dbt_project_metadata,
                                                                                  self.semantic_models, self.metrics)
        return self._dbt_artifacts

    @property
    def sql_client(self) -> SqlClient:
        """Property accessor for the sql_client class used in the CLI."""

        if self._sql_client is None:
            self._sql_client = AdapterBackedSqlClient(self.dbt_artifacts.adapter)
        return self._sql_client
