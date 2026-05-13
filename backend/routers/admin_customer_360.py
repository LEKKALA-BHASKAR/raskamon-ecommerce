"""
Admin 360° Customer Management
Full user drilldown: profile, orders, wallet, sessions, activity, edit any field
Dynamic feature toggles per user
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from database import (
    users_col, orders_col, login_history_col, device_sessions_col,
    audit_logs_col, notifications_col
)
from utils.security import get_current_user
from utils.helpers import serialize_doc, now
from utils.audit import get_audit_logger
from middleware.rbac import require_role

router = APIRouter()


# ════════════════════════════════════════════════════════════════════════
#  REQUEST MODELS
# ════════════════════════════════════════════════════════════════════════

class AdminEditUser(BaseModel):
    """Admin can edit any user field"""
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    isBlocked: Optional[bool] = None
    loyaltyPoints: Optional[int] = None
    # GST / billing
    gstNumber: Optional[str] = None
    companyName: Optional[str] = None
    billingName: Optional[str] = None
    # Communication prefs
    communication_prefs: Optional[dict] = None
    # Admin notes
    admin_notes: Optional[str] = None


class FeatureToggle(BaseModel):
    """Toggle user-level features"""
    feature: str  # wallet_enabled | returns_enabled | b2b_access | loyalty_enabled | saved_cards_enabled
    enabled: bool


# ════════════════════════════════════════════════════════════════════════
#  1. UNIFIED CUSTOMER LIST (all roles, search, filter)
# ════════════════════════════════════════════════════════════════════════

@router.get('/customers')
@require_role(["ADMIN", "SUB_ADMIN"])
async def admin_list_all_customers(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,  # active | blocked | pending
    sort_by: Optional[str] = 'created_at',
    admin_user: dict = Depends(get_current_user)
):
    """
    List ALL users (B2C, B2B, Vendor, Admin) with search and filters.
    """
    query = {}

    if role:
        query['role'] = role
    if status == 'blocked':
        query['isBlocked'] = True
    elif status == 'active':
        query['$or'] = [{'isBlocked': {'$exists': False}}, {'isBlocked': False}]
    elif status == 'pending':
        query['$or'] = [
            {'b2b_profile.approval_status': 'PENDING'},
            {'vendor_profile.approval_status': 'PENDING'}
        ]

    if search:
        search_regex = {'$regex': search, '$options': 'i'}
        search_conditions = [
            {'name': search_regex},
            {'email': search_regex},
            {'phone': search_regex},
        ]
        if '$or' in query:
            query = {'$and': [query, {'$or': search_conditions}]}
        else:
            query['$or'] = search_conditions

    sort_field = sort_by if sort_by in ['created_at', 'last_login_at', 'name', 'email'] else 'created_at'
    skip = (page - 1) * limit
    total = await users_col.count_documents(query)

    users = await users_col.find(
        query,
        {'password': 0, 'refresh_tokens': 0, 'totp_secret': 0, 'totp_secret_pending': 0, 'totp_backup_codes': 0}
    ).sort(sort_field, -1).skip(skip).limit(limit).to_list(limit)

    # Enrich with order count per user
    enriched = []
    for u in users:
        uid = u.get('id') or u.get('_id')
        order_count = await orders_col.count_documents({'user': uid})
        doc = serialize_doc(u)
        doc['order_count'] = order_count
        enriched.append(doc)

    return {
        "success": True,
        "data": enriched,
        "pagination": {
            "page": page, "limit": limit, "total": total,
            "pages": (total + limit - 1) // limit if total else 1
        }
    }


# ════════════════════════════════════════════════════════════════════════
#  2. FULL 360° USER DRILLDOWN
# ════════════════════════════════════════════════════════════════════════

@router.get('/customers/{user_id}')
@require_role(["ADMIN", "SUB_ADMIN"])
async def admin_get_customer_360(
    user_id: str,
    admin_user: dict = Depends(get_current_user)
):
    """
    Full 360° view of a single customer:
    Profile, orders summary, addresses, wallet, saved cards, login history,
    active sessions, communication prefs, feature toggles, admin notes
    """
    user = await users_col.find_one(
        {'$or': [{'id': user_id}, {'_id': user_id}]},
        {'password': 0, 'refresh_tokens': 0, 'totp_secret': 0, 'totp_secret_pending': 0, 'totp_backup_codes': 0}
    )
    if not user:
        raise HTTPException(404, detail="User not found")

    uid = user.get('id') or user.get('_id')

    # Orders summary
    order_pipeline = [
        {'$match': {'user': uid}},
        {'$group': {
            '_id': None,
            'total_orders': {'$sum': 1},
            'total_spent': {'$sum': '$totalAmount'},
            'avg_order_value': {'$avg': '$totalAmount'},
            'statuses': {'$push': '$orderStatus'},
        }}
    ]
    order_data = await orders_col.aggregate(order_pipeline).to_list(1)
    order_summary = order_data[0] if order_data else {'total_orders': 0, 'total_spent': 0, 'avg_order_value': 0, 'statuses': []}

    # Recent orders
    recent_orders = await orders_col.find(
        {'user': uid},
        {'items': {'$slice': 2}, 'user': 0}
    ).sort('createdAt', -1).limit(10).to_list(10)

    # Login history (last 10)
    login_events = await login_history_col.find(
        {'user_id': uid}, {'_id': 0, 'user_agent': 0}
    ).sort('created_at', -1).limit(10).to_list(10)

    # Active sessions
    sessions = await device_sessions_col.find(
        {'user_id': uid, 'is_active': True},
        {'_id': 0, 'session_token': 0, 'fingerprint': 0, 'user_agent': 0}
    ).sort('last_active_at', -1).limit(10).to_list(10)

    # Wallet balance
    wallet_balance = 0
    try:
        from database import wallets_col
        wallet = await wallets_col.find_one({'userId': uid})
        wallet_balance = wallet.get('balance', 0) if wallet else 0
    except Exception:
        pass

    # Feature toggles (with defaults)
    feature_defaults = {
        'wallet_enabled': True,
        'returns_enabled': True,
        'loyalty_enabled': True,
        'saved_cards_enabled': True,
        'b2b_access': False,
    }
    feature_toggles = {**feature_defaults, **(user.get('feature_toggles') or {})}

    profile = serialize_doc(user)
    profile['order_summary'] = {
        'total_orders': order_summary.get('total_orders', 0),
        'total_spent': round(order_summary.get('total_spent', 0), 2),
        'avg_order_value': round(order_summary.get('avg_order_value', 0), 2),
        'return_count': sum(1 for s in order_summary.get('statuses', []) if s in ('return_requested', 'returned')),
        'cancelled_count': sum(1 for s in order_summary.get('statuses', []) if s == 'cancelled'),
    }
    profile['recent_orders'] = serialize_doc(recent_orders)
    profile['login_history'] = login_events
    profile['active_sessions'] = sessions
    profile['wallet_balance'] = wallet_balance
    profile['feature_toggles'] = feature_toggles
    profile['addresses'] = user.get('addresses', [])
    profile['saved_cards'] = user.get('saved_cards', [])
    profile['communication_prefs'] = user.get('communication_prefs', {
        'email_order_updates': True, 'email_promotions': True, 'email_newsletter': True,
        'sms_order_updates': True, 'sms_promotions': False, 'push_notifications': True,
    })
    profile['totp_enabled'] = bool(user.get('totp_enabled'))

    return {"success": True, "data": profile}


# ════════════════════════════════════════════════════════════════════════
#  3. ADMIN EDIT ANY USER
# ════════════════════════════════════════════════════════════════════════

@router.put('/customers/{user_id}')
@require_role(["ADMIN"])
async def admin_edit_customer(
    user_id: str,
    data: AdminEditUser,
    request: Request,
    admin_user: dict = Depends(get_current_user)
):
    """Admin can edit any user's profile fields"""
    user = await users_col.find_one({'$or': [{'id': user_id}, {'_id': user_id}]})
    if not user:
        raise HTTPException(404, detail="User not found")

    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, detail="No fields to update")

    update['updatedAt'] = now()

    # Track changes for audit
    changes = {}
    for key, new_val in update.items():
        if key == 'updatedAt':
            continue
        old_val = user.get(key)
        if old_val != new_val:
            changes[key] = {'old': old_val, 'new': new_val}

    await users_col.update_one(
        {'$or': [{'id': user_id}, {'_id': user_id}]},
        {'$set': update}
    )

    # Audit log
    if changes:
        audit_logger = get_audit_logger()
        await audit_logger.log_action(
            user_id=admin_user.get('id'),
            user_email=admin_user.get('email'),
            user_role=admin_user.get('role'),
            action="ADMIN_EDIT_USER",
            entity_type="USER",
            entity_id=user_id,
            entity_name=user.get('name'),
            changes=changes,
            description=f"Admin edited user {user.get('email')}: {', '.join(changes.keys())}",
            severity="INFO",
            category="USER_MANAGEMENT",
            user_ip=request.client.host if request else None,
        )

    updated = await users_col.find_one(
        {'$or': [{'id': user_id}, {'_id': user_id}]},
        {'password': 0, 'refresh_tokens': 0}
    )
    return {"success": True, "data": serialize_doc(updated)}


