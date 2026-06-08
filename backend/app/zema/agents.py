"""
ZEMA sub-agents.

Three specialists negotiate every credit deal, each with a narrow mandate and
its own system prompt. They run on Qwen and return structured positions; the
orchestrator reconciles them (and escalates to a human when they disagree or
when risk is high).

    SalesAgent     — wants to close the sale; proposes price/terms
    InventoryAgent — guards stock reality and fulfilment feasibility
    FinanceAgent   — guards margin and buyer credit risk; can veto

W3 fills in the live negotiation loop + memory. This module defines the stable
contract the orchestrator builds on.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional

from app.zema import qwen_client


@dataclass
class AgentPosition:
    agent: str
    stance: str                       # "approve" | "counter" | "reject"
    rationale: str
    proposal: dict[str, Any] = field(default_factory=dict)
    risk_score: Optional[float] = None  # 0-100, where higher = riskier


class BaseAgent:
    name: str = "agent"
    system_prompt: str = ""

    async def evaluate(self, deal: dict[str, Any], memory: Optional[dict[str, Any]] = None) -> AgentPosition:
        """Ask Qwen for this agent's position on the deal."""
        prompt = self._build_prompt(deal, memory or {})
        data = await qwen_client.chat_json(prompt, system=self.system_prompt)
        return AgentPosition(
            agent=self.name,
            stance=str(data.get("stance", "counter")),
            rationale=str(data.get("rationale", "")),
            proposal=data.get("proposal", {}) or {},
            risk_score=data.get("risk_score"),
        )

    def _build_prompt(self, deal: dict[str, Any], memory: dict[str, Any]) -> str:
        import json
        return (
            "DEAL:\n" + json.dumps(deal, ensure_ascii=False) + "\n\n"
            "MEMORY (prior interactions, may be empty):\n" + json.dumps(memory, ensure_ascii=False) + "\n\n"
            'Respond as strict JSON: {"stance":"approve|counter|reject",'
            '"rationale":"...","proposal":{...},"risk_score":0-100}'
        )


class SalesAgent(BaseAgent):
    name = "sales"
    system_prompt = (
        "You are FairPrice's Sales agent. Your mandate is to close the sale and keep the "
        "buyer happy. Push for the deal, but never below the floor set by Finance. Propose "
        "price, quantity, and credit terms that maximise conversion."
    )


class InventoryAgent(BaseAgent):
    name = "inventory"
    system_prompt = (
        "You are FairPrice's Inventory agent. Your mandate is fulfilment reality: confirm the "
        "seller actually has stock, lead times are honest, and the promised quantity can ship. "
        "Counter or reject deals that the catalogue cannot back."
    )


class FinanceAgent(BaseAgent):
    name = "finance"
    system_prompt = (
        "You are FairPrice's Finance & risk agent. Your mandate is protecting margin and "
        "managing buyer credit risk on 'buy now, pay later'. You may VETO. Compute a buyer "
        "risk score and set the minimum acceptable margin. Reject deals that breach either."
    )


# The standing panel used by the orchestrator.
PANEL: list[BaseAgent] = [SalesAgent(), InventoryAgent(), FinanceAgent()]
