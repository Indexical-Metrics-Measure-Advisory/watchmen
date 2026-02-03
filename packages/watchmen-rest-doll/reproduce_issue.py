from fastapi.testclient import TestClient
from watchmen_rest_doll.main import app
import sys

print("Starting app...")
try:
    with TestClient(app) as client:
        print("App started successfully.")
except Exception as e:
    print(f"App startup failed: {e}")
    # We might want to print traceback if needed, but the error message should be enough to confirm RecursionError
    import traceback
    traceback.print_exc()
    sys.exit(1)
