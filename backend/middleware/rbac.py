"""
Role-Based Access Control (RBAC) Middleware
Enforces strict access control based on user roles and permissions
"""

from fastapi import HTTPException, status, Depends
from typing import List, Optional
from functools import wraps
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class RBACException(HTTPException):
    """Custom exception for RBAC violations"""
    def __init__(self, detail: str, code: str = "FORBIDDEN"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": code,
                "message": detail
            }
        )


# Legacy lowercase roles → Phase 1 canonical roles mapping.
# Allows incremental migration: existing admin users (role='admin') can still
# access Phase 1 admin endpoints that require ['ADMIN'].
LEGACY_ROLE_MAP = {
    "admin": "ADMIN",
    "manager": "ADMIN",       # legacy managers treated as admin for Phase 1
    "sub_admin": "SUB_ADMIN",
    "staff": "SUB_ADMIN",
    "support": "SUB_ADMIN",
    "customer": "B2C_CUSTOMER",
    "vendor": "VENDOR",
    "b2b": "B2B_BUYER",
}


def _canonical_role(role: Optional[str]) -> str:
    if not role:
        return ""
    r = role.strip()
    if not r:
        return ""
    # Already canonical (uppercase)?
    if r.isupper():
        return r
    return LEGACY_ROLE_MAP.get(r.lower(), r.upper())


def _extract_user(args: tuple, kwargs: dict) -> Optional[dict]:
    """Find the authenticated user dict injected by FastAPI dependencies.

    The user may be bound to any parameter name (e.g. `user`, `current_user`,
    `admin_user`). We locate it by inspecting kwargs and args for any dict
    value that has a 'role' key (heuristic, safe for our endpoints).
    """
    # Prefer well-known names first
    for key in ("user", "current_user", "admin_user", "vendor_user", "b2b_user"):
        candidate = kwargs.get(key)
        if isinstance(candidate, dict) and "role" in candidate:
            return candidate
    # Fallback: scan remaining kwargs
    for val in kwargs.values():
        if isinstance(val, dict) and "role" in val and "email" in val:
            return val
    # Fallback: scan args
    for val in args:
        if isinstance(val, dict) and "role" in val and "email" in val:
            return val
    return None


def require_role(allowed_roles: List[str]):
    """
    Decorator to enforce role-based access control.

    - Role matching is case-insensitive and respects legacy role names
      (e.g. legacy 'admin' satisfies a requirement for 'ADMIN').
    - The authenticated user can be bound to any parameter name; the
      decorator locates it automatically.
    """
    allowed_canonical = {_canonical_role(r) for r in allowed_roles}

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            user = _extract_user(args, kwargs)

            if not user:
                raise RBACException(
                    "Authentication required",
                    code="UNAUTHORIZED"
                )

            user_role_canonical = _canonical_role(user.get('role'))

            if user_role_canonical not in allowed_canonical:
                logger.warning(
                    f"RBAC violation: user {user.get('id') or user.get('_id')} "
                    f"role='{user.get('role')}' (canonical='{user_role_canonical}') "
                    f"attempted access to {func.__name__} "
                    f"requiring {sorted(allowed_canonical)}"
                )
                raise RBACException(
                    f"Access denied. Required role: {' or '.join(sorted(allowed_canonical))}",
                    code="INSUFFICIENT_PERMISSIONS"
                )

            # Additional status checks for B2B / Vendor users
            if user_role_canonical == 'B2B_BUYER':
                b2b_status = (
                    user.get('b2b_status')
                    or (user.get('b2b_profile') or {}).get('approval_status')
                )
                if b2b_status != 'APPROVED':
                    raise RBACException(
                        "Your B2B account is not approved. Please wait for admin approval.",
                        code="B2B_NOT_APPROVED"
                    )

            if user_role_canonical == 'VENDOR':
                vendor_status = (
                    user.get('vendor_status')
                    or (user.get('vendor_profile') or {}).get('approval_status')
                )
                if vendor_status != 'APPROVED':
                    raise RBACException(
                        "Your vendor account is not approved. Please wait for admin approval.",
                        code="VENDOR_NOT_APPROVED"
                    )

            logger.info(
                f"RBAC pass: user={user.get('id') or user.get('_id')} "
                f"role={user_role_canonical} → {func.__name__}"
            )

            return await func(*args, **kwargs)

        return wrapper
    return decorator


