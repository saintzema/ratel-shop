from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.seller import Seller
from app.schemas.seller import Seller as SellerSchema, SellerCreate

router = APIRouter()

@router.get("/", response_model=List[SellerSchema])
def read_sellers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    sellers = db.query(Seller).offset(skip).limit(limit).all()
    return sellers

@router.post("/", response_model=SellerSchema)
def create_seller(seller: SellerCreate, db: Session = Depends(get_db)):
    db_seller = Seller(**seller.dict(), verified=False, trust_score=50, status="pending")
    db.add(db_seller)
    db.commit()
    db.refresh(db_seller)
    return db_seller

@router.get("/{seller_id}", response_model=SellerSchema)
def read_seller(seller_id: int, db: Session = Depends(get_db)):
    seller = db.query(Seller).filter(Seller.id == seller_id).first()
    if seller is None:
        raise HTTPException(status_code=404, detail="Seller not found")
    return seller
