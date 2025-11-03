#!/usr/bin/env python3
import json
import os
import sys

from release_worker_id_extension.extensions_api_client import ExtensionsAPIClient
from set_env_variable import get_engine, settings
from snowflake_worker import Worker, read_worker_id_from_tmp

engine = get_engine()

class WorkerIdReleaseExtension:

    def __init__(self, name, registration_body):
        print(f"Initializing WorkerIdReleaseExtension")
        self.name = name
        self.extensions_api_client = ExtensionsAPIClient()
        self.extension_id = self.extensions_api_client.register(self.name, registration_body)

    def run_forever(self):
        print(f"Serving WorkerIdReleaseExtension {self.name}")
        while True:
            resp = self.extensions_api_client.next(self.extension_id)
            event = json.loads(resp)
            if event['eventType'] == 'SHUTDOWN':
                release_worker_id()
                sys.exit(0)



def release_worker_id():
    worker_id = read_worker_id_from_tmp()
    if worker_id:
        worker = Worker(engine)
        if settings.SNOWFLAKE_COMPETITIVE_WORKERS_V2:
            worker.release_worker_v2(0, worker_id)
        else:
            worker.release_worker(0, worker_id)
    else:
        print("Serving WorkerIdReleaseExtension without worker_id")
        

# Register for the INVOKE events from the EXTENSIONS API
_REGISTRATION_BODY = {
    "events": ["SHUTDOWN"],
}


def main():
    print(f"Starting Extensions {_REGISTRATION_BODY}")
    # Note: Agent name has to be file name to register as an external extension
    ext = WorkerIdReleaseExtension(os.path.basename(__file__), _REGISTRATION_BODY)
    ext.run_forever()


if __name__ == "__main__":
    main()
