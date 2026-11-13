import json
import random
import string
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_admin
from app.database import get_db
from app.models import ActivityLog, AuctionConfig, Bid, Rfq, User
from app.schemas import RfqCreate, RfqOut, RfqUpdate

router = APIRouter(prefix="/api/rfqs", tags=["rfqs"])


def to_utc_iso(dt: Optional[datetime]) -> Optional[str]:
    """Ensure datetime has timezone suffix (+00:00 or Z) for unambiguous frontend parsing."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def generate_reference_id() -> str:
    chars = string.ascii_uppercase + string.digits
    suffix = "".join(random.choices(chars, k=6))
    return f"RFQ-{suffix}"


def build_rfq_out(rfq: Rfq, db: Session) -> dict:
    bid_count = db.query(func.count(Bid.id)).filter(Bid.rfq_id == rfq.id).scalar() or 0
    lowest = db.query(func.min(Bid.total_amount)).filter(Bid.rfq_id == rfq.id).scalar()
    creator = db.query(User).filter(User.id == rfq.created_by_id).first()

    config_data = None
    if rfq.auction_config:
        config_data = {
            "id": rfq.auction_config.id,
            "rfq_id": rfq.auction_config.rfq_id,
            "trigger_window_mins": rfq.auction_config.trigger_window_mins,
            "extension_mins": rfq.auction_config.extension_mins,
            "trigger_type": rfq.auction_config.trigger_type,
        }

    return {
        "id": rfq.id,
        "name": rfq.name,
        "reference_id": rfq.reference_id,
        "description": rfq.description,
        "bid_start_time": to_utc_iso(rfq.bid_start_time),
        "bid_close_time": to_utc_iso(rfq.bid_close_time),
        "original_bid_close_time": to_utc_iso(rfq.original_bid_close_time),
        "forced_bid_close_time": to_utc_iso(rfq.forced_bid_close_time),
        "pickup_date": to_utc_iso(rfq.pickup_date),
        "status": rfq.status,
        "created_by_id": rfq.created_by_id,
        "created_at": to_utc_iso(rfq.created_at),
        "auction_config": config_data,
        "bid_count": bid_count,
        "lowest_bid": lowest,
        "created_by_name": creator.name if creator else None,
    }



@router.get("")
def list_rfqs(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Rfq)

    # Suppliers only see non-DRAFT RFQs
    if current_user.role == "SUPPLIER":
        query = query.filter(Rfq.status != "DRAFT")

    if status:
        query = query.filter(Rfq.status == status)

    rfqs = query.order_by(Rfq.created_at.desc()).all()
    return [build_rfq_out(rfq, db) for rfq in rfqs]


@router.post("")
def create_rfq(
    body: RfqCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate forced close > bid close
    if body.forced_bid_close_time <= body.bid_close_time:
        raise HTTPException(
            status_code=400,
            detail="Forced Bid Close Time must be later than Bid Close Time",
        )

    # Generate unique reference ID
    ref_id = generate_reference_id()
    while db.query(Rfq).filter(Rfq.reference_id == ref_id).first():
        ref_id = generate_reference_id()

    rfq = Rfq(
        name=body.name,
        reference_id=ref_id,
        description=body.description,
        bid_start_time=body.bid_start_time,
        bid_close_time=body.bid_close_time,
        original_bid_close_time=body.bid_close_time,
        forced_bid_close_time=body.forced_bid_close_time,
        pickup_date=body.pickup_date,
        status="DRAFT",
        created_by_id=current_user.id,
    )
    db.add(rfq)
    db.flush()

    config = AuctionConfig(
        rfq_id=rfq.id,
        trigger_window_mins=body.auction_config.trigger_window_mins,
        extension_mins=body.auction_config.extension_mins,
        trigger_type=body.auction_config.trigger_type,
    )
    db.add(config)

    log = ActivityLog(
        rfq_id=rfq.id,
        event_type="RFQ_CREATED",
        description=f"RFQ '{rfq.name}' created by {current_user.name}",
    )
    db.add(log)

    db.commit()
    db.refresh(rfq)
    return build_rfq_out(rfq, db)


@router.get("/{rfq_id}")
def get_rfq(
    rfq_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rfq = db.query(Rfq).filter(Rfq.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    result = build_rfq_out(rfq, db)

    # Include bids with rankings
    bids = (
        db.query(Bid)
        .filter(Bid.rfq_id == rfq_id)
        .order_by(Bid.total_amount.asc(), Bid.transit_time.asc(), Bid.created_at.asc(), Bid.id.asc())
        .all()
    )
    bids_out = []
    for i, bid in enumerate(bids):
        supplier = db.query(User).filter(User.id == bid.supplier_id).first()
        bids_out.append({
            "id": bid.id,
            "rfq_id": bid.rfq_id,
            "supplier_id": bid.supplier_id if current_user.role != "SUPPLIER" or bid.supplier_id == current_user.id else None,
            "supplier_name": supplier.name if supplier and (current_user.role != "SUPPLIER" or bid.supplier_id == current_user.id) else None,
            "supplier_company": supplier.company if supplier and (current_user.role != "SUPPLIER" or bid.supplier_id == current_user.id) else None,
            "freight_charges": bid.freight_charges,
            "origin_charges": bid.origin_charges,
            "destination_charges": bid.destination_charges,
            "total_amount": bid.total_amount,
            "transit_time": bid.transit_time,
            "validity_date": to_utc_iso(bid.validity_date),
            "created_at": to_utc_iso(bid.created_at),
            "rank": i + 1,
        })
    result["bids"] = bids_out

    # Include activity logs
    logs = (
        db.query(ActivityLog)
        .filter(ActivityLog.rfq_id == rfq_id)
        .order_by(ActivityLog.created_at.desc())
        .all()
    )
    result["activity_logs"] = [
        {
            "id": l.id,
            "rfq_id": l.rfq_id,
            "event_type": l.event_type,
            "description": "A carrier submitted a quote." if current_user.role == "SUPPLIER" and l.event_type == "BID_SUBMITTED" else l.description,
            "metadata": None if current_user.role == "SUPPLIER" and l.event_type == "BID_SUBMITTED" else l.metadata_json,
            "metadata_json": None if current_user.role == "SUPPLIER" and l.event_type == "BID_SUBMITTED" else l.metadata_json,
            "created_at": to_utc_iso(l.created_at),
        }
        for l in logs
    ]

    return result


@router.put("/{rfq_id}")
def update_rfq(
    rfq_id: str,
    body: RfqUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rfq = db.query(Rfq).filter(Rfq.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    # Only admin or creator can edit
    if current_user.role != "ADMIN" and rfq.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this RFQ")

    # Only allow editing DRAFT RFQs
    if rfq.status != "DRAFT":
        raise HTTPException(status_code=400, detail="Can only edit RFQs in DRAFT status")

    if body.name is not None:
        rfq.name = body.name
    if body.description is not None:
        rfq.description = body.description
    if body.bid_start_time is not None:
        rfq.bid_start_time = body.bid_start_time
    if body.bid_close_time is not None:
        rfq.bid_close_time = body.bid_close_time
        rfq.original_bid_close_time = body.bid_close_time
    if body.forced_bid_close_time is not None:
        rfq.forced_bid_close_time = body.forced_bid_close_time
    if body.pickup_date is not None:
        rfq.pickup_date = body.pickup_date

    # Validate times
    if rfq.forced_bid_close_time <= rfq.bid_close_time:
        raise HTTPException(
            status_code=400,
            detail="Forced Bid Close Time must be later than Bid Close Time",
        )

    if body.auction_config is not None:
        config = rfq.auction_config
        if config:
            config.trigger_window_mins = body.auction_config.trigger_window_mins
            config.extension_mins = body.auction_config.extension_mins
            config.trigger_type = body.auction_config.trigger_type
        else:
            config = AuctionConfig(
                rfq_id=rfq.id,
                trigger_window_mins=body.auction_config.trigger_window_mins,
                extension_mins=body.auction_config.extension_mins,
                trigger_type=body.auction_config.trigger_type,
            )
            db.add(config)

    db.commit()
    db.refresh(rfq)
    return build_rfq_out(rfq, db)


@router.patch("/{rfq_id}/status")
def update_rfq_status(
    rfq_id: str,
    status: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually change RFQ status (e.g., DRAFT -> ACTIVE)."""
    rfq = db.query(Rfq).filter(Rfq.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    if current_user.role != "ADMIN" and rfq.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    valid_transitions = {
        "DRAFT": ["ACTIVE"],
        "ACTIVE": ["CLOSED", "FORCE_CLOSED"],
    }

    allowed = valid_transitions.get(rfq.status, [])
    if status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from {rfq.status} to {status}",
        )

    rfq.status = status

    event_type = "AUCTION_STARTED" if status == "ACTIVE" else f"AUCTION_{status}"
    log = ActivityLog(
        rfq_id=rfq_id,
        event_type=event_type,
        description=f"Auction status changed to {status} by {current_user.name}",
    )
    db.add(log)
    db.commit()

    return build_rfq_out(rfq, db)


