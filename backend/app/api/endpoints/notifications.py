from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.notification import Notification
from app.schemas.notification import NotificationOut, NotificationCreate, NotificationUpdate

router = APIRouter()


@router.get("/", response_model=List[NotificationOut])
def get_notifications(
    user_email: str = Query(..., description="Email of the user to fetch notifications for"),
    unread_only: bool = Query(False, description="If true, only return unread notifications"),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get all notifications for a user, sorted newest first."""
    query = db.query(Notification).filter(Notification.user_email == user_email)
    if unread_only:
        query = query.filter(Notification.read == False)
    return query.order_by(Notification.timestamp.desc()).offset(skip).limit(limit).all()


@router.get("/unread-count")
def get_unread_count(
    user_email: str = Query(...),
    db: Session = Depends(get_db)
):
    """Get just the unread count for badge display."""
    count = db.query(Notification).filter(
        Notification.user_email == user_email,
        Notification.read == False
    ).count()
    return {"unread_count": count}


@router.post("/", response_model=NotificationOut)
def create_notification(notification: NotificationCreate, db: Session = Depends(get_db)):
    """Create a new notification."""
    db_notif = Notification(**notification.dict())
    db.add(db_notif)
    db.commit()
    db.refresh(db_notif)
    return db_notif


@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_as_read(notification_id: int, db: Session = Depends(get_db)):
    """Mark a single notification as read."""
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.read = True
    db.commit()
    db.refresh(notif)
    return notif


@router.patch("/mark-all-read")
def mark_all_read(
    user_email: str = Query(...),
    db: Session = Depends(get_db)
):
    """Mark all notifications for a user as read."""
    updated = db.query(Notification).filter(
        Notification.user_email == user_email,
        Notification.read == False
    ).update({"read": True})
    db.commit()
    return {"updated": updated}


@router.delete("/{notification_id}")
def delete_notification(notification_id: int, db: Session = Depends(get_db)):
    """Delete a single notification."""
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(notif)
    db.commit()
    return {"ok": True}
