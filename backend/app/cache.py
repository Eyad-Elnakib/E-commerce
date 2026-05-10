"""
In-memory TTL cache with thread-safe operations and prefix invalidation.
Replaces Redis entirely at localhost scope.
"""
import time
from threading import Lock
from typing import Any, Optional


class TTLCache:
    def __init__(self, default_ttl: int = 3600):
        self.default_ttl = default_ttl
        self._store: dict[str, tuple[Any, float]] = {}
        self._lock = Lock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            item = self._store.get(key)
            if item is None:
                return None
            value, expires_at = item
            if time.time() > expires_at:
                self._store.pop(key, None)
                return None
            return value

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        with self._lock:
            self._store[key] = (value, time.time() + (ttl or self.default_ttl))

    def invalidate_prefix(self, prefix: str) -> int:
        with self._lock:
            to_delete = [k for k in self._store if k.startswith(prefix)]
            for k in to_delete:
                del self._store[k]
            return len(to_delete)


# Module-level singleton
cache = TTLCache()