@router.delete("/{rfq_id}")
def delete_rfq(
    rfq_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    rfq = db.query(Rfq).filter(Rfq.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    db.delete(rfq)
    db.commit()
    return {"success": True, "message": "RFQ deleted"}


@router.post("/reset-demo-auctions")
def reset_demo_auctions(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Re-arm and seed demo auctions with active countdowns and sample bids for immediate live testing."""
    now = datetime.now(timezone.utc)

    # 1. Re-arm or create RFQ-DEMO01 (Rapid 5-min British Auction)
    demo_rfq = db.query(Rfq).filter(Rfq.reference_id == "RFQ-DEMO01").first()
    if demo_rfq:
        demo_rfq.status = "ACTIVE"
        demo_rfq.bid_start_time = now - timedelta(minutes=1)
        demo_rfq.bid_close_time = now + timedelta(minutes=10)
        demo_rfq.original_bid_close_time = now + timedelta(minutes=10)
        demo_rfq.forced_bid_close_time = now + timedelta(minutes=20)
        # Clear existing bids and add fresh ones
        db.query(Bid).filter(Bid.rfq_id == demo_rfq.id).delete()
    else:
        admin_user = db.query(User).filter(User.role == "ADMIN").first()
        demo_rfq = Rfq(
            name="Rapid British Auction Simulation",
            reference_id="RFQ-DEMO01",
            description="Short-duration live British Auction for testing trigger window extensions and hard ceiling clamping.",
            bid_start_time=now - timedelta(minutes=1),
            bid_close_time=now + timedelta(minutes=10),
            original_bid_close_time=now + timedelta(minutes=10),
            forced_bid_close_time=now + timedelta(minutes=20),
            pickup_date=now + timedelta(days=3),
            status="ACTIVE",
            created_by_id=admin_user.id if admin_user else "admin",
        )
        db.add(demo_rfq)
        db.flush()

        db.add(AuctionConfig(
            rfq_id=demo_rfq.id,
            trigger_window_mins=5,
            extension_mins=2,
            trigger_type="BID_RECEIVED",
        ))

    # Add 2 competitor bids
    sup2 = db.query(User).filter(User.email == "supplier2@test.com").first()
    sup3 = db.query(User).filter(User.email == "supplier3@test.com").first()

    if sup2:
        db.add(Bid(
            rfq_id=demo_rfq.id,
            supplier_id=sup2.id,
            freight_charges=42000,
            origin_charges=4000,
            destination_charges=4000,
            total_amount=50000,
            transit_time=3,
            validity_date=now + timedelta(days=14),
        ))
    if sup3:
        db.add(Bid(
            rfq_id=demo_rfq.id,
            supplier_id=sup3.id,
            freight_charges=45000,
            origin_charges=5000,
            destination_charges=5000,
            total_amount=55000,
            transit_time=4,
            validity_date=now + timedelta(days=14),
        ))

    db.add(ActivityLog(
        rfq_id=demo_rfq.id,
        event_type="DEMO_RESET",
        description="Demo auction re-armed with 10-minute countdown and competitor quotes.",
    ))

    db.commit()
    return {"success": True, "message": "Demo auction reset successfully! Closes in 10 minutes."}