# ════════════════════════════════════════════════════════════════════════
#  4. DYNAMIC FEATURE TOGGLES PER USER
# ════════════════════════════════════════════════════════════════════════

@router.put('/customers/{user_id}/features')
@require_role(["ADMIN"])
async def admin_toggle_user_feature(
    user_id: str,
    data: FeatureToggle,
    request: Request,
    admin_user: dict = Depends(get_current_user)
):
    """Toggle individual features for a user (wallet, returns, loyalty, etc.)"""
    user = await users_col.find_one({'$or': [{'id': user_id}, {'_id': user_id}]})
    if not user:
        raise HTTPException(404, detail="User not found")

    valid_features = ['wallet_enabled', 'returns_enabled', 'loyalty_enabled', 'saved_cards_enabled', 'b2b_access']
    if data.feature not in valid_features:
        raise HTTPException(400, detail=f"Invalid feature. Must be one of: {valid_features}")

    toggles = user.get('feature_toggles') or {}
    old_val = toggles.get(data.feature)
    toggles[data.feature] = data.enabled

    await users_col.update_one(
        {'$or': [{'id': user_id}, {'_id': user_id}]},
        {'$set': {'feature_toggles': toggles, 'updatedAt': now()}}
    )

    audit_logger = get_audit_logger()
    await audit_logger.log_action(
        user_id=admin_user.get('id'),
        user_email=admin_user.get('email'),
        user_role=admin_user.get('role'),
        action="FEATURE_TOGGLE",
        entity_type="USER",
        entity_id=user_id,
        entity_name=user.get('name'),
        changes={'feature': data.feature, 'old': old_val, 'new': data.enabled},
        description=f"{'Enabled' if data.enabled else 'Disabled'} {data.feature} for user {user.get('email')}",
        severity="INFO",
        category="USER_MANAGEMENT",
        user_ip=request.client.host if request else None,
    )

    return {"success": True, "message": f"Feature '{data.feature}' {'enabled' if data.enabled else 'disabled'}"}


