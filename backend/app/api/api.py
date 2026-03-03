from fastapi import APIRouter
from app.api.endpoints import products, sellers, notifications, conversations

api_router = APIRouter()
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(sellers.router, prefix="/sellers", tags=["sellers"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(conversations.router, prefix="/conversations", tags=["conversations"])
