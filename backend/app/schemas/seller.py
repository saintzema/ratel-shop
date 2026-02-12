from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class SellerBase(BaseModel):
    business_name: str
    description: str
    category: str
    logo_url: Optional[str] = None

class SellerCreate(SellerBase):
    user_id: int
    pass

class SellerUpdate(BaseModel):
    business_name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None

class Seller(SellerBase):
    id: int
    user_id: int
    verified: bool
    trust_score: int
    status: str
    kyc_status: str
    created_at: datetime
    
    class Config:
        from_attributes = True
