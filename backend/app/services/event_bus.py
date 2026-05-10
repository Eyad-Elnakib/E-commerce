"""
Simple publish/subscribe event bus for cache invalidation.
In-process only — no external message broker.
"""
from typing import Callable, Any


class EventBus:
    def __init__(self):
        self._subscribers: dict[str, list[Callable]] = {}

    def subscribe(self, event_name: str, callback: Callable) -> None:
        """Subscribe a callback to an event name."""
        if event_name not in self._subscribers:
            self._subscribers[event_name] = []
        self._subscribers[event_name].append(callback)

    def publish(self, event_name: str, **kwargs: Any) -> None:
        """Publish an event, calling all subscribers with the given kwargs."""
        for callback in self._subscribers.get(event_name, []):
            callback(**kwargs)

    def clear(self) -> None:
        """Clear all subscriptions. Used in testing."""
        self._subscribers.clear()


# Module-level singleton
event_bus = EventBus()
