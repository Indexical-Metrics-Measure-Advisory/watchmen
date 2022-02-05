from fastapi import APIRouter

from watchmen_auth import PrincipalService
from watchmen_meta_service.console import ConnectedSpaceService
from watchmen_rest_doll.doll import ask_meta_storage, ask_snowflake_generator

router = APIRouter()


def get_connected_space_service(principal_service: PrincipalService) -> ConnectedSpaceService:
	return ConnectedSpaceService(ask_meta_storage(), ask_snowflake_generator(), principal_service)

# TODO connected space routers
# @router.get("/console_space/connected/me", tags=["console"], response_model=List[ConsoleSpace])
# async def load_connected_space(current_user: User = Depends(deps.get_current_user)):
#     user_id = current_user.userId
#     console_space_list = load_console_space_list_by_user(user_id, current_user)
#     return await load_complete_console_space(console_space_list, current_user)
# @router.post("/console_space/save", tags=["console"], response_model=ConsoleSpace)
# async def update_console_space(console_space: ConsoleSpace, current_user: User = Depends(deps.get_current_user)):
#     console_space = add_tenant_id_to_model(console_space, current_user)
#     new_subject_ids = []
#     for subject in console_space.subjects:
#         new_subject_ids.append(subject.subjectId)
#     console_space.subjectIds = new_subject_ids
#     console_space.userId = current_user.userId
#     return save_console_space(console_space)
# @router.get("/console_space/rename", tags=["console"])
# async def rename_console_space(connect_id: str, name: str, current_user: User = Depends(deps.get_current_user)):
#     rename_console_space_by_id(connect_id, name)
# @router.get("/console_space/delete", tags=["console"])
# async def delete_console_space(connect_id, current_user: User = Depends(deps.get_current_user)):
#     delete_console_space_and_sub_data(connect_id, current_user)
# @router.get("/console_space/template/list", tags=["console"], response_model=List[ConnectedSpaceTemplate])
# async def load_template_space_list(space_id: str, current_user: User = Depends(deps.get_current_user)):
#     results: List[ConsoleSpace] = load_template_space_list_by_space_id(space_id)
#     template_list = []
#     for console_space in results:
#         user = get_user(console_space.userId)
#         template_list.append(
#             ConnectedSpaceTemplate(connectId=console_space.connectId, name=console_space.name, createBy=user.name))
#     return template_list
# @router.get("/console_space/export", tags=["console"], response_model=List[ConsoleSpace])
# async def load_template_for_export(current_user: User = Depends(deps.get_current_user)):
#     console_space_list = load_console_space_template_list_by_user(current_user.userId, current_user)
#     # template_list = list(filter(lambda x: x.isTemplate, console_space_list))
#     return await load_complete_console_space(console_space_list, current_user)
