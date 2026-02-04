
import asyncio
from unittest.mock import MagicMock, patch
from watchmen_ai.mcp.router.pipeline_mcp_router import list_pipelines
from watchmen_model.admin import Pipeline, PipelineType, PipelineStage
from watchmen_auth import PrincipalService

async def demo_list_pipelines():
    # Mock PrincipalService
    mock_principal_service = MagicMock(spec=PrincipalService)
    mock_principal_service.get_tenant_id.return_value = "1"

    # Mock PipelineService
    with patch('watchmen_ai.mcp.router.pipeline_mcp_router.get_pipeline_service') as mock_get_service:
        mock_pipeline_service = MagicMock()
        mock_get_service.return_value = mock_pipeline_service
        
        # Create dummy pipelines
        pipeline1 = Pipeline(
            pipelineId="p1",
            name="customer_sync",
            topicId="t1",
            type=PipelineType.BUSINESS,
            enabled=True,
            stages=[PipelineStage(name="validate"), PipelineStage(name="save")]
        )
        
        pipeline2 = Pipeline(
            pipelineId="p2",
            name="order_process",
            topicId="t2",
            type=PipelineType.BUSINESS,
            enabled=False,
            stages=[PipelineStage(name="check_inventory")]
        )
        
        mock_pipeline_service.find_all.return_value = [pipeline1, pipeline2]

        # Call the function
        print("Calling list_pipelines...")
        results = await list_pipelines(topic_id=None, principal_service=mock_principal_service)
        
        print(f"\nFound {len(results)} pipelines:")
        for p in results:
            print(f"\nPipeline: {p.name} (ID: {p.pipelineId})")
            print(f"Topic ID: {p.topicId}")
            print(f"Type: {p.type}")
            print(f"Enabled: {p.enabled}")
            print(f"Stages: {p.stageCount}")

if __name__ == "__main__":
    asyncio.run(demo_list_pipelines())
