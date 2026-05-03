"""
Vendor Ledger & Payout Management Router
All payments flow through the platform account (escrow model).
Admin manually initiates payouts to vendor bank accounts.
Vendors see their own balance, ledger, and payout history.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

from database import vendor_ledger_col, payouts_col, users_col
from utils.security import get_current_user
from utils.audit import get_audit_logger
from utils.helpers import serialize_doc, paginate

router = APIRouter()


# ==================== MODELS ====================

class PayoutCreateRequest(BaseModel):
    vendor_id: str
    amount: float
    reference_number: str
    payment_mode: str = "NEFT"  # NEFT | RTGS | IMPS | UPI
    notes: Optional[str] = None


class LedgerEntryCreate(BaseModel):
    vendor_id: str
    order_id: str
    product_id: str
    product_name: str
    amount: float
    commission_rate: float
    commission_amount: float
    net_amount: float
    type: str = "CREDIT"


# ==================== VENDOR ENDPOINTS ====================

@router.get('/balance')
async def get_vendor_balance(current_user: dict = Depends(get_current_user)):
    """Vendor: get current pending balance."""
    if current_user.get('role') != 'VENDOR':
        raise HTTPException(status_code=403, detail="Vendor access required")

    user = await users_col.find_one({"id": current_user['id']})
    if not user:
        raise HTTPException(status_code=404, detail="Vendor not found")
    vendor_id = user.get('vendor_profile', {}).get('vendor_id')

    pipeline = [
        {"$match": {"vendor_id": vendor_id}},
        {"$group": {
            "_id": None,
            "total_credited": {"$sum": {"$cond": [{"$eq": ["$type", "CREDIT"]}, "$net_amount", 0]}},
            "total_debited": {"$sum": {"$cond": [{"$eq": ["$type", "DEBIT"]}, "$amount", 0]}},
            "transaction_count": {"$sum": 1}
        }}
    ]
    result = await vendor_ledger_col.aggregate(pipeline).to_list(1)
    data = result[0] if result else {"total_credited": 0, "total_debited": 0, "transaction_count": 0}

    pending_balance = data.get("total_credited", 0) - data.get("total_debited", 0)
    commission_rate = user.get('vendor_profile', {}).get('commission_rate', 15.0)

    return {
        "success": True,
        "data": {
            "vendor_id": vendor_id,
            "total_earned": round(data.get("total_credited", 0), 2),
            "total_paid_out": round(data.get("total_debited", 0), 2),
            "pending_balance": round(pending_balance, 2),
            "commission_rate": commission_rate,
            "transaction_count": data.get("transaction_count", 0)
        }
    }


@router.get('/transactions')
async def get_vendor_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Vendor: get ledger transaction history (own only)."""
    if current_user.get('role') != 'VENDOR':
        raise HTTPException(status_code=403, detail="Vendor access required")

    user = await users_col.find_one({"id": current_user['id']})
    vendor_id = user.get('vendor_profile', {}).get('vendor_id') if user else None

    query = {"vendor_id": vendor_id}
    if type:
        query["type"] = type

    skip, lim = paginate(page, limit)
    total = await vendor_ledger_col.count_documents(query)
    transactions = await vendor_ledger_col.find(query).sort("created_at", -1).skip(skip).limit(lim).to_list(lim)

    return {
        "success": True,
        "data": serialize_doc(transactions),
        "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + lim - 1) // lim}
    }