# ════════════════════════════════════════════════════════════════════════
#  5. ADMIN BLOCK/UNBLOCK + FORCE LOGOUT
# ════════════════════════════════════════════════════════════════════════

@router.post('/customers/{user_id}/block')
@require_role(["ADMIN"])
async def admin_block_user(
    user_id: str,
    request: Request,
    reason: str = "Policy violation",
    admin_user: dict = Depends(get_current_user)
):
    """Block a user and revoke all their sessions"""
    user = await users_col.find_one({'$or': [{'id': user_id}, {'_id': user_id}]})
    if not user:
        raise HTTPException(404, detail="User not found")

    await users_col.update_one(
        {'$or': [{'id': user_id}, {'_id': user_id}]},
        {'$set': {'isBlocked': True, 'block_reason': reason, 'blocked_at': datetime.utcnow(), 'updatedAt': now()}}
    )

    # Revoke all active sessions
    await device_sessions_col.update_many(
        {'user_id': user_id, 'is_active': True},
        {'$set': {'is_active': False, 'revoked_at': datetime.utcnow()}}
    )

    audit_logger = get_audit_logger()
    await audit_logger.log_security_event(
        "USER_BLOCKED",
        f"User {user.get('email')} blocked by admin: {reason}",
        user_id=admin_user.get('id'),
        user_email=admin_user.get('email'),
    )

    return {"success": True, "message": "User blocked and all sessions revoked"}


