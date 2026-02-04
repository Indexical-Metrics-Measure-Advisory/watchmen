import sys
import os

# Add paths to sys.path
cwd = os.getcwd()
packages = [
    'watchmen-model',
    'watchmen-storage',
    'watchmen-meta',
    'watchmen-auth',
    'watchmen-utilities',
    'watchmen-ai-copilot',
    'watchmen-rest'
]

packages.extend(['watchmen-storage-mysql', 'watchmen-storage-postgresql', 'watchmen-storage-mongodb', 'watchmen-storage-oracle', 'watchmen-storage-mssql', 'watchmen-storage-rds'])

for p in packages:
    path = os.path.join(cwd, 'packages', p, 'src')
    if path not in sys.path:
        sys.path.append(path)

from watchmen_auth.fake_principal_service import fake_super_admin
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.admin import TopicService

def run():
    print("Starting...")
    try:
        principal_service = fake_super_admin()
        storage = ask_meta_storage()
        snowflake_generator = ask_snowflake_generator()
        topic_service = TopicService(storage, snowflake_generator, principal_service)
        
        topic_service.begin_transaction()
        try:
            topics = topic_service.find_all_by_tenant(principal_service.get_tenant_id())
            found = False
            for t in topics:
                if t.name in ["test create", "test target"]:
                    found = True
                    print(f"Topic: {t.name}, ID: {t.topicId}")
                    for f in (t.factors or []):
                        print(f"  Factor: {f.name}, ID: {f.factorId}")
            if not found:
                print("No topics found matching 'test create' or 'test target'")
        except Exception as e:
            print(f"Error finding topics: {e}")
            topic_service.rollback_transaction()
        finally:
            topic_service.close_transaction()
            
    except Exception as e:
        print(f"Error initializing: {e}")

if __name__ == "__main__":
    run()
