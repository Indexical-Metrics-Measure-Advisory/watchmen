#!/usr/bin/env python3

import json
import os
import sys

import set_env_variable
from release_worker_id_extension.extensions_api_client import ExtensionsAPIClient
from watchmen_meta.common import ask_meta_storage, ask_snowflake_competitive_workers_v2, get_snowflake_worker
from watchmen_storage import get_storage_based_worker_id_service


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


def read_worker_id_from_tmp() -> int:
    if os.path.exists('/tmp/worker_id.txt'):
        with open('/tmp/worker_id.txt', 'r') as file:
            worker_id = file.read()
            return worker_id


def release_worker_id():
    if ask_snowflake_competitive_workers_v2():
        worker = get_snowflake_worker()
        worker.release_worker()
    else:
        storage = ask_meta_storage()
        worker_id = read_worker_id_from_tmp()
        if worker_id:
            get_storage_based_worker_id_service(storage).release_worker(0, worker_id)
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
