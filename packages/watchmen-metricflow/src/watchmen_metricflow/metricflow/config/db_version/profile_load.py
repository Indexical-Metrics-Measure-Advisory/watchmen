from argparse import Namespace
from dbt.config import Profile
from dbt.config.renderer import ProfileRenderer
from dbt.flags import set_flags
from typing import Dict

mock_flags = Namespace(
    USE_COLORS=True,
    LOG_CACHE_EVENTS=True,
    LOG_PATH='logs',
    LOG_LEVEL='info'
)

set_flags(mock_flags)


def load_profile(raw_profile:Dict):
    # raw_project = load_raw_project(project_root)


    profile_renderer = ProfileRenderer({})
    # profile_name = profile_renderer.render_value(raw_profile_name)
    profile = Profile.from_raw_profiles(
        # TODO
        raw_profiles=raw_profile,
        profile_name="profile",
        renderer=profile_renderer,
    )


    # Save env_vars encountered in rendering for partial parsing
    profile.profile_env_vars = profile_renderer.ctx_obj.env_vars
    return profile


