from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_admin
from app.database import get_db
from app.models import Setting, User
from app.schemas import SettingCreate, SettingOut, SettingUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=list[SettingOut])
def list_settings(
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    query = db.query(Setting)
    if category:
        query = query.filter(Setting.category == category)
    return [SettingOut.model_validate(s) for s in query.order_by(Setting.category, Setting.key).all()]


@router.post("", response_model=SettingOut)
def create_setting(
    body: SettingCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    existing = db.query(Setting).filter(Setting.key == body.key).first()
    if existing:
        raise HTTPException(status_code=400, detail="Setting key already exists")

    setting = Setting(
        key=body.key,
        value=body.value,
        label=body.label,
        input_type=body.input_type,
        category=body.category,
    )
    db.add(setting)
    db.commit()
    db.refresh(setting)
    return SettingOut.model_validate(setting)


@router.put("/{key}", response_model=SettingOut)
def update_setting(
    key: str,
    body: SettingUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    setting = db.query(Setting).filter(Setting.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")

    setting.value = body.value
    db.commit()
    db.refresh(setting)
    return SettingOut.model_validate(setting)

