import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False, default="SUPPLIER")  # ADMIN | SUPPLIER
    company = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    created_rfqs = relationship("Rfq", back_populates="created_by")
    bids = relationship("Bid", back_populates="supplier")


class Rfq(Base):
    __tablename__ = "rfqs"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    reference_id = Column(String, unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    bid_start_time = Column(DateTime, nullable=False)
    bid_close_time = Column(DateTime, nullable=False)
    original_bid_close_time = Column(DateTime, nullable=False)
    forced_bid_close_time = Column(DateTime, nullable=False)
    pickup_date = Column(DateTime, nullable=False)
    status = Column(String, nullable=False, default="DRAFT")  # DRAFT | ACTIVE | CLOSED | FORCE_CLOSED
    created_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    created_by = relationship("User", back_populates="created_rfqs")
    auction_config = relationship("AuctionConfig", back_populates="rfq", uselist=False, cascade="all, delete-orphan")
    bids = relationship("Bid", back_populates="rfq", cascade="all, delete-orphan", order_by="(Bid.total_amount, Bid.transit_time, Bid.created_at, Bid.id)")
    activity_logs = relationship("ActivityLog", back_populates="rfq", cascade="all, delete-orphan", order_by="ActivityLog.created_at.desc()")


class AuctionConfig(Base):
    __tablename__ = "auction_configs"

    id = Column(String, primary_key=True, default=generate_uuid)
    rfq_id = Column(String, ForeignKey("rfqs.id", ondelete="CASCADE"), unique=True, nullable=False)
    trigger_window_mins = Column(Integer, nullable=False)  # X minutes
    extension_mins = Column(Integer, nullable=False)  # Y minutes
    trigger_type = Column(String, nullable=False, default="BID_RECEIVED")  # BID_RECEIVED | ANY_RANK_CHANGE | L1_RANK_CHANGE

    rfq = relationship("Rfq", back_populates="auction_config")


class Bid(Base):
    __tablename__ = "bids"

    id = Column(String, primary_key=True, default=generate_uuid)
    rfq_id = Column(String, ForeignKey("rfqs.id", ondelete="CASCADE"), nullable=False)
    supplier_id = Column(String, ForeignKey("users.id"), nullable=False)
    freight_charges = Column(Float, nullable=False)
    origin_charges = Column(Float, nullable=False)
    destination_charges = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    transit_time = Column(Integer, nullable=False)  # days
    validity_date = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=utcnow)

    rfq = relationship("Rfq", back_populates="bids")
    supplier = relationship("User", back_populates="bids")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    rfq_id = Column(String, ForeignKey("rfqs.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String, nullable=False)  # BID_SUBMITTED | TIME_EXTENDED | AUCTION_STARTED | AUCTION_CLOSED | AUCTION_FORCE_CLOSED | RANK_CHANGED
    description = Column(Text, nullable=False)
    metadata_json = Column(Text, nullable=True)  # JSON string
    created_at = Column(DateTime, default=utcnow)

    rfq = relationship("Rfq", back_populates="activity_logs")


class Setting(Base):
    __tablename__ = "settings"

    id = Column(String, primary_key=True, default=generate_uuid)
    key = Column(String, unique=True, nullable=False, index=True)
    value = Column(String, nullable=False)
    label = Column(String, nullable=False)
    input_type = Column(String, nullable=False, default="text")  # text | number | color | boolean | select
    category = Column(String, nullable=False, default="general")  # general | theme | auction
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