@router.post('/customers/{user_id}/unblock')
@require_role(["ADMIN"])
async def admin_unblock_user(
    user_id: str,
    request: Request,
    admin_user: dict = Depends(get_current_user)
):
    """Unblock a user"""
    user = await users_col.find_one({'$or': [{'id': user_id}, {'_id': user_id}]})
    if not user:
        raise HTTPException(404, detail="User not found")

    await users_col.update_one(
        {'$or': [{'id': user_id}, {'_id': user_id}]},
        {'$set': {'isBlocked': False, 'block_reason': None, 'blocked_at': None, 'updatedAt': now()}}
    )

    audit_logger = get_audit_logger()
    await audit_logger.log_security_event(
        "USER_UNBLOCKED",
        f"User {user.get('email')} unblocked by admin",
        user_id=admin_user.get('id'),
        user_email=admin_user.get('email'),
    )

    return {"success": True, "message": "User unblocked"}


# ════════════════════════════════════════════════════════════════════════
#  6. ADMIN FORCE RESET PASSWORD / DISABLE 2FA
# ════════════════════════════════════════════════════════════════════════

@router.post('/customers/{user_id}/reset-2fa')
@require_role(["ADMIN"])
async def admin_reset_2fa(
    user_id: str,
    request: Request,
    admin_user: dict = Depends(get_current_user)
):
    """Admin force-disable 2FA for a user (e.g. if they lost their device)"""
    user = await users_col.find_one({'$or': [{'id': user_id}, {'_id': user_id}]})
    if not user:
        raise HTTPException(404, detail="User not found")

    await users_col.update_one(
        {'$or': [{'id': user_id}, {'_id': user_id}]},
        {'$unset': {'totp_secret': '', 'totp_enabled': '', 'totp_backup_codes': '', 'totp_enabled_at': '', 'totp_secret_pending': ''},
         '$set': {'updatedAt': now()}}
    )

    audit_logger = get_audit_logger()
    await audit_logger.log_security_event(
        "ADMIN_RESET_2FA",
        f"2FA force-reset for user {user.get('email')} by admin {admin_user.get('email')}",
        user_id=admin_user.get('id'),
        user_email=admin_user.get('email'),
    )

    return {"success": True, "message": "2FA disabled for user"}


# ════════════════════════════════════════════════════════════════════════
#  7. ADMIN VIEW USER ORDERS (with return management)
# ════════════════════════════════════════════════════════════════════════