@router.get('/payouts')
async def get_vendor_payouts(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Vendor: get payout history."""
    if current_user.get('role') != 'VENDOR':
        raise HTTPException(status_code=403, detail="Vendor access required")

    user = await users_col.find_one({"id": current_user['id']})
    vendor_id = user.get('vendor_profile', {}).get('vendor_id') if user else None

    skip, lim = paginate(page, limit)
    total = await payouts_col.count_documents({"vendor_id": vendor_id})
    payouts = await payouts_col.find({"vendor_id": vendor_id}).sort("created_at", -1).skip(skip).limit(lim).to_list(lim)

    return {
        "success": True,
        "data": serialize_doc(payouts),
        "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + lim - 1) // lim}
    }


# ==================== ADMIN ENDPOINTS ====================

@router.get('/admin/vendor-balances')
async def admin_get_all_vendor_balances(
    current_user: dict = Depends(get_current_user)
):
    """Admin: see pending balances owed to all vendors."""
    if current_user.get('role') not in ('ADMIN', 'SUB_ADMIN'):
        raise HTTPException(status_code=403, detail="Admin access required")

    pipeline = [
        {"$group": {
            "_id": "$vendor_id",
            "total_credited": {"$sum": {"$cond": [{"$eq": ["$type", "CREDIT"]}, "$net_amount", 0]}},
            "total_debited": {"$sum": {"$cond": [{"$eq": ["$type", "DEBIT"]}, "$amount", 0]}}
        }}
    ]
    results = await vendor_ledger_col.aggregate(pipeline).to_list(200)

    # Enrich with vendor names
    enriched = []
    for r in results:
        vendor_user = await users_col.find_one({"vendor_profile.vendor_id": r["_id"]}, {"vendor_profile": 1, "email": 1})
        vp = vendor_user.get('vendor_profile', {}) if vendor_user else {}
        pending = r["total_credited"] - r["total_debited"]
        enriched.append({
            "vendor_id": r["_id"],
            "store_name": vp.get("store_name"),
            "email": vendor_user.get("email") if vendor_user else None,
            "total_earned": round(r["total_credited"], 2),
            "total_paid_out": round(r["total_debited"], 2),
            "pending_balance": round(pending, 2),
            "bank_details": {
                "bank_name": vp.get("bank_details", {}).get("bank_name"),
                "ifsc_code": vp.get("bank_details", {}).get("ifsc_code"),
                "account_type": vp.get("bank_details", {}).get("account_type"),
                "account_number": "****" + (vp.get("bank_details", {}).get("account_number", "")[-4:])
            }
        })

    # Sort by highest pending balance
    enriched.sort(key=lambda x: x["pending_balance"], reverse=True)

    total_payable = sum(e["pending_balance"] for e in enriched if e["pending_balance"] > 0)

    return {
        "success": True,
        "data": enriched,
        "summary": {"total_vendors": len(enriched), "total_payable": round(total_payable, 2)}
    }


@router.post('/admin/payouts')
async def admin_create_payout(
    data: PayoutCreateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Admin: initiate a payout to a vendor."""
    if current_user.get('role') != 'ADMIN':
        raise HTTPException(status_code=403, detail="Admin access required")

    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Payout amount must be positive")

    # Verify vendor exists
    vendor_user = await users_col.find_one({"vendor_profile.vendor_id": data.vendor_id})
    if not vendor_user:
        raise HTTPException(status_code=404, detail="Vendor not found")

    # Check available balance
    pipeline = [
        {"$match": {"vendor_id": data.vendor_id}},
        {"$group": {
            "_id": None,
            "total_credited": {"$sum": {"$cond": [{"$eq": ["$type", "CREDIT"]}, "$net_amount", 0]}},
            "total_debited": {"$sum": {"$cond": [{"$eq": ["$type", "DEBIT"]}, "$amount", 0]}}
        }}
    ]
    balance_data = await vendor_ledger_col.aggregate(pipeline).to_list(1)
    balance = balance_data[0] if balance_data else {"total_credited": 0, "total_debited": 0}
    available = balance["total_credited"] - balance["total_debited"]

    if data.amount > available:
        raise HTTPException(
            status_code=400,
            detail={"code": "INSUFFICIENT_BALANCE", "message": f"Available balance ₹{available:.2f} is less than requested ₹{data.amount:.2f}"}
        )

    payout_id = f"pay_{uuid.uuid4().hex[:16]}"
    vp = vendor_user.get('vendor_profile', {})

    payout_doc = {
        "id": payout_id,
        "vendor_id": data.vendor_id,
        "vendor_name": vp.get("store_name"),
        "amount": data.amount,
        "payment_mode": data.payment_mode,
        "reference_number": data.reference_number,
        "notes": data.notes,
        "status": "COMPLETED",
        "initiated_by": current_user['id'],
        "initiated_by_email": current_user.get('email'),
        "bank_details": {
            "account_holder": vp.get("bank_details", {}).get("account_holder_name"),
            "bank_name": vp.get("bank_details", {}).get("bank_name"),
            "ifsc_code": vp.get("bank_details", {}).get("ifsc_code"),
            "account_number": "****" + (vp.get("bank_details", {}).get("account_number", "")[-4:])
        },
        "created_at": datetime.utcnow()
    }
    await payouts_col.insert_one(payout_doc)

    # Record debit in ledger
    ledger_doc = {
        "id": f"ldg_{uuid.uuid4().hex[:16]}",
        "vendor_id": data.vendor_id,
        "type": "DEBIT",
        "amount": data.amount,
        "net_amount": data.amount,
        "description": f"Payout #{payout_id} via {data.payment_mode}",
        "reference": payout_id,
        "created_at": datetime.utcnow()
    }
    await vendor_ledger_col.insert_one(ledger_doc)

    # Audit log
    audit_logger = get_audit_logger()
    await audit_logger.log_action(
        user_id=current_user['id'],
        user_email=current_user.get('email'),
        user_role='ADMIN',
        action="VENDOR_PAYOUT_CREATED",
        entity_type="PAYOUT",
        entity_id=payout_id,
        entity_name=vp.get("store_name"),
        changes={"amount": data.amount, "reference": data.reference_number, "mode": data.payment_mode},
        description=f"Payout of ₹{data.amount} to vendor {vp.get('store_name')}",
        severity="HIGH",
        category="FINANCIAL",
        user_ip=request.client.host if request else None
    )

    return {
        "success": True,
        "message": f"Payout of ₹{data.amount} initiated successfully",
        "data": serialize_doc(payout_doc)
    }


@router.get('/admin/payouts')
async def admin_list_payouts(
    vendor_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Admin: list all payouts."""
    if current_user.get('role') not in ('ADMIN', 'SUB_ADMIN'):
        raise HTTPException(status_code=403, detail="Admin access required")

    query = {}
    if vendor_id:
        query["vendor_id"] = vendor_id

    skip, lim = paginate(page, limit)
    total = await payouts_col.count_documents(query)
    payouts = await payouts_col.find(query).sort("created_at", -1).skip(skip).limit(lim).to_list(lim)

    return {
        "success": True,
        "data": serialize_doc(payouts),
        "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + lim - 1) // lim}
    }


@router.post('/admin/ledger/credit')
async def admin_credit_vendor_ledger(
    data: LedgerEntryCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Admin/system: credit vendor ledger when an order is fulfilled.
    Called internally when order status → DELIVERED.
    """
    if current_user.get('role') not in ('ADMIN', 'SUB_ADMIN'):
        raise HTTPException(status_code=403, detail="Admin access required")

    ledger_doc = {
        "id": f"ldg_{uuid.uuid4().hex[:16]}",
        "vendor_id": data.vendor_id,
        "type": "CREDIT",
        "order_id": data.order_id,
        "product_id": data.product_id,
        "product_name": data.product_name,
        "gross_amount": data.amount,
        "commission_rate": data.commission_rate,
        "commission_amount": data.commission_amount,
        "net_amount": data.net_amount,
        "description": f"Sale: {data.product_name} (Order #{data.order_id})",
        "created_at": datetime.utcnow()
    }
    await vendor_ledger_col.insert_one(ledger_doc)

    return {"success": True, "message": "Vendor ledger credited", "data": serialize_doc(ledger_doc)}
