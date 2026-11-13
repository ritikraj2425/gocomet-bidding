from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import ActivityLog, Rfq, User

router = APIRouter(prefix="/api/rfqs/{rfq_id}/activity", tags=["activity"])


@router.get("")
def list_activity(
    rfq_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rfq = db.query(Rfq).filter(Rfq.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    logs = (
        db.query(ActivityLog)
        .filter(ActivityLog.rfq_id == rfq_id)
        .order_by(ActivityLog.created_at.desc())
        .all()
    )

    return [
        {
            "id": l.id,
            "rfq_id": l.rfq_id,
            "event_type": l.event_type,
            "description": "A carrier submitted a quote." if current_user.role == "SUPPLIER" and l.event_type == "BID_SUBMITTED" else l.description,
            "metadata": None if current_user.role == "SUPPLIER" and l.event_type == "BID_SUBMITTED" else l.metadata_json,
            "metadata_json": None if current_user.role == "SUPPLIER" and l.event_type == "BID_SUBMITTED" else l.metadata_json,
            "created_at": l.created_at,
        }
        for l in logs
    ]

