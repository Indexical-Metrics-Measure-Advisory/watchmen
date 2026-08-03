import requests
import threading
from typing import List
from urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter

class RemoteSnowflakeGenerator:

    def __init__(
        self,
        base_url: str = "http://localhost:8080",
        batch_fetch_size: int = 500,
        http_timeout: int = 5,
        pool_size: int = 10,
        max_retries: int = 2
    ):
        if not base_url.endswith("/"):
            base_url += "/"
        self._batch_api = f"{base_url}batch"
        self._batch_fetch_size = min(batch_fetch_size, 1000)
        self._http_timeout = http_timeout
        
        retry_strategy = Retry(
            total=max_retries,
            backoff_factor=0.1,
            allowed_methods=["GET"]
        )
        
        self._session = requests.Session()
        adapter = HTTPAdapter(
            pool_connections=pool_size,
            pool_maxsize=pool_size,
            max_retries=retry_strategy
        )
        self._session.mount("http://", adapter)
        self._session.mount("https://", adapter)

        self._id_buffer: List[int] = []
        self._lock = threading.Lock()

    def _fetch_ids(self, count: int) -> List[int]:
        resp = self._session.get(
            url=self._batch_api,
            params={"count": count},
            timeout=self._http_timeout
        )
        resp.raise_for_status()
        data = resp.json()

        if data.get("code") != 0:
            raise RuntimeError(f"Remote server error: {data.get('message')}")
        return data["data"]["ids"]

    def _refill_buffer(self):
        ids = self._fetch_ids(self._batch_fetch_size)
        self._id_buffer.extend(ids)

    def next_id(self) -> int:
        with self._lock:
            if not self._id_buffer:
                self._refill_buffer()
            return self._id_buffer.pop(0)

    def batch_next_id(self, count: int) -> List[int]:
        result = []
        with self._lock:
            remaining = count
            while remaining > 0:
                avail = len(self._id_buffer)
                if avail == 0:
                    self._refill_buffer()
                    continue
                take = min(remaining, avail)
                result.extend(self._id_buffer[:take])
                self._id_buffer = self._id_buffer[take:]
                remaining -= take
        return result

    def close(self):
        self._session.close()