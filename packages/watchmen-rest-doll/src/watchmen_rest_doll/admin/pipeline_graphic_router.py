from typing import List

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_meta_service.admin import PipelineGraphicService
from watchmen_model.admin import PipelineGraphic, UserRole
from watchmen_rest_doll.auth import get_any_principal
from watchmen_rest_doll.doll import ask_meta_storage, ask_snowflake_generator

router = APIRouter()


def get_pipeline_graphic_service(principal_service: PrincipalService) -> PipelineGraphicService:
	return PipelineGraphicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get(
	'/pipeline/graphics/me', tags=[UserRole.CONSOLE, UserRole.ADMIN, UserRole.SUPER_ADMIN],
	response_model=List[PipelineGraphic])
async def load_my_pipeline_graphics(
		principal_service: PrincipalService = Depends(get_any_principal)) -> List[PipelineGraphic]:
	# TODO 
	pass
# @router.get("/pipeline/graphics/me", tags=["admin"], response_model=List[PipelinesGraphics])
# async def load_pipeline_graph_by_user(current_user: User = Depends(deps.get_current_user)):
# 	user_id = current_user.userId
# 	results = load_pipeline_graph(user_id, current_user)
# 	return results
# @router.post("/pipeline/graphics", tags=["admin"], response_model=PipelinesGraphics)
# async def save_pipeline_graph(pipeline_graph: PipelinesGraphics, current_user: User = Depends(deps.get_current_user)):
# 	pipeline_graph = add_tenant_id_to_model(pipeline_graph, current_user)
# 	user_id = current_user.userId
# 	pipeline_graph.userId = user_id
# 	if check_fake_id(pipeline_graph.pipelineGraphId):
# 		pipeline_graph.pipelineGraphId = get_surrogate_key()
# 		return create_pipeline_graph(pipeline_graph)
# 	else:
# 		return update_pipeline_graph(pipeline_graph)
# @router.get("/pipeline/graphics/delete", tags=["admin"])
# async def delete_pipeline_graph(pipeline_graph_id: str):
# 	remove_pipeline_graph(pipeline_graph_id)
