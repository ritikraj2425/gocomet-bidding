import asyncio
import json
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, SessionLocal, engine
from app.models import ActivityLog, Rfq
from app.routes import activity, auth, bids, rfqs, settings, users
from app.websocket_manager import manager


def check_auction_statuses():
    """Background job: auto-activate and auto-close auctions based on time."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)

        # DRAFT -> ACTIVE when bid_start_time has passed
        drafts = db.query(Rfq).filter(Rfq.status == "DRAFT").all()
        for rfq in drafts:
            start = rfq.bid_start_time
            if start.tzinfo is None:
                start = start.replace(tzinfo=timezone.utc)
            if now >= start:
                rfq.status = "ACTIVE"
                db.add(ActivityLog(
                    rfq_id=rfq.id,
                    event_type="AUCTION_STARTED",
                    description="Auction auto-started (bid start time reached)",
                ))

        # ACTIVE -> CLOSED when bid_close_time has passed
        actives = db.query(Rfq).filter(Rfq.status == "ACTIVE").all()
        for rfq in actives:
            forced = rfq.forced_bid_close_time
            close = rfq.bid_close_time
            if forced.tzinfo is None:
                forced = forced.replace(tzinfo=timezone.utc)
            if close.tzinfo is None:
                close = close.replace(tzinfo=timezone.utc)

            if now >= forced:
                rfq.status = "FORCE_CLOSED"
                db.add(ActivityLog(
                    rfq_id=rfq.id,
                    event_type="AUCTION_FORCE_CLOSED",
                    description="Auction force-closed (forced bid close time reached)",
                ))
            elif now >= close:
                rfq.status = "CLOSED"
                db.add(ActivityLog(
                    rfq_id=rfq.id,
                    event_type="AUCTION_CLOSED",
                    description="Auction closed (bid close time reached)",
                ))

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Scheduler error: {e}")
    finally:
        db.close()


scheduler = BackgroundScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    Base.metadata.create_all(bind=engine)
    scheduler.add_job(check_auction_statuses, "interval", seconds=15)
    scheduler.start()
    print("Auction status scheduler started (every 15s)")
    yield
    # Shutdown
    scheduler.shutdown()


app = FastAPI(
    title="RFQ British Auction API",
    description="Backend API for the British Auction RFQ System",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(rfqs.router)
app.include_router(bids.router)
app.include_router(bids.my_bids_router)
app.include_router(activity.router)
app.include_router(settings.router)



# WebSocket endpoint
@app.websocket("/ws/{rfq_id}")
async def websocket_endpoint(websocket: WebSocket, rfq_id: str):
    await manager.connect(websocket, rfq_id)
    try:
        while True:
            # Keep connection alive, listen for client messages
            data = await websocket.receive_text()
            # Clients can send ping/pong or other messages
    except WebSocketDisconnect:
        manager.disconnect(websocket, rfq_id)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=3000, reload=True)

