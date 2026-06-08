"""
ZEMA 360 orchestrator — the continuous seller-lifecycle pipeline.

    Phase 1  ingest()    seller WhatsApps product photos + KYC docs
                         -> Qwen-VL parses -> structured listing
    Phase 2  assess()    Qwen scores seller trust/risk + price-intel flags
    Phase 3  negotiate() Sales/Inventory/Finance panel reconciles a credit offer
    Phase 4  approve()   human-in-the-loop checkpoint (WhatsApp/Slack)
    Phase 5  execute()   open escrow + generate branded receipt PDF -> notify

This module is the spine of the demo. W1 wires ingest/assess to Qwen-VL and the
price engine; W2 routes tool calls through the MCP server; W3 fills the live
negotiation loop, persistent memory, and the approval gate.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

from app.zema import agents


class Phase(str, Enum):
    INGEST = "ingest"
    ASSESS = "assess"
    NEGOTIATE = "negotiate"
    AWAITING_APPROVAL = "awaiting_approval"
    EXECUTE = "execute"
    DONE = "done"


@dataclass
class PipelineState:
    seller_id: str
    phase: Phase = Phase.INGEST
    listing: dict[str, Any] = field(default_factory=dict)
    assessment: dict[str, Any] = field(default_factory=dict)
    offer: dict[str, Any] = field(default_factory=dict)
    positions: list[dict[str, Any]] = field(default_factory=list)
    requires_human: bool = False
    approval_request_id: Optional[str] = None
    log: list[str] = field(default_factory=list)

    def note(self, msg: str) -> None:
        self.log.append(msg)


class Orchestrator:
    """Drives one seller through the ZEMA lifecycle. Stateless between calls;
    state is passed in/out so it can run on Function Compute (no sticky memory)."""

    def __init__(self, panel: Optional[list[agents.BaseAgent]] = None):
        self.panel = panel or agents.PANEL

    async def ingest(self, state: PipelineState, *, image_urls: list[str], kyc_urls: list[str]) -> PipelineState:
        """Phase 1 — Qwen-VL turns raw photos + KYC docs into a structured listing.
        W4 implements the real vision call; scaffold records intent."""
        state.note(f"ingest: {len(image_urls)} photos, {len(kyc_urls)} kyc docs")
        # TODO(W4): qwen_client.vision_json(...) -> listing + kyc verification
        state.phase = Phase.ASSESS
        return state

    async def assess(self, state: PipelineState) -> PipelineState:
        """Phase 2 — trust/risk scoring + price-intel overpricing flag."""
        state.note("assess: scoring seller trust/risk + price intelligence")
        # TODO(W1/W3): call scoring + price engine; populate state.assessment
        state.phase = Phase.NEGOTIATE
        return state

    async def negotiate(self, state: PipelineState, *, deal: dict[str, Any], memory: Optional[dict[str, Any]] = None) -> PipelineState:
        """Phase 3 — the Sales/Inventory/Finance panel reconciles a credit offer."""
        positions = []
        for agent in self.panel:
            pos = await agent.evaluate(deal, memory)
            positions.append(pos.__dict__)
        state.positions = positions

        # A Finance veto or any rejection, or a high risk score, forces a human.
        finance = next((p for p in positions if p["agent"] == "finance"), None)
        rejected = any(p["stance"] == "reject" for p in positions)
        high_risk = bool(finance and (finance.get("risk_score") or 0) >= 60)
        state.requires_human = rejected or high_risk
        state.offer = (finance or {}).get("proposal", {}) if state.requires_human else _merge_proposals(positions)

        state.phase = Phase.AWAITING_APPROVAL if state.requires_human else Phase.EXECUTE
        state.note(f"negotiate: requires_human={state.requires_human}")
        return state

    async def execute(self, state: PipelineState) -> PipelineState:
        """Phase 5 — open escrow + generate receipt PDF + notify buyer/seller."""
        state.note("execute: opening escrow + generating receipt")
        # TODO(W3): create order/escrow via MCP tools, render PDF to OSS, send WhatsApp
        state.phase = Phase.DONE
        return state


def _merge_proposals(positions: list[dict[str, Any]]) -> dict[str, Any]:
    """Naive reconciliation: Sales sets the headline, Finance clamps the floor.
    W3 replaces this with a real negotiation transcript."""
    sales = next((p for p in positions if p["agent"] == "sales"), {})
    finance = next((p for p in positions if p["agent"] == "finance"), {})
    offer = dict(sales.get("proposal", {}))
    floor = (finance.get("proposal", {}) or {}).get("min_price")
    if floor is not None and offer.get("price") is not None:
        offer["price"] = max(offer["price"], floor)
    return offer
