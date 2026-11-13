"""British Auction Engine - handles extension trigger logic."""

import json
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models import ActivityLog, Bid, Rfq


def get_rankings(db: Session, rfq_id: str) -> list[dict]:
    """Rank by price, then shorter transit, then earliest submission."""
    bids = (
        db.query(Bid)
        .filter(Bid.rfq_id == rfq_id)
        .order_by(Bid.total_amount.asc(), Bid.transit_time.asc(), Bid.created_at.asc(), Bid.id.asc())
        .all()
    )
    rankings = []
    for i, bid in enumerate(bids):
        rankings.append({
            "rank": i + 1,
            "bid_id": bid.id,
            "supplier_id": bid.supplier_id,
            "total_amount": bid.total_amount,
        })
    return rankings


def evaluate_extension(db: Session, rfq_id: str, new_bid_id: str) -> dict | None:
    """
    Evaluate whether the auction time should be extended after a new bid.

    Returns extension info dict if extended, None otherwise.
    """
    rfq = db.query(Rfq).filter(Rfq.id == rfq_id).first()
    if not rfq or not rfq.auction_config:
        return None

    if rfq.status != "ACTIVE":
        return None

    config = rfq.auction_config
    now = datetime.now(timezone.utc)
    bid_close = rfq.bid_close_time
    if bid_close.tzinfo is None:
        bid_close = bid_close.replace(tzinfo=timezone.utc)

    forced_close = rfq.forced_bid_close_time
    if forced_close.tzinfo is None:
        forced_close = forced_close.replace(tzinfo=timezone.utc)

    # Check if we are within the trigger window (last X minutes before close)
    trigger_start = bid_close - timedelta(minutes=config.trigger_window_mins)
    if now < trigger_start:
        return None  # Not in trigger window yet

    if now > bid_close:
        return None  # Already past close time

    # Determine if the trigger condition is met
    trigger_type = config.trigger_type
    should_extend = False
    reason = ""

    if trigger_type == "BID_RECEIVED":
        # Any bid in the trigger window triggers extension
        should_extend = True
        reason = "New bid received during trigger window"

    elif trigger_type == "ANY_RANK_CHANGE":
        # Check if any rank changed after this bid
        current_rankings = get_rankings(db, rfq_id)

        # Get rankings without the new bid
        all_bids = (
            db.query(Bid)
            .filter(Bid.rfq_id == rfq_id, Bid.id != new_bid_id)
            .order_by(Bid.total_amount.asc(), Bid.transit_time.asc(), Bid.created_at.asc(), Bid.id.asc())
            .all()
        )
        old_rankings = []
        for i, bid in enumerate(all_bids):
            old_rankings.append({
                "rank": i + 1,
                "supplier_id": bid.supplier_id,
                "total_amount": bid.total_amount,
            })

        # Compare: if any supplier changed rank position
        old_rank_map = {r["supplier_id"]: r["rank"] for r in old_rankings}
        new_rank_map = {r["supplier_id"]: r["rank"] for r in current_rankings}

        for supplier_id, new_rank in new_rank_map.items():
            old_rank = old_rank_map.get(supplier_id)
            if old_rank is None or old_rank != new_rank:
                should_extend = True
                reason = "Supplier ranking changed during trigger window"
                break

    elif trigger_type == "L1_RANK_CHANGE":
        # Check if L1 (lowest bidder) changed
        current_rankings = get_rankings(db, rfq_id)

        all_bids = (
            db.query(Bid)
            .filter(Bid.rfq_id == rfq_id, Bid.id != new_bid_id)
            .order_by(Bid.total_amount.asc(), Bid.transit_time.asc(), Bid.created_at.asc(), Bid.id.asc())
            .all()
        )

        old_l1 = all_bids[0].supplier_id if all_bids else None
        new_l1 = current_rankings[0]["supplier_id"] if current_rankings else None

        if old_l1 != new_l1:
            should_extend = True
            reason = "Lowest bidder (L1) changed during trigger window"

    if not should_extend:
        return None

    # Calculate new close time
    new_close = bid_close + timedelta(minutes=config.extension_mins)

    # Cap at forced close time
    if new_close > forced_close:
        new_close = forced_close

    # Don't extend if already at forced close
    if bid_close >= forced_close:
        return None

    # Update RFQ bid close time
    rfq.bid_close_time = new_close
    db.commit()

    # Log the extension
    log = ActivityLog(
        rfq_id=rfq_id,
        event_type="TIME_EXTENDED",
        description=reason,
        metadata_json=json.dumps({
            "previous_close_time": str(bid_close),
            "new_close_time": str(new_close),
            "trigger_type": trigger_type,
            "trigger_window_mins": config.trigger_window_mins,
            "extension_mins": config.extension_mins,
        }),
    )
    db.add(log)
    db.commit()

    return {
        "extended": True,
        "reason": reason,
        "previous_close_time": str(bid_close),
        "new_close_time": str(new_close),
        "forced_close_time": str(forced_close),
    }

