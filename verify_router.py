
import sys
import os
from fastapi import FastAPI
from pydantic import BaseModel

# Add path to sources
sys.path.append(os.path.abspath("/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-ai-copilot/src"))
sys.path.append(os.path.abspath("/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-model/src"))
sys.path.append(os.path.abspath("/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-rest/src"))
sys.path.append(os.path.abspath("/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-utilities/src"))
sys.path.append(os.path.abspath("/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-auth/src"))
sys.path.append(os.path.abspath("/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-meta/src"))
sys.path.append(os.path.abspath("/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-storage-postgresql/src"))
sys.path.append(os.path.abspath("/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-storage-mysql/src"))
sys.path.append(os.path.abspath("/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-storage-oracle/src"))
sys.path.append(os.path.abspath("/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-storage-mongodb/src"))
sys.path.append(os.path.abspath("/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-storage-mssql/src"))
sys.path.append(os.path.abspath("/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-storage-rds/src"))
sys.path.append(os.path.abspath("/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-storage/src"))

try:
    from watchmen_ai.mcp.router.pipeline_mcp_router import router
    print("Router imported successfully.")
    
    found_endpoints = []
    for route in router.routes:
        found_endpoints.append(route.path)
    
    expected_endpoints = [
        "/mcp/data_processing/add_action/insert_row",
        "/mcp/data_processing/add_action/merge_row",
        "/mcp/data_processing/add_action/insert_or_merge_row",
        "/mcp/data_processing/add_action/write_factor",
        "/mcp/data_processing/add_action/read_row",
        "/mcp/data_processing/add_action/read_rows",
        "/mcp/data_processing/add_action/read_factor",
        "/mcp/data_processing/add_action/read_factors",
        "/mcp/data_processing/add_action/exists",
        "/mcp/data_processing/add_action/delete_row",
        "/mcp/data_processing/add_action/delete_rows",
        "/mcp/data_processing/add_action/alarm",
        "/mcp/data_processing/add_action/copy_to_memory",
        "/mcp/data_processing/add_action/write_to_external"
    ]
    
    missing = []
    for expected in expected_endpoints:
        if expected not in found_endpoints:
            missing.append(expected)
            
    if missing:
        print(f"Missing endpoints: {missing}")
    else:
        print("All expected endpoints found.")
        
except ImportError as e:
    print(f"ImportError: {e}")
except Exception as e:
    print(f"Error: {e}")
