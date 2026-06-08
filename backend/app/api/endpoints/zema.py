"""
ZEMA 360 autopilot endpoints.

These drive the seller-lifecycle pipeline that runs on Alibaba Cloud Function
Compute. The pipeline reasons on Qwen (Model Studio / DashScope) and persists
artifacts to Alibaba Cloud OSS.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Optional

from app.zema import qwen_client, oss_client
from app.zema.orchestrator import Orchestrator, PipelineState

router = APIRouter()


@router.get("/health")
def zema_health() -> dict[str, Any]:
    """Liveness + which Alibaba Cloud services are wired in this deployment."""
    return {
        "status": "ok",
        "engine": "ZEMA 360",
        "qwen_configured": qwen_client.is_configured(),
        "oss_configured": oss_client.is_configured(),
    }


class IngestRequest(BaseModel):
    seller_id: str
    image_urls: list[str] = []
    kyc_urls: list[str] = []


@router.post("/ingest")
async def ingest(req: IngestRequest) -> dict[str, Any]:
    """Phase 1 — turn raw seller photos + KYC docs into a structured listing."""
    state = PipelineState(seller_id=req.seller_id)
    orch = Orchestrator()
    state = await orch.ingest(state, image_urls=req.image_urls, kyc_urls=req.kyc_urls)
    state = await orch.assess(state)
    return _state_out(state)


class NegotiateRequest(BaseModel):
    seller_id: str
    deal: dict[str, Any]
    memory: Optional[dict[str, Any]] = None


@router.post("/negotiate")
async def negotiate(req: NegotiateRequest) -> dict[str, Any]:
    """Phase 3 — Sales/Inventory/Finance panel reconciles a credit offer."""
    if not qwen_client.is_configured():
        raise HTTPException(status_code=503, detail="Qwen (DASHSCOPE_API_KEY) not configured")
    state = PipelineState(seller_id=req.seller_id)
    orch = Orchestrator()
    state = await orch.negotiate(state, deal=req.deal, memory=req.memory)
    return _state_out(state)


def _state_out(state: PipelineState) -> dict[str, Any]:
    return {
        "seller_id": state.seller_id,
        "phase": state.phase.value,
        "listing": state.listing,
        "assessment": state.assessment,
        "offer": state.offer,
        "positions": state.positions,
        "requires_human": state.requires_human,
        "approval_request_id": state.approval_request_id,
        "log": state.log,
    }
