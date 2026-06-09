"""
ZEMA 360 MCP Server — FairPrice store operations over Model Context Protocol.

Exposes 8 real store tools that Qwen agents call during the Ops Squad pipeline:

    get_order          → fetch live order + escrow state from Postgres
    get_inventory      → query product stock + price from catalogue
    set_tracking       → write shipment tracking data to an order
    release_escrow     → trigger escrow fund release (buyer confirmed)
    paystack_payout    → initiate Paystack bank transfer to seller
    process_refund     → refund buyer via Paystack + update order status
    send_whatsapp      → send an approval request or notification via WhatsApp
    create_negotiation → open a new price-negotiation thread

Every tool calls the existing FairPrice Next.js API routes with a service token.
This keeps the Python agent layer stateless — the Next.js app owns the DB and
payment state; the agents orchestrate by calling its real endpoints.

Run as a standalone MCP server (stdio transport) for the hackathon demo:

    python -m app.zema.mcp_server

Or import and embed the server object directly in the FastAPI app for
in-process tool registration.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Any

import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import TextContent, Tool

from app.core.config import settings

log = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# HTTP client helper
# ─────────────────────────────────────────────────────────────────────────────

_CLIENT: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _CLIENT
    if _CLIENT is None or _CLIENT.is_closed:
        _CLIENT = httpx.AsyncClient(
            base_url=settings.FAIRPRICE_API_URL.rstrip("/"),
            headers={
                "Authorization": f"Bearer {settings.ZEMA_SERVICE_TOKEN}",
                "Content-Type": "application/json",
                "X-Zema-Agent": "mcp-server/1.0",
            },
            timeout=30.0,
        )
    return _CLIENT


async def _call(
    method: str,
    path: str,
    *,
    params: dict[str, Any] | None = None,
    json_body: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Fire an authenticated request to the FairPrice Next.js API with retries."""
    client = _get_client()
    last_err: Exception | None = None
    for attempt in range(3):
        try:
            resp = await client.request(
                method,
                path,
                params=params,
                json=json_body,
            )
            if resp.status_code == 401:
                return {"error": "service_token_invalid", "status": 401}
            if resp.status_code == 404:
                return {"error": "not_found", "status": 404}
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as exc:
            last_err = exc
            log.warning("MCP tool HTTP %s on attempt %d: %s", exc.response.status_code, attempt + 1, path)
        except httpx.RequestError as exc:
            last_err = exc
            log.warning("MCP tool request error attempt %d: %s", attempt + 1, str(exc))
    return {"error": str(last_err), "status": 503}


# ─────────────────────────────────────────────────────────────────────────────
# Tool implementations
# ─────────────────────────────────────────────────────────────────────────────


async def _get_order(order_id: str) -> dict[str, Any]:
    """
    Return the full order record including escrow status, buyer/seller IDs,
    tracking, and payment reference.  Used by Inventory + Finance agents.
    """
    data = await _call("GET", f"/api/orders/{order_id}")
    if "error" in data:
        return data
    return {
        "order_id": data.get("id"),
        "status": data.get("status"),
        "escrow_status": data.get("escrowStatus"),
        "amount": data.get("amount"),
        "currency": "NGN",
        "seller_id": data.get("sellerId"),
        "buyer_id": data.get("customerId"),
        "product_id": data.get("productId"),
        "quantity": data.get("quantity", 1),
        "tracking_id": data.get("trackingId"),
        "carrier": data.get("carrier"),
        "payment_reference": data.get("paymentReference"),
        "created_at": data.get("createdAt"),
    }


async def _get_inventory(product_id: str) -> dict[str, Any]:
    """
    Return product stock level, price, and active status.
    Used by Inventory agent to verify fulfilment feasibility.
    """
    data = await _call("GET", f"/api/products/{product_id}")
    if "error" in data:
        return data
    # Handle both array response (search) and single-object (direct fetch)
    product = data[0] if isinstance(data, list) else data
    return {
        "product_id": product.get("id"),
        "name": product.get("name"),
        "price": product.get("price"),
        "stock": product.get("stock", 0),
        "is_active": product.get("isActive", product.get("is_active", False)),
        "seller_id": product.get("sellerId", product.get("seller_id")),
        "category": product.get("category"),
        "recommended_price": product.get("recommendedPrice", product.get("recommended_price")),
    }


