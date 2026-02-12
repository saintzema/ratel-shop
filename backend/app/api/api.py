from fastapi import APIRouter
from app.api.endpoints import products, sellers

api_router = APIRouter()
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(sellers.router, prefix="/sellers", tags=["sellers"])
