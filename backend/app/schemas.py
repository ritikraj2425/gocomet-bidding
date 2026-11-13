from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: str
    password: str = Field(min_length=6)
    name: str
    role: str = "SUPPLIER"
    company: Optional[str] = None
    phone: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    company: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── User Management ──────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: str
    password: str = Field(min_length=6)
    name: str
    role: str = "SUPPLIER"
    company: Optional[str] = None
    phone: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


# ── Auction Config ───────────────────────────────────────────────────────────

class AuctionConfigSchema(BaseModel):
    trigger_window_mins: int = Field(ge=1)
    extension_mins: int = Field(ge=1)
    trigger_type: str = "BID_RECEIVED"  # BID_RECEIVED | ANY_RANK_CHANGE | L1_RANK_CHANGE

    class Config:
        from_attributes = True


class AuctionConfigOut(AuctionConfigSchema):
    id: str
    rfq_id: str


# ── RFQ ──────────────────────────────────────────────────────────────────────

class RfqCreate(BaseModel):
    name: str
    description: Optional[str] = None
    bid_start_time: datetime
    bid_close_time: datetime
    forced_bid_close_time: datetime
    pickup_date: datetime
    auction_config: AuctionConfigSchema


class RfqUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    bid_start_time: Optional[datetime] = None
    bid_close_time: Optional[datetime] = None
    forced_bid_close_time: Optional[datetime] = None
    pickup_date: Optional[datetime] = None
    auction_config: Optional[AuctionConfigSchema] = None


class RfqOut(BaseModel):
    id: str
    name: str
    reference_id: str
    description: Optional[str] = None
    bid_start_time: datetime
    bid_close_time: datetime
    original_bid_close_time: datetime
    forced_bid_close_time: datetime
    pickup_date: datetime
    status: str
    created_by_id: str
    created_at: datetime
    auction_config: Optional[AuctionConfigOut] = None
    bid_count: int = 0
    lowest_bid: Optional[float] = None
    created_by_name: Optional[str] = None

    class Config:
        from_attributes = True


# ── Bid ──────────────────────────────────────────────────────────────────────

class BidCreate(BaseModel):
    freight_charges: float = Field(ge=0)
    origin_charges: float = Field(ge=0)
    destination_charges: float = Field(ge=0)
    transit_time: int = Field(ge=1)
    validity_date: datetime


class BidOut(BaseModel):
    id: str
    rfq_id: str
    supplier_id: str
    supplier_name: Optional[str] = None
    supplier_company: Optional[str] = None
    freight_charges: float
    origin_charges: float
    destination_charges: float
    total_amount: float
    transit_time: int
    validity_date: datetime
    created_at: datetime
    rank: int = 0

    class Config:
        from_attributes = True


# ── Activity Log ─────────────────────────────────────────────────────────────

class ActivityLogOut(BaseModel):
    id: str
    rfq_id: str
    event_type: str
    description: str
    metadata_json: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Settings ─────────────────────────────────────────────────────────────────

class SettingCreate(BaseModel):
    key: str
    value: str
    label: str
    input_type: str = "text"
    category: str = "general"


class SettingUpdate(BaseModel):
    value: str


class SettingOut(BaseModel):
    id: str
    key: str
    value: str
    label: str
    input_type: str
    category: str

    class Config:
        from_attributes = True


# ── Generic Response ─────────────────────────────────────────────────────────

class ApiResponse(BaseModel):
    success: bool
    data: Optional[object] = None
    error: Optional[str] = None