async def _set_tracking(
    order_id: str,
    tracking_id: str,
    carrier: str,
    tracking_steps: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """
    Write shipment tracking data to an order.  Used by Fulfilment agent after
    the seller confirms dispatch.
    """
    return await _call(
        "PATCH",
        "/api/orders",
        json_body={
            "id": order_id,
            "trackingId": tracking_id,
            "carrier": carrier,
            "trackingSteps": tracking_steps or [],
            "status": "shipped",
        },
    )


async def _release_escrow(order_id: str, released_by: str = "agent") -> dict[str, Any]:
    """
    Release funds held in escrow to the seller.  Triggered when the buyer
    confirms receipt OR when the Finance agent auto-releases after the
    no-dispute window.  Calls EscrowService.releaseFunds internally.
    """
    return await _call(
        "POST",
        "/api/escrow/release",
        json_body={"orderId": order_id, "releasedBy": released_by},
    )


async def _paystack_payout(
    seller_id: str,
    amount_ngn: float,
    order_id: str,
    bank_account: dict[str, str] | None = None,
) -> dict[str, Any]:
    """
    Initiate a Paystack transfer to the seller's registered bank account.
    The Finance agent calls this after escrow release to complete the settlement.

    bank_account (optional) = {"account_number": "...", "bank_code": "..."}
    If omitted, the route resolves the seller's saved payout details from DB.
    """
    payload: dict[str, Any] = {
        "sellerId": seller_id,
        "amount": amount_ngn,
        "orderId": order_id,
    }
    if bank_account:
        payload["bankAccount"] = bank_account
    return await _call("POST", "/api/payouts/transfer", json_body=payload)


async def _process_refund(
    order_id: str,
    reason: str,
    amount_ngn: float | None = None,
) -> dict[str, Any]:
    """
    Refund the buyer via Paystack and mark the order as refunded.
    Finance agent uses this for cancelled/disputed orders.
    amount_ngn defaults to the full order amount if not supplied.
    """
    payload: dict[str, Any] = {
        "orderId": order_id,
        "reason": reason,
    }
    if amount_ngn is not None:
        payload["amount"] = amount_ngn
    return await _call("POST", "/api/admin/resolve-dispute", json_body=payload)


async def _send_whatsapp(
    to: str,
    message: str,
    approval_id: str | None = None,
) -> dict[str, Any]:
    """
    Send a WhatsApp message via the Meta Cloud API.  Used by the Comms agent
    for order confirmations and — crucially — for HITL approval requests.

    When approval_id is set, the message includes interactive reply buttons:
      "approve <approval_id>" and "reject <approval_id>"
    so the human approver can reply directly to resume the pipeline.
    """
    payload: dict[str, Any] = {
        "to": to,
        "message": message,
    }
    if approval_id:
        payload["approvalId"] = approval_id
        payload["interactive"] = True
    return await _call("POST", "/api/whatsapp/send", json_body=payload)


async def _create_negotiation(
    product_id: str,
    buyer_id: str,
    seller_id: str,
    proposed_price: float,
    message: str = "",
) -> dict[str, Any]:
    """
    Open a new price-negotiation thread.  The Sales agent uses this to kick
    off a structured negotiation on behalf of the buyer or as part of a
    bulk-deal flow.
    """
    return await _call(
        "POST",
        "/api/negotiations",
        json_body={
            "productId": product_id,
            "buyerId": buyer_id,
            "sellerId": seller_id,
            "proposedPrice": proposed_price,
            "message": message,
            "source": "zema_agent",
        },
    )


# ─────────────────────────────────────────────────────────────────────────────
# MCP Server definition
# ─────────────────────────────────────────────────────────────────────────────

TOOLS: list[Tool] = [
    Tool(
        name="get_order",
        description=(
            "Fetch a FairPrice order by ID. Returns status, escrow state, "
            "amount (NGN), seller/buyer IDs, tracking info, and payment reference."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "order_id": {"type": "string", "description": "The FairPrice order ID (e.g. ORD-xxxx)"},
            },
            "required": ["order_id"],
        },
    ),
    Tool(
        name="get_inventory",
        description=(
            "Query a product's current stock level, price (NGN), and active status "
            "from the FairPrice catalogue."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "product_id": {"type": "string", "description": "The product ID"},
            },
            "required": ["product_id"],
        },
    ),
    Tool(
        name="set_tracking",
        description=(
            "Write shipment tracking data to a FairPrice order and advance "
            "its status to 'shipped'."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "order_id": {"type": "string"},
                "tracking_id": {"type": "string", "description": "Carrier tracking number"},
                "carrier": {"type": "string", "description": "Carrier name, e.g. 'GIG Logistics'"},
                "tracking_steps": {
                    "type": "array",
                    "description": "Optional list of {status, location, timestamp} steps",
                    "items": {"type": "object"},
                },
            },
            "required": ["order_id", "tracking_id", "carrier"],
        },
    ),
    Tool(
        name="release_escrow",
        description=(
            "Release escrowed funds to the seller for a confirmed order. "
            "Call this after buyer confirmation or auto-release window expires."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "order_id": {"type": "string"},
                "released_by": {
                    "type": "string",
                    "description": "Who triggered the release: 'buyer', 'agent', or 'admin'",
                    "default": "agent",
                },
            },
            "required": ["order_id"],
        },
    ),
    Tool(
        name="paystack_payout",
        description=(
            "Initiate a Paystack bank transfer to the seller after escrow release. "
            "The Finance agent calls this to complete settlement."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "seller_id": {"type": "string"},
                "amount_ngn": {"type": "number", "description": "Amount in Nigerian Naira"},
                "order_id": {"type": "string"},
                "bank_account": {
                    "type": "object",
                    "description": "Optional — omit to use seller's saved payout details",
                    "properties": {
                        "account_number": {"type": "string"},
                        "bank_code": {"type": "string"},
                    },
                },
            },
            "required": ["seller_id", "amount_ngn", "order_id"],
        },
    ),
    Tool(
        name="process_refund",
        description=(
            "Refund the buyer via Paystack and mark the order as refunded. "
            "Use for cancelled or disputed orders."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "order_id": {"type": "string"},
                "reason": {"type": "string", "description": "Refund reason for audit trail"},
                "amount_ngn": {
                    "type": "number",
                    "description": "Partial refund amount (NGN). Omit for full refund.",
                },
            },
            "required": ["order_id", "reason"],
        },
    ),
    Tool(
        name="send_whatsapp",
        description=(
            "Send a WhatsApp message via FairPrice's Meta Cloud API integration. "
            "For HITL approval requests, pass approval_id to include interactive "
            "'approve / reject' reply buttons."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "to": {"type": "string", "description": "E.164 phone number, e.g. +2348162816305"},
                "message": {"type": "string"},
                "approval_id": {
                    "type": "string",
                    "description": "Set for HITL checkpoints — adds approve/reject buttons",
                },
            },
            "required": ["to", "message"],
        },
    ),
    Tool(
        name="create_negotiation",
        description=(
            "Open a new price-negotiation thread on FairPrice. "
            "The Sales agent uses this to start a structured offer on a listing."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "product_id": {"type": "string"},
                "buyer_id": {"type": "string"},
                "seller_id": {"type": "string"},
                "proposed_price": {"type": "number", "description": "Proposed price in NGN"},
                "message": {"type": "string", "description": "Opening message for the negotiation"},
            },
            "required": ["product_id", "buyer_id", "seller_id", "proposed_price"],
        },
    ),
]

