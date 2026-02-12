from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ProductBase(BaseModel):
    name: str
    description: str
    price: float
    original_price: Optional[float] = None
    category: str
    image_url: str
    stock: int = 0
    is_active: bool = True

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    is_active: Optional[bool] = None

class Product(ProductBase):
    id: int
    seller_id: int
    price_flag: str
    avg_rating: float
    review_count: int
    sold_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True
