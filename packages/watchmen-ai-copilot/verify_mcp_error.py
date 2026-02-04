from fastapi import FastAPI
from fastapi.testclient import TestClient
from watchmen_ai.mcp.router.pipeline_mcp_router import router
from watchmen_rest import get_admin_principal

app = FastAPI()
app.include_router(router)

class MockPrincipalService:
    def get_tenant_id(self):
        return "1"
    def get_user_id(self):
        return "1"
    def get_user_name(self):
        return "admin"

app.dependency_overrides[get_admin_principal] = lambda: MockPrincipalService()

client = TestClient(app)

try:
    response = client.post(
        "/mcp/data_processing/create_pipeline",
        json={"name": "test_pipe", "topic_id": "t-1", "type": "business"}
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Client crashed: {e}")
