from sqlalchemy import Boolean, Column, Integer, String, Enum, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id")) # Customer who wrote it
    product_id = Column(Integer, ForeignKey("products.id"))
    rating = Column(Integer) # 1-5
    title = Column(String)
    body = Column(Text)
    verified_purchase = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="reviews")
    product = relationship("Product", back_populates="reviews")

class KYCSubmission(Base):
    __tablename__ = "kyc_submissions"

    id = Column(Integer, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("sellers.id"))
    id_type = Column(String) # nin, passport, drivers_license
    id_number = Column(String)
    document_url = Column(String)
    status = Column(String, default="pending") # pending, approved, rejected
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True) # Admin ID
    review_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    seller = relationship("Seller", back_populates="kyc_submission")
