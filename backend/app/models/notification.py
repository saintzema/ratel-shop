from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, index=True, nullable=False)  # recipient
    type = Column(String, default="system")  # system, order, negotiation, message, promotion
    message = Column(Text, nullable=False)
    link = Column(String, nullable=True)  # optional deep-link e.g. /account/orders/123
    read = Column(Boolean, default=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
