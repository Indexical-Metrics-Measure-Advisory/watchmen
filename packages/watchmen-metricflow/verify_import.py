
import sys
import os

# Add package directories to python path
sys.path.append(os.path.abspath("/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-metricflow/src"))
sys.path.append(os.path.abspath("/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-data-kernel/src"))
sys.path.append(os.path.abspath("/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-indicator-kernel/src"))
sys.path.append(os.path.abspath("/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-storage-mysql/src"))
sys.path.append(os.path.abspath("/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-utilities/src"))
sys.path.append(os.path.abspath("/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-meta/src"))
sys.path.append(os.path.abspath("/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-model/src"))
sys.path.append(os.path.abspath("/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-storage-rds/src"))
sys.path.append(os.path.abspath("/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-auth/src"))
sys.path.append(os.path.abspath("/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-rest/src"))

try:
    from watchmen_metricflow.router import semantic_meta_router
    print("Successfully imported semantic_meta_router")
except ImportError as e:
    print(f"Failed to import semantic_meta_router: {e}")
except Exception as e:
    print(f"An error occurred: {e}")