# ─── MCP server instance ─────────────────────────────────────────────────────

server: Server = Server("zema360-fairprice")


@server.list_tools()
async def list_tools() -> list[Tool]:
    return TOOLS


@server.call_tool()
async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
    """Dispatch MCP tool calls to the matching FairPrice API call."""
    result: dict[str, Any] = {}

    if name == "get_order":
        result = await _get_order(arguments["order_id"])
    elif name == "get_inventory":
        result = await _get_inventory(arguments["product_id"])
    elif name == "set_tracking":
        result = await _set_tracking(
            arguments["order_id"],
            arguments["tracking_id"],
            arguments["carrier"],
            arguments.get("tracking_steps"),
        )
    elif name == "release_escrow":
        result = await _release_escrow(
            arguments["order_id"],
            arguments.get("released_by", "agent"),
        )
    elif name == "paystack_payout":
        result = await _paystack_payout(
            arguments["seller_id"],
            float(arguments["amount_ngn"]),
            arguments["order_id"],
            arguments.get("bank_account"),
        )
    elif name == "process_refund":
        result = await _process_refund(
            arguments["order_id"],
            arguments["reason"],
            arguments.get("amount_ngn"),
        )
    elif name == "send_whatsapp":
        result = await _send_whatsapp(
            arguments["to"],
            arguments["message"],
            arguments.get("approval_id"),
        )
    elif name == "create_negotiation":
        result = await _create_negotiation(
            arguments["product_id"],
            arguments["buyer_id"],
            arguments["seller_id"],
            float(arguments["proposed_price"]),
            arguments.get("message", ""),
        )
    else:
        result = {"error": f"Unknown tool: {name}"}

    return [TextContent(type="text", text=json.dumps(result, ensure_ascii=False, indent=2))]


# ─────────────────────────────────────────────────────────────────────────────
# Entry point — run as stdio MCP server
# ─────────────────────────────────────────────────────────────────────────────

async def _main() -> None:
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


if __name__ == "__main__":
    import asyncio
    logging.basicConfig(level=logging.INFO)
    asyncio.run(_main())
