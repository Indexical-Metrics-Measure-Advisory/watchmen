from fastapi import APIRouter

router = APIRouter()

# TODO data rerun
# @router.post("/topic/data/rerun", tags=["patch"])
# async def rerun_pipeline(topic_name, instance_id, pipeline_id=None,
#                          current_user: User = Depends(deps.get_current_user)):
#     topic = get_topic(topic_name)
#     trace_id = get_surrogate_key()
#     instance = find_topic_data_by_id_and_topic_name(topic, instance_id)
#     data ={"new":instance,"old":None}
#     pipeline_list = load_pipeline_by_topic_id(topic.topicId)
#     for pipeline in find_execute_pipeline_list(pipeline_id, pipeline_list):
#         log.info("rerun topic {0} and pipeline {1}".format(topic_name, pipeline.name))
#         pipeline_context = PipelineContext(pipeline, data, current_user,trace_id)
#         run_pipeline(pipeline_context,current_user)
#     return {"received": True, "trace_id": trace_id}