@router.get('/customers/{user_id}/orders')
@require_role(["ADMIN", "SUB_ADMIN"])
async def admin_get_user_orders(
    user_id: str,
    page: int = 1,
    limit: int = 20,
    status: Optional[str] = None,
    admin_user: dict = Depends(get_current_user)
):
    """Get all orders for a specific user"""
    query = {'user': user_id}
    if status:
        query['orderStatus'] = status

    skip = (page - 1) * limit
    total = await orders_col.count_documents(query)
    orders = await orders_col.find(query).sort('createdAt', -1).skip(skip).limit(limit).to_list(limit)

    return {
        "success": True,
        "data": serialize_doc(orders),
        "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + limit - 1) // limit if total else 1}
    }


@router.post('/customers/{user_id}/orders/{order_id}/approve-return')
@require_role(["ADMIN"])
async def admin_approve_return(
    user_id: str,
    order_id: str,
    request: Request,
    admin_user: dict = Depends(get_current_user)
):
    """Approve a return request and process refund"""
    order = await orders_col.find_one({'_id': order_id, 'user': user_id})
    if not order:
        raise HTTPException(404, detail="Order not found")
    if order.get('orderStatus') != 'return_requested':
        raise HTTPException(400, detail="No pending return request")

    timeline = order.get('timeline', [])
    timeline.append({'status': 'returned', 'timestamp': datetime.utcnow().isoformat(), 'note': f'Return approved by admin {admin_user.get("email")}'})

    refund_status = 'initiated'
    refund_method = (order.get('returnRequest') or {}).get('refundMethod', 'wallet')

    # Process refund to wallet
    if refund_method == 'wallet':
        try:
            from services.wallet_service import credit_wallet
            await credit_wallet(
                user_id=user_id,
                amount=order['totalAmount'],
                description=f"Refund for returned order #{order.get('invoiceId')}",
                reference_order_id=order_id,
                txn_type='refund'
            )
            refund_status = 'refunded'
        except Exception:
            refund_status = 'refund_failed'

    await orders_col.update_one(
        {'_id': order_id},
        {'$set': {
            'orderStatus': 'returned',
            'refundStatus': refund_status,
            'returnRequest.status': 'approved',
            'returnRequest.approvedBy': admin_user.get('id'),
            'returnRequest.approvedAt': datetime.utcnow().isoformat(),
            'timeline': timeline,
            'updatedAt': datetime.utcnow(),
        }}
    )

    audit_logger = get_audit_logger()
    await audit_logger.log_action(
        user_id=admin_user.get('id'),
        user_email=admin_user.get('email'),
        user_role='ADMIN',
        action="RETURN_APPROVED",
        entity_type="ORDER",
        entity_id=order_id,
        entity_name=order.get('invoiceId'),
        changes={'refund_method': refund_method, 'refund_status': refund_status},
        description=f"Return approved for order {order.get('invoiceId')}. Refund: {refund_status}",
        severity="INFO",
        category="ORDER_MANAGEMENT",
        user_ip=request.client.host if request else None,
    )

    return {"success": True, "message": f"Return approved. Refund status: {refund_status}"}


@router.post('/customers/{user_id}/orders/{order_id}/reject-return')
@require_role(["ADMIN"])
async def admin_reject_return(
    user_id: str,
    order_id: str,
    request: Request,
    reason: str = "Return criteria not met",
    admin_user: dict = Depends(get_current_user)
):
    """Reject a return request"""
    order = await orders_col.find_one({'_id': order_id, 'user': user_id})
    if not order:
        raise HTTPException(404, detail="Order not found")

    timeline = order.get('timeline', [])
    timeline.append({'status': 'return_rejected', 'timestamp': datetime.utcnow().isoformat(), 'note': f'Return rejected: {reason}'})

    await orders_col.update_one(
        {'_id': order_id},
        {'$set': {
            'orderStatus': 'delivered',
            'refundStatus': None,
            'returnRequest.status': 'rejected',
            'returnRequest.rejectionReason': reason,
            'returnRequest.rejectedBy': admin_user.get('id'),
            'timeline': timeline,
            'updatedAt': datetime.utcnow(),
        }}
    )

    return {"success": True, "message": "Return request rejected"}
