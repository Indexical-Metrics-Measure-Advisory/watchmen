
import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"  # Adjust port if needed
PIPELINE_ID = "123456789"
STAGE_NAME = "copy to test target"
UNIT_NAME = "copy unit"
SOURCE_TOPIC_ID = "topic_source_id"
SOURCE_FACTOR_ID = "factor_source_id"
TARGET_TOPIC_ID = "topic_target_id"
TARGET_FACTOR_ID = "factor_target_id"

def add_insert_or_merge_action():
    url = f"{BASE_URL}/mcp/data_processing/add_action/insert_or_merge_row"
    
    payload = {
        "pipeline_id": PIPELINE_ID,
        "stage_name": STAGE_NAME,
        "unit_name": UNIT_NAME,
        "action": {
            "type": "insert-or-merge-row",
            "topicId": TARGET_TOPIC_ID,
            "accumulateMode": "standard",
            "mapping": [
                {
                    "factorId": TARGET_FACTOR_ID,
                    "arithmetic": "none",
                    "source": {
                        "kind": "topic",
                        "topicId": SOURCE_TOPIC_ID,
                        "factorId": SOURCE_FACTOR_ID,
                        "conditional": False,
                        "on": None
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
                            "factorId": TARGET_FACTOR_ID,
                            "conditional": False,
                            "on": None
                        },
                        "operator": "equals",
                        "right": {
                            "kind": "topic",
                            "topicId": SOURCE_TOPIC_ID,
                            "factorId": SOURCE_FACTOR_ID,
                            "conditional": False,
                            "on": None
                        }
                    }
                ]
            }
        }
    }
    
    print("Sending request to:", url)
    print("Payload:", json.dumps(payload, indent=2))
    
    # response = requests.post(url, json=payload)
    # print("Status Code:", response.status_code)
    # print("Response:", response.text)

if __name__ == "__main__":
    add_insert_or_merge_action()
