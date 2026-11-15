import asyncio
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import ActivityLog, Bid, Rfq, User
from app.schemas import BidCreate
from app.services.auction_engine import evaluate_extension, get_rankings
from app.websocket_manager import manager

router = APIRouter(prefix="/api/rfqs/{rfq_id}/bids", tags=["bids"])
my_bids_router = APIRouter(prefix="/api/bids", tags=["bids"])



def to_utc_iso(dt):
    if dt is None:
        return None
    if hasattr(dt, 'tzinfo') and dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


@router.get("")
def list_bids(
    rfq_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rfq = db.query(Rfq).filter(Rfq.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    bids = (
        db.query(Bid)
        .filter(Bid.rfq_id == rfq_id)
        .order_by(Bid.total_amount.asc(), Bid.transit_time.asc(), Bid.created_at.asc(), Bid.id.asc())
        .all()
    )

    result = []
    for i, bid in enumerate(bids):
        supplier = db.query(User).filter(User.id == bid.supplier_id).first()
        result.append({
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

    return result



@router.post("")
async def submit_bid(
    rfq_id: str,
    body: BidCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "SUPPLIER":
        raise HTTPException(status_code=403, detail="Only suppliers can submit bids")

    rfq = db.query(Rfq).filter(Rfq.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    if rfq.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Auction is not active")

    now = datetime.now(timezone.utc)
    bid_close = rfq.bid_close_time
    if bid_close.tzinfo is None:
        bid_close = bid_close.replace(tzinfo=timezone.utc)
    bid_start = rfq.bid_start_time
    if bid_start.tzinfo is None:
        bid_start = bid_start.replace(tzinfo=timezone.utc)

    if now < bid_start:
        raise HTTPException(status_code=400, detail="Auction has not started yet")
    if now > bid_close:
        raise HTTPException(status_code=400, detail="Auction bidding period has ended")

    total = body.freight_charges + body.origin_charges + body.destination_charges

    best_previous_bid = (
        db.query(Bid)
        .filter(Bid.rfq_id == rfq_id, Bid.supplier_id == current_user.id)
        .order_by(Bid.total_amount.asc(), Bid.transit_time.asc(), Bid.created_at.asc(), Bid.id.asc())
        .first()
    )
    if best_previous_bid and (
        total > best_previous_bid.total_amount
        or (total == best_previous_bid.total_amount and body.transit_time >= best_previous_bid.transit_time)
    ):
        raise HTTPException(
            status_code=400,
            detail="Your new quote must improve your best quote: lower the total price, or keep the price and reduce transit days.",
        )

    bid = Bid(
        rfq_id=rfq_id,
        supplier_id=current_user.id,
        freight_charges=body.freight_charges,
        origin_charges=body.origin_charges,
        destination_charges=body.destination_charges,
        total_amount=total,
        transit_time=body.transit_time,
        validity_date=body.validity_date,
    )
    db.add(bid)
    db.flush()

    # Log bid submission
    log = ActivityLog(
        rfq_id=rfq_id,
        event_type="BID_SUBMITTED",
        description=f"Bid submitted by {current_user.name} ({current_user.company or 'N/A'}) - Total: {total}",
        metadata_json=json.dumps({
            "supplier_id": current_user.id,
            "supplier_name": current_user.name,
            "total_amount": total,
        }),
    )
    db.add(log)
    db.commit()
    db.refresh(bid)

    # Evaluate auction extension
    extension_result = evaluate_extension(db, rfq_id, bid.id)

    # Get updated rankings
    rankings = get_rankings(db, rfq_id)

    # Build bid output
    bid_data = {
        "id": bid.id,
        "rfq_id": bid.rfq_id,
        "supplier_id": bid.supplier_id,
        "supplier_name": current_user.name,
        "supplier_company": current_user.company,
        "freight_charges": bid.freight_charges,
        "origin_charges": bid.origin_charges,
        "destination_charges": bid.destination_charges,
        "total_amount": bid.total_amount,
        "transit_time": bid.transit_time,
        "validity_date": str(bid.validity_date),
        "created_at": str(bid.created_at),
        "rank": next(
            (r["rank"] for r in rankings if r["supplier_id"] == current_user.id),
            0,
        ),
    }

    # Keep competitor identity out of live bidding events; clients reload their role-filtered RFQ.
    public_rankings = [{"rank": item["rank"], "total_amount": item["total_amount"]} for item in rankings]
    await manager.broadcast_to_room(rfq_id, "bid:new", {
        "bid": {"total_amount": bid.total_amount, "transit_time": bid.transit_time, "created_at": to_utc_iso(bid.created_at)},
        "rankings": public_rankings,
    })

    if extension_result:
        db.refresh(rfq)
        await manager.broadcast_to_room(rfq_id, "auction:extended", {
            "rfq_id": rfq_id,
            "new_close_time": str(rfq.bid_close_time),
            "reason": extension_result["reason"],
            "previous_close_time": extension_result["previous_close_time"],
        })

    return {
        "bid": bid_data,
        "extension": extension_result,
        "rankings": public_rankings,
    }


@my_bids_router.get("/my-bids")
def get_my_bids(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all bids submitted by the current authenticated supplier."""
    now = datetime.now(timezone.utc)
    user_bids = (
        db.query(Bid)
        .filter(Bid.supplier_id == current_user.id)
        .order_by(Bid.created_at.desc())
        .all()
    )

    result = []
    for bid in user_bids:
        rfq = db.query(Rfq).filter(Rfq.id == bid.rfq_id).first()
        if not rfq:
            continue

        all_rfq_bids = (
            db.query(Bid)
            .filter(Bid.rfq_id == bid.rfq_id)
            .order_by(Bid.total_amount.asc(), Bid.transit_time.asc(), Bid.created_at.asc(), Bid.id.asc())
            .all()
        )

        rank = next((idx + 1 for idx, b in enumerate(all_rfq_bids) if b.id == bid.id), 0)

        close_time = rfq.bid_close_time
        if close_time.tzinfo is None:
            close_time = close_time.replace(tzinfo=timezone.utc)

        is_live = rfq.status == "ACTIVE" and close_time > now

        result.append({
            "id": bid.id,
            "rfq_id": bid.rfq_id,
            "rfq_name": rfq.name,
            "rfq_reference_id": rfq.reference_id,
            "rfq_status": rfq.status,
            "bid_close_time": to_utc_iso(rfq.bid_close_time),
            "pickup_date": to_utc_iso(rfq.pickup_date),
            "freight_charges": bid.freight_charges,
            "origin_charges": bid.origin_charges,
            "destination_charges": bid.destination_charges,
            "total_amount": bid.total_amount,
            "transit_time": bid.transit_time,
            "validity_date": to_utc_iso(bid.validity_date),
            "created_at": to_utc_iso(bid.created_at),
            "rank": rank,
            "is_winning": rank == 1,
            "is_auction_live": is_live,
            "total_quotes_in_rfq": len(all_rfq_bids),
            "lowest_rfq_quote": all_rfq_bids[0].total_amount if all_rfq_bids else None,
        })

    return result


