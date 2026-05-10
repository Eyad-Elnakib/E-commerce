"""
Events router for telemetry ingestion.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.deps import get_db, get_optional_user
from app.models import Event
from app.schemas import EventBatchRequest

router = APIRouter(prefix="/api/events", tags=["events"])

@router.post("")
def ingest_events(
    req: EventBatchRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_user)
):
    """Ingest a batch of telemetry events. Append-only."""
    user_id = current_user.id if current_user else None
    
    for event_data in req.events:
        db_event = Event(
            user_id=user_id,
            session_id=event_data.session_id,
            event_type=event_data.event_type,
            product_id=event_data.product_id,
            payload=event_data.payload,
            client_ts=event_data.client_ts or datetime.now(timezone.utc),
        )
        db.add(db_event)
    
    db.commit()
    return {"status": "ingested", "count": len(req.events)}
