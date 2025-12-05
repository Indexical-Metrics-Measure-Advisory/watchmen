from argparse import Namespace
from dbt.adapters.contracts.connection import HasCredentials
from dbt.config import Project, PartialProject
from dbt.config.renderer import DbtProjectYamlRenderer
from dbt.flags import set_flags
from typing import Optional, Dict, Any

mock_flags = Namespace(
    USE_COLORS=True,
    LOG_CACHE_EVENTS=True,
    LOG_PATH='logs',
    LOG_LEVEL='info',
    TARGET_PATH="targettest",
)

set_flags(mock_flags)

def load_project(
    project_dict: Dict,
    version_check: bool,
    profile: HasCredentials,
    cli_vars: Optional[Dict[str, Any]] = None,
) -> Project:
    # get the project with all of the provided information
    project_renderer = DbtProjectYamlRenderer(profile, cli_vars)



    raw_project = project_dict

    partial = PartialProject.from_dicts("", raw_project,{},{}, verify_version=version_check)

    # partial = PartialProject.from_project_root(project_root, verify_version=version_check)


    # Save env_vars encountered in rendering for partial parsing
    # partial.project_env_vars = project_renderer.ctx_obj.env_vars
    return partial.render(project_renderer)

