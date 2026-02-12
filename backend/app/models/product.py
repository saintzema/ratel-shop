from sqlalchemy import Boolean, Column, Integer, String, Enum, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("sellers.id"))
    name = Column(String, index=True)
    description = Column(Text)
    price = Column(Float)
    original_price = Column(Float, nullable=True)
    recommended_price = Column(Float, nullable=True) # AI suggestion
    category = Column(String, index=True)
    image_url = Column(String)
    images = Column(String, nullable=True) # JSON stored as string for MVP
    stock = Column(Integer, default=0)
    price_flag = Column(String, default="none") # fair, overpriced, suspicious, none
    is_active = Column(Boolean, default=True)
    avg_rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)
    sold_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    seller = relationship("Seller", back_populates="products")
    reviews = relationship("Review", back_populates="product")
    cart_items = relationship("CartItem", back_populates="product")
    order_items = relationship("OrderItem", back_populates="product")
