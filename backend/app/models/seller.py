from sqlalchemy import Boolean, Column, Integer, String, Enum, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Seller(Base):
    __tablename__ = "sellers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    business_name = Column(String, index=True)
    description = Column(String)
    logo_url = Column(String, nullable=True)
    category = Column(String, index=True)
    verified = Column(Boolean, default=False)
    trust_score = Column(Integer, default=50) # 0-100
    status = Column(String, default="pending") # pending, active, frozen, banned
    kyc_status = Column(String, default="not_submitted")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="seller_profile")
    products = relationship("Product", back_populates="seller")
    kyc_submission = relationship("KYCSubmission", back_populates="seller", uselist=False)
