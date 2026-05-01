"""
Audit Logging System
Records all admin actions and sensitive operations for compliance and security
"""

from datetime import datetime
from typing import Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid
import logging

logger = logging.getLogger(__name__)


class AuditLogger:
    """
    Audit logger for tracking user actions and system events
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.audit_logs_col = db.audit_logs
    
    async def log_action(
        self,
        user_id: str,
        user_email: str,
        user_role: str,
        action: str,
        entity_type: str,
        entity_id: str,
        entity_name: Optional[str] = None,
        changes: Optional[Dict[str, Any]] = None,
        description: Optional[str] = None,
        severity: str = "INFO",
        category: str = "GENERAL",
        request_info: Optional[Dict[str, Any]] = None,
        user_ip: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> str:
        """
        Log an action to the audit trail
        
        Args:
            user_id: ID of user performing action
            user_email: Email of user
            user_role: Role of user
            action: Action performed (e.g., "APPROVE_B2B_USER", "UPDATE_PRODUCT")
            entity_type: Type of entity (USER, PRODUCT, ORDER, VENDOR, PAYOUT)
            entity_id: ID of the entity
            entity_name: Name/title of the entity
            changes: Dict with "field", "old_value", "new_value"
            description: Human-readable description
            severity: DEBUG | INFO | WARNING | ERROR | CRITICAL
            category: Category of action (USER_MANAGEMENT, PRODUCT_MANAGEMENT, etc.)
            request_info: HTTP request details
            user_ip: User's IP address
            user_agent: User's browser/client
        
        Returns:
            str: Audit log ID
        """
        try:
            audit_id = f"audit_{uuid.uuid4().hex[:12]}"
            
            audit_entry = {
                "id": audit_id,
                "user_id": user_id,
                "user_email": user_email,
                "user_role": user_role,
                "user_ip": user_ip,
                "user_agent": user_agent,
                
                "action": action,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "entity_name": entity_name,
                
                "changes": changes,
                "description": description,
                "severity": severity,
                "category": category,
                
                "request": request_info,
                
                "timestamp": datetime.utcnow(),
                "created_at": datetime.utcnow()
            }
            
            await self.audit_logs_col.insert_one(audit_entry)
            
            logger.info(
                f"Audit log created: {action} by {user_email} ({user_role}) "
                f"on {entity_type} {entity_id}"
            )
            
            return audit_id
            
        except Exception as e:
            logger.error(f"Failed to create audit log: {str(e)}")
            # Don't fail the main operation if audit logging fails
            return None
    
    async def log_approval(
        self,
        admin_user: dict,
        entity_type: str,
        entity_id: str,
        entity_name: str,
        approval_status: str,
        note: Optional[str] = None,
        user_ip: Optional[str] = None
    ) -> str:
        """
        Log approval/rejection actions
        
        Args:
            admin_user: Admin user dict
            entity_type: "B2B_USER" | "VENDOR" | "PRODUCT"
            entity_id: ID of entity being approved
            entity_name: Name of entity
            approval_status: "APPROVED" | "REJECTED"
            note: Approval/rejection note
            user_ip: Admin's IP address
        """
        action = f"{'APPROVE' if approval_status == 'APPROVED' else 'REJECT'}_{entity_type.upper()}"
        
        return await self.log_action(
            user_id=admin_user.get('id'),
            user_email=admin_user.get('email'),
            user_role=admin_user.get('role'),
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            changes={
                "field": "approval_status",
                "old_value": "PENDING",
                "new_value": approval_status
            },
            description=f"{entity_type} '{entity_name}' {approval_status.lower()} by admin. Note: {note or 'N/A'}",
            severity="INFO",
            category=f"{entity_type}_MANAGEMENT",
            user_ip=user_ip
        )
    
    async def log_b2b_approval(
        self,
        admin_user: dict,
        b2b_user_id: str,
        company_name: str,
        approval_status: str,
        note: Optional[str] = None,
        user_ip: Optional[str] = None
    ):
        """Log B2B user approval"""
        return await self.log_approval(
            admin_user=admin_user,
            entity_type="B2B_USER",
            entity_id=b2b_user_id,
            entity_name=company_name,
            approval_status=approval_status,
            note=note,
            user_ip=user_ip
        )
    
    async def log_vendor_approval(
        self,
        admin_user: dict,
        vendor_id: str,
        store_name: str,
        approval_status: str,
        note: Optional[str] = None,
        user_ip: Optional[str] = None
    ):
        """Log vendor approval"""
        return await self.log_approval(
            admin_user=admin_user,
            entity_type="VENDOR",
            entity_id=vendor_id,
            entity_name=store_name,
            approval_status=approval_status,
            note=note,
            user_ip=user_ip
        )
    
    async def log_product_approval(
        self,
        admin_user: dict,
        product_id: str,
        product_name: str,
        approval_status: str,
        note: Optional[str] = None,
        user_ip: Optional[str] = None
    ):
        """Log product approval"""
        return await self.log_approval(
            admin_user=admin_user,
            entity_type="PRODUCT",
            entity_id=product_id,
            entity_name=product_name,
            approval_status=approval_status,
            note=note,
            user_ip=user_ip
        )
    
    async def log_payout(
        self,
        admin_user: dict,
        payout_id: str,
        vendor_name: str,
        amount: float,
        action: str,  # CREATE_PAYOUT | PROCESS_PAYOUT | CANCEL_PAYOUT
        utr: Optional[str] = None,
        user_ip: Optional[str] = None
    ):
        """Log vendor payout actions"""
        return await self.log_action(
            user_id=admin_user.get('id'),
            user_email=admin_user.get('email'),
            user_role=admin_user.get('role'),
            action=action,
            entity_type="PAYOUT",
            entity_id=payout_id,
            entity_name=f"Payout to {vendor_name}",
            description=f"Payout of ₹{amount:,.2f} to {vendor_name}. UTR: {utr or 'N/A'}",
            severity="INFO",
            category="FINANCIAL",
            user_ip=user_ip
        )
    
    async def log_user_action(
        self,
        user: dict,
        action: str,
        description: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        user_ip: Optional[str] = None
    ):
        """Log general user actions"""
        return await self.log_action(
            user_id=user.get('id'),
            user_email=user.get('email'),
            user_role=user.get('role'),
            action=action,
            entity_type=entity_type or "GENERAL",
            entity_id=entity_id or user.get('id'),
            description=description,
            severity="INFO",
            category="USER_ACTION",
            user_ip=user_ip
        )
    
    async def log_security_event(
        self,
        event_type: str,
        description: str,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        user_ip: Optional[str] = None,
        severity: str = "WARNING"
    ):
        """Log security-related events"""
        return await self.log_action(
            user_id=user_id or "system",
            user_email=user_email or "system@drmediscie.com",
            user_role="SYSTEM",
            action=event_type,
            entity_type="SECURITY",
            entity_id="security_event",
            description=description,
            severity=severity,
            category="SECURITY",
            user_ip=user_ip
        )
    
    async def log_failed_login(
        self,
        email: str,
        reason: str,
        user_ip: Optional[str] = None
    ):
        """Log failed login attempts"""
        return await self.log_security_event(
            event_type="FAILED_LOGIN",
            description=f"Failed login attempt for {email}. Reason: {reason}",
            user_email=email,
            user_ip=user_ip,
            severity="WARNING"
        )
    
    async def log_suspicious_activity(
        self,
        description: str,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        user_ip: Optional[str] = None
    ):
        """Log suspicious activities"""
        return await self.log_security_event(
            event_type="SUSPICIOUS_ACTIVITY",
            description=description,
            user_id=user_id,
            user_email=user_email,
            user_ip=user_ip,
            severity="CRITICAL"
        )
    
    async def get_audit_logs(
        self,
        user_id: Optional[str] = None,
        entity_type: Optional[str] = None,
        action: Optional[str] = None,
        category: Optional[str] = None,
        severity: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        page: int = 1,
        limit: int = 50
    ) -> dict:
        """
        Retrieve audit logs with filters
        
        Returns:
            dict: {
                "logs": [...],
                "total": int,
                "page": int,
                "pages": int
            }
        """
        query = {}
        
        if user_id:
            query["user_id"] = user_id
        if entity_type:
            query["entity_type"] = entity_type
        if action:
            query["action"] = action
        if category:
            query["category"] = category
        if severity:
            query["severity"] = severity
        
        if start_date or end_date:
            query["timestamp"] = {}
            if start_date:
                query["timestamp"]["$gte"] = start_date
            if end_date:
                query["timestamp"]["$lte"] = end_date
        
        # Get total count
        total = await self.audit_logs_col.count_documents(query)
        
        # Get paginated logs
        skip = (page - 1) * limit
        logs = await self.audit_logs_col.find(query) \
            .sort("timestamp", -1) \
            .skip(skip) \
            .limit(limit) \
            .to_list(limit)
        
        # Remove MongoDB _id from results
        for log in logs:
            log.pop('_id', None)
        
        return {
            "logs": logs,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        }


# Global audit logger instance (will be initialized with database)
audit_logger: Optional[AuditLogger] = None


def get_audit_logger() -> AuditLogger:
    """Get the global audit logger instance"""
    if audit_logger is None:
        raise RuntimeError("Audit logger not initialized")
    return audit_logger


def init_audit_logger(db: AsyncIOMotorDatabase):
    """Initialize the global audit logger"""
    global audit_logger
    audit_logger = AuditLogger(db)
    logger.info("Audit logger initialized")
