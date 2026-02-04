import requests
import json

# Replace these with actual IDs from your system
SOURCE_TOPIC_ID = "replace_with_source_topic_id" # Topic: test create
TARGET_TOPIC_ID = "replace_with_target_topic_id" # Topic: test target
SOURCE_FACTOR_ID = "replace_with_source_factor_id" # Factor: id in test create
TARGET_FACTOR_ID = "replace_with_target_factor_id" # Factor: id in test target
PIPELINE_ID = "replace_with_pipeline_id"

url = "http://localhost:8000/mcp/data_processing/add_action"

payload = {
    "pipeline_id": PIPELINE_ID,
    "stage_name": "copy to test target",
    "unit_name": "copy unit",
    "action_type": "insert-or-merge-row",
    "action_params": {
        "topicId": TARGET_TOPIC_ID,
        "mapping": [
            {
                "factorId": TARGET_FACTOR_ID,
                "source": {
                    "kind": "topic",
                    "topicId": SOURCE_TOPIC_ID,
                    "factorId": SOURCE_FACTOR_ID
                }
            }
        ],
        "by": {
            "jointType": "and",
            "filters": [
                {
                    "left": {
                        "kind": "topic",
                        "topicId": TARGET_TOPIC_ID,
                        "factorId": TARGET_FACTOR_ID
                    },
                    "operator": "equals",
                    "right": {
                        "kind": "topic",
                        "topicId": SOURCE_TOPIC_ID,
                        "factorId": SOURCE_FACTOR_ID
                    }
                }
            ]
        }
    }
}

headers = {
    "Content-Type": "application/json"
    # Add Authorization header if needed
    # "Authorization": "Bearer YOUR_TOKEN"
}

try:
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