def require_permission(required_permissions: List[str]):
    """
    Decorator to enforce permission-based access control
    
    Usage:
        @router.delete("/products/{product_id}")
        @require_permission(["delete:products"])
        async def delete_product(product_id: str, user=Depends(get_current_user)):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            user = kwargs.get('user') or kwargs.get('current_user')
            
            if not user:
                raise RBACException("Authentication required", code="UNAUTHORIZED")
            
            user_permissions = get_user_permissions(user.get('role'))
            
            # Check if user has all required permissions
            missing_permissions = [
                perm for perm in required_permissions 
                if perm not in user_permissions
            ]
            
            if missing_permissions:
                logger.warning(
                    f"Permission violation: User {user.get('id')} missing permissions: {missing_permissions}"
                )
                raise RBACException(
                    f"Missing permissions: {', '.join(missing_permissions)}",
                    code="INSUFFICIENT_PERMISSIONS"
                )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def get_user_permissions(role: str) -> List[str]:
    """
    Get permissions for a given role
    This defines the permission matrix for the platform
    """
    PERMISSIONS = {
        "B2C_CUSTOMER": [
            "read:products:b2c",
            "read:own:orders",
            "create:orders:b2c",
            "update:own:profile",
            "manage:own:cart",
            "manage:own:wishlist",
            "read:own:addresses",
            "create:own:addresses",
            "update:own:addresses",
            "delete:own:addresses"
        ],
        
        "B2B_BUYER": [
            "read:products:b2b",
            "read:products:wholesale_pricing",
            "read:products:vendor",
            "create:orders:b2b",
            "read:own:orders",
            "update:own:profile",
            "manage:own:cart",
            "manage:own:wishlist",
            "read:own:addresses",
            "create:own:addresses",
            "update:own:addresses",
            "delete:own:addresses",
            "download:invoices"
        ],
        
        "VENDOR": [
            "read:own:products",
            "create:products",
            "update:own:products",
            "delete:own:products",
            "read:own:orders",
            "update:own:order:status",
            "read:own:analytics",
            "read:own:payouts",
            "manage:own:profile"
        ],
        
        "ADMIN": [
            "read:all:products",
            "create:products",
            "update:all:products",
            "delete:all:products",
            "approve:products",
            "approve:vendors",
            "approve:b2b_users",
            "read:all:orders",
            "update:all:orders",
            "create:payouts",
            "process:payouts",
            "read:all:transactions",
            "read:all:analytics",
            "manage:all:users",
            "read:audit_logs",
            "export:reports",
            "manage:platform:settings"
        ],
        
        "SUB_ADMIN": [
            "read:all:products",
            "update:all:products",
            "approve:products",
            "read:all:orders",
            "update:all:orders",
            "read:all:analytics",
            "read:audit_logs"
        ]
    }
    
    return PERMISSIONS.get(role, [])


def check_resource_ownership(user: dict, resource_owner_id: str) -> bool:
    """
    Check if user owns the resource
    Used for operations like "update own product", "view own orders"
    
    Args:
        user: Current user dict
        resource_owner_id: ID of the resource owner (user_id or vendor_id)
    
    Returns:
        bool: True if user owns the resource
    """
    # Admin can access everything
    if user.get('role') == 'ADMIN':
        return True
    
    # For vendors, check vendor_id
    if user.get('role') == 'VENDOR':
        return user.get('vendor_id') == resource_owner_id
    
    # For regular users, check user_id
    return user.get('id') == resource_owner_id


def require_resource_ownership(resource_id_param: str = "id"):
    """
    Decorator to enforce resource ownership
    
    Usage:
        @router.put("/vendor/products/{product_id}")
        @require_resource_ownership(resource_id_param="product_id")
        async def update_product(product_id: str, user=Depends(get_current_user)):
            # This will only execute if user owns the product
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            user = kwargs.get('user') or kwargs.get('current_user')
            resource_id = kwargs.get(resource_id_param)
            
            if not user:
                raise RBACException("Authentication required", code="UNAUTHORIZED")
            
            # Admin bypass
            if user.get('role') == 'ADMIN':
                return await func(*args, **kwargs)
            
            # Check ownership (this requires fetching the resource)
            # This is a simplified check - in production, you'd fetch the resource
            # and verify ownership
            
            logger.info(
                f"Resource ownership check: User {user.get('id')} "
                f"accessing resource {resource_id}"
            )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


class RateLimiter:
    """
    Simple rate limiter (will be enhanced with Redis in production)
    """
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = {}
    
    def is_allowed(self, identifier: str) -> bool:
        """Check if request is allowed"""
        now = datetime.now()
        
        if identifier not in self.requests:
            self.requests[identifier] = []
        
        # Remove old requests outside the window
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier]
            if (now - req_time).total_seconds() < self.window_seconds
        ]
        
        # Check if limit exceeded
        if len(self.requests[identifier]) >= self.max_requests:
            return False
        
        # Add current request
        self.requests[identifier].append(now)
        return True


def rate_limit(max_requests: int = 100, window_seconds: int = 60):
    """
    Decorator for rate limiting
    
    Usage:
        @router.post("/auth/login")
        @rate_limit(max_requests=5, window_seconds=60)
        async def login(request: Request):
            ...
    """
    limiter = RateLimiter(max_requests, window_seconds)
    
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get identifier (IP address or user ID)
            request = kwargs.get('request')
            if request:
                identifier = request.client.host
            else:
                identifier = "unknown"
            
            if not limiter.is_allowed(identifier):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": f"Rate limit exceeded. Max {max_requests} requests per {window_seconds} seconds."
                    }
                )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator
