from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class MessageBase(BaseModel):
    sender: str
    text: str


class MessageCreate(MessageBase):
    pass


class MessageOut(MessageBase):
    id: int
    conversation_id: int
    timestamp: datetime

    class Config:
        from_attributes = True


class ConversationBase(BaseModel):
    user_email: str
    order_id: Optional[str] = None
    product_name: Optional[str] = None
    product_image: Optional[str] = None


class ConversationCreate(ConversationBase):
    initial_message: Optional[str] = None


class ConversationOut(ConversationBase):
    id: int
    unread_count: int
    last_updated: datetime
    created_at: datetime
    messages: List[MessageOut] = []

    class Config:
        from_attributes = True


class ConversationSummary(ConversationBase):
    """Lightweight summary without full message list."""
    id: int
    unread_count: int
    last_updated: datetime

    class Config:
        from_attributes = True
