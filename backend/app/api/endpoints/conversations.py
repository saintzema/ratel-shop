from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from app.core.database import get_db
from app.models.conversation import Conversation, Message
from app.schemas.conversation import (
    ConversationOut, ConversationCreate, ConversationSummary,
    MessageCreate, MessageOut
)

router = APIRouter()


@router.get("/", response_model=List[ConversationSummary])
def get_conversations(
    user_email: str = Query(...),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get all conversations for a user (summary — no messages)."""
    return (
        db.query(Conversation)
        .filter(Conversation.user_email == user_email)
        .order_by(Conversation.last_updated.desc())
        .offset(skip).limit(limit).all()
    )


@router.get("/unread-count")
def get_total_unread(
    user_email: str = Query(...),
    db: Session = Depends(get_db)
):
    """Get total unread message count across all conversations."""
    from sqlalchemy import func
    result = db.query(func.coalesce(func.sum(Conversation.unread_count), 0)).filter(
        Conversation.user_email == user_email
    ).scalar()
    return {"unread_count": int(result)}


@router.get("/{conversation_id}", response_model=ConversationOut)
def get_conversation(conversation_id: int, db: Session = Depends(get_db)):
    """Get a single conversation with all messages."""
    conv = (
        db.query(Conversation)
        .options(joinedload(Conversation.messages))
        .filter(Conversation.id == conversation_id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


@router.post("/", response_model=ConversationOut)
def create_conversation(data: ConversationCreate, db: Session = Depends(get_db)):
    """Create a new conversation, optionally with an initial message."""
    # Check if conversation for this order already exists
    if data.order_id:
        existing = db.query(Conversation).filter(
            Conversation.user_email == data.user_email,
            Conversation.order_id == data.order_id
        ).first()
        if existing:
            return existing

    conv = Conversation(
        user_email=data.user_email,
        order_id=data.order_id,
        product_name=data.product_name,
        product_image=data.product_image,
    )
    db.add(conv)
    db.flush()

    if data.initial_message:
        msg = Message(
            conversation_id=conv.id,
            sender="user",
            text=data.initial_message,
        )
        db.add(msg)

    db.commit()
    db.refresh(conv)
    return conv


@router.post("/{conversation_id}/messages", response_model=MessageOut)
def send_message(conversation_id: int, message: MessageCreate, db: Session = Depends(get_db)):
    """Send a message in a conversation."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    msg = Message(
        conversation_id=conversation_id,
        sender=message.sender,
        text=message.text,
    )
    db.add(msg)

    # If the sender is not the user, increment unread
    if message.sender != "user":
        conv.unread_count = (conv.unread_count or 0) + 1

    db.commit()
    db.refresh(msg)
    return msg


@router.patch("/{conversation_id}/read")
def mark_conversation_read(conversation_id: int, db: Session = Depends(get_db)):
    """Mark all messages in a conversation as read (reset unread count)."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv.unread_count = 0
    db.commit()
    return {"ok": True}
