from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class NotificationBase(BaseModel):
    user_email: str
    type: str = "system"
    message: str
    link: Optional[str] = None


class NotificationCreate(NotificationBase):
    pass


class NotificationOut(NotificationBase):
    id: int
    read: bool
    timestamp: datetime

    class Config:
        from_attributes = True


class NotificationUpdate(BaseModel):
    read: Optional[bool] = None
