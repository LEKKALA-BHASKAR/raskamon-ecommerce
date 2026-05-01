# 🏗️ Dr MediScie Unified Commerce Platform - Technical Architecture

**Version:** 1.0  
**Type:** Enterprise-grade B2C + B2B + Multivendor Marketplace  
**Revenue Model:** Centralized Admin Financial Control

---

## 📋 TABLE OF CONTENTS

1. [System Overview](#system-overview)
2. [Core Business Rules](#core-business-rules)
3. [Technology Stack](#technology-stack)
4. [Database Design](#database-design)
5. [API Architecture](#api-architecture)
6. [Authentication & Authorization](#authentication--authorization)
7. [Business Logic Flows](#business-logic-flows)
8. [Security Architecture](#security-architecture)
9. [Performance & Scalability](#performance--scalability)
10. [Deployment Architecture](#deployment-architecture)

---

## 1. SYSTEM OVERVIEW

### 1.1 Platform Actors

```
┌─────────────────────────────────────────────────────────────┐
│                   Dr MediScie Platform                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   B2C    │  │   B2B    │  │  Vendor  │  │  Admin   │   │
│  │ Customer │  │  Buyer   │  │          │  │          │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│       │             │              │              │          │
│       └─────────────┴──────────────┴──────────────┘         │
│                         │                                    │
│                    [API Gateway]                             │
│                         │                                    │
│              ┌──────────┴──────────┐                        │
│              │                      │                        │
│         [Auth Service]      [Business Services]             │
│              │                      │                        │
│         [RBAC Guard]                │                        │
│                            ┌────────┴────────┐              │
│                            │                  │              │
│                    [Product Service]  [Order Service]       │
│                    [Payment Service]  [Vendor Service]      │
│                    [Analytics Service]                       │
│                            │                                 │
│                      [MongoDB Atlas]                         │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 User Roles & Permissions Matrix

| Feature | B2C Customer | B2B Buyer | Vendor | Admin |
|---------|--------------|-----------|--------|-------|
| View B2C Products | ✅ | ✅ | ❌ | ✅ |
| View Vendor Products | ❌ | ✅ (approved) | ✅ (own) | ✅ |
| See B2C Pricing | ✅ | ✅ | ❌ | ✅ |
| See B2B Pricing | ❌ | ✅ (approved) | ✅ | ✅ |
| Place B2C Order | ✅ | ❌ | ❌ | ❌ |
| Place B2B Order | ❌ | ✅ (approved) | ❌ | ❌ |
| Add Products | ❌ | ❌ | ✅ (approved) | ✅ |
| Manage Products | ❌ | ❌ | ✅ (own) | ✅ (all) |
| Access Payments | ❌ | ❌ | ❌ | ✅ |
| Approve Users | ❌ | ❌ | ❌ | ✅ |
| View Analytics | ❌ | ❌ | ✅ (own) | ✅ (all) |
| Vendor Payout | ❌ | ❌ | ❌ | ✅ |

---

## 2. CORE BUSINESS RULES

### 2.1 B2B Access Control (STRICT GATEKEEPING)

```python
# B2B Registration Flow
1. User registers with:
   - company_name
   - gst_number
   - pan_number
   - business_documents (uploaded to Cloudinary)
   - contact_person_name
   - business_address

2. Initial Status: "PENDING"

3. Admin Reviews:
   ├─ APPROVE → status = "APPROVED" → Enable access
   └─ REJECT → status = "REJECTED" → Send notification

4. Access Rules:
   - PENDING → Cannot login
   - REJECTED → Cannot login
   - APPROVED → Full B2B access
```

### 2.2 Vendor Model (CONTROLLED MARKETPLACE)

```python
# Vendor Approval Flow
1. Vendor applies:
   - business_name
   - store_name
   - gstin
   - bank_account_details
   - identity_proof

2. Admin Approval Required

3. Vendor Permissions (ONLY):
   ✅ Add products (subject to admin approval)
   ✅ Edit own products
   ✅ Delete own products
   ✅ View sales analytics (own products only)
   
   ❌ CANNOT access payments
   ❌ CANNOT withdraw money
   ❌ CANNOT see customer data
   ❌ CANNOT see other vendors' data
```

### 2.3 Dual Pricing System (CRITICAL)

```python
# Product Schema - Dual Pricing
{
  "name": "Ashwagandha Capsules",
  "sku": "DRM-ASH-001",
  
  # B2C Pricing (Retail)
  "b2c_price": {
    "mrp": 599,
    "selling_price": 499,
    "discount_percent": 16.7
  },
  
  # B2B Pricing (Wholesale) - ISOLATED
  "b2b_price": {
    "wholesale_price": 350,
    "moq": 10,  # Minimum Order Quantity
    "tier_pricing": [
      { "min_qty": 10, "price": 350 },
      { "min_qty": 50, "price": 330 },
      { "min_qty": 100, "price": 300 }
    ]
  },
  
  # Visibility Control
  "visibility": {
    "b2c_visible": true,
    "b2b_visible": true,
    "is_vendor_product": false
  }
}
```

### 2.4 Product Visibility Rules

```python
# API-Level Enforcement

def get_products(user):
    if user.role == "B2C_CUSTOMER":
        query = {
            "visibility.b2c_visible": True,
            "visibility.is_vendor_product": False
        }
        projection = {"b2b_price": 0}  # Hide B2B pricing
    
    elif user.role == "B2B_BUYER":
        if user.b2b_status != "APPROVED":
            raise Forbidden("B2B account not approved")
        
        query = {
            "visibility.b2b_visible": True
        }
        projection = {"b2c_price": 0}  # Hide B2C pricing
    
    elif user.role == "VENDOR":
        query = {"vendor_id": user.vendor_id}
        projection = {}  # Full access to own products
    
    elif user.role == "ADMIN":
        query = {}
        projection = {}  # Full access
    
    return products_col.find(query, projection)
```

### 2.5 Payment Flow (ADMIN CONTROL)

```
┌─────────────────────────────────────────────────────────┐
│                    Payment Flow                          │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Customer/B2B Buyer                                      │
│         │                                                │
│         │ (Places Order)                                 │
│         ▼                                                │
│  [Razorpay Checkout]                                     │
│         │                                                │
│         │ (Payment)                                      │
│         ▼                                                │
│  ┌──────────────────┐                                   │
│  │  ADMIN ACCOUNT   │ ◄─── 100% Revenue Collection      │
│  │  (Razorpay)      │                                    │
│  └──────────────────┘                                    │
│         │                                                │
│         │ (Admin Records Transaction)                    │
│         ▼                                                │
│  [Transaction Log]                                       │
│         │                                                │
│         ├─► Commission Calculation                       │
│         ├─► Platform Fee Deduction                       │
│         └─► Vendor Settlement Queue                      │
│                   │                                      │
│                   ▼                                      │
│         [Vendor Payout System]                           │
│                   │                                      │
│                   ├─► Manual Payout (Admin triggered)    │
│                   └─► Scheduled Payout (Monthly/Weekly)  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 3. TECHNOLOGY STACK

### 3.1 Current Stack (Preserved)

```yaml
Frontend:
  - React 18
  - Tailwind CSS
  - Framer Motion
  - React Router v6
  - Context API (Auth + Cart)
  - Axios

Backend:
  - FastAPI (Python 3.10+)
  - Motor (Async MongoDB)
  - Pydantic (Data Validation)
  - JWT (Authentication)
  - Passlib (Password Hashing)

Database:
  - MongoDB Atlas (Primary Database)
  - Redis (Caching - to be added)

Integrations:
  - Razorpay (Payment Gateway)
  - Cloudinary (Media Storage)

Infrastructure:
  - Docker (Containerization)
  - Nginx (Reverse Proxy)
  - Supervisor (Process Management)
```

### 3.2 New Additions (Phase-wise)

```yaml
Phase 1 (User Management):
  - Redis (Session Management)
  - JWT Refresh Token Strategy
  - Role-based Middleware

Phase 2 (Product System):
  - Redis Cache (Product Listings)
  - MongoDB Indexes (Optimized Queries)

Phase 3 (Order System):
  - Celery (Background Jobs)
  - Redis (Task Queue)

Phase 4 (Financial System):
  - Double-entry Ledger System
  - Transaction Logs
  - Razorpay Webhooks

Phase 5 (Admin Panel):
  - Real-time Dashboard (WebSockets)
  - Export to CSV/Excel
  - Advanced Analytics
```

---

## 4. DATABASE DESIGN

### 4.1 Users Collection

```python
{
  "_id": ObjectId,
  "id": "usr_uuid_v4",  # Public ID
  "email": "buyer@company.com",
  "password": "hashed_bcrypt",
  "name": "John Doe",
  "phone": "+91-9876543210",
  "role": "B2B_BUYER",  # B2C_CUSTOMER | B2B_BUYER | VENDOR | ADMIN | SUB_ADMIN
  
  # B2B Specific Fields (only if role = B2B_BUYER)
  "b2b_profile": {
    "company_name": "ABC Distributors Pvt Ltd",
    "gst_number": "27AABCU9603R1Z",
    "pan_number": "AABCU9603R",
    "business_address": {
      "street": "123 Industrial Area",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India"
    },
    "contact_person": {
      "name": "John Doe",
      "designation": "Purchase Manager",
      "phone": "+91-9876543210",
      "email": "buyer@company.com"
    },
    "business_documents": [
      {
        "type": "GST_CERTIFICATE",
        "url": "https://cloudinary.com/...",
        "uploaded_at": ISODate
      },
      {
        "type": "PAN_CARD",
        "url": "https://cloudinary.com/...",
        "uploaded_at": ISODate
      }
    ],
    "approval_status": "PENDING",  # PENDING | APPROVED | REJECTED
    "approval_note": "Documents verified",
    "approved_by": "admin_id",
    "approved_at": ISODate,
    "rejection_reason": null
  },
  
  # Vendor Specific Fields (only if role = VENDOR)
  "vendor_profile": {
    "vendor_id": "vnd_uuid_v4",
    "business_name": "Natural Herbs India",
    "store_name": "Herbs & Wellness",
    "store_slug": "herbs-wellness",
    "gstin": "27AABCU9603R1Z",
    "pan": "AABCU9603R",
    "bank_details": {
      "account_holder_name": "Natural Herbs India",
      "account_number": "1234567890",
      "ifsc_code": "HDFC0001234",
      "bank_name": "HDFC Bank",
      "branch": "Mumbai Main"
    },
    "identity_proof": {
      "type": "AADHAAR",
      "number": "****-****-1234",
      "document_url": "https://cloudinary.com/..."
    },
    "approval_status": "APPROVED",
    "commission_rate": 15,  # Platform commission %
    "approved_by": "admin_id",
    "approved_at": ISODate,
    "onboarded_at": ISODate
  },
  
  # Common Fields
  "addresses": [
    {
      "id": "addr_uuid",
      "type": "SHIPPING",  # SHIPPING | BILLING | BOTH
      "name": "John Doe",
      "phone": "+91-9876543210",
      "street": "123 Park Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India",
      "is_default": true
    }
  ],
  "wishlist": ["product_id_1", "product_id_2"],
  "cart_items": [
    {
      "product_id": "prd_uuid",
      "variant_id": "var_uuid",
      "quantity": 2,
      "added_at": ISODate
    }
  ],
  
  # Security
  "refresh_tokens": [
    {
      "token": "jwt_refresh_token",
      "created_at": ISODate,
      "expires_at": ISODate,
      "revoked": false
    }
  ],
  "password_reset_token": null,
  "password_reset_expires": null,
  
  # Metadata
  "is_active": true,
  "is_verified": false,
  "email_verified_at": null,
  "last_login_at": ISODate,
  "created_at": ISODate,
  "updated_at": ISODate
}

# Indexes
users_email_unique
users_role_approval_status_compound
users_vendor_id_unique
users_b2b_gst_unique
```

### 4.2 Products Collection

```python
{
  "_id": ObjectId,
  "id": "prd_uuid_v4",  # Public ID
  "name": "Organic Ashwagandha Capsules",
  "slug": "organic-ashwagandha-capsules",
  "sku": "DRM-ASH-001",
  "description": "Premium quality Ashwagandha...",
  "short_description": "Stress relief and immunity booster",
  
  # Category
  "category_id": "cat_uuid",
  "category_name": "Ayurvedic Supplements",
  "subcategory_id": "subcat_uuid",
  "subcategory_name": "Immunity Boosters",
  
  # Brand
  "brand": "Dr MediScie",
  "manufacturer": "MediScie Laboratories Pvt Ltd",
  
  # Vendor Info (null if admin product)
  "vendor_id": "vnd_uuid",  # null for admin products
  "vendor_name": "Natural Herbs India",
  "vendor_commission_rate": 15,
  
  # B2C Pricing (Retail)
  "b2c_price": {
    "mrp": 599.00,
    "selling_price": 499.00,
    "discount_percent": 16.7,
    "tax_rate": 12,  # GST %
    "currency": "INR"
  },
  
  # B2B Pricing (Wholesale) - COMPLETELY ISOLATED
  "b2b_price": {
    "wholesale_price": 350.00,
    "moq": 10,  # Minimum Order Quantity
    "max_order_qty": 500,
    "tier_pricing": [
      {
        "min_quantity": 10,
        "max_quantity": 49,
        "price_per_unit": 350.00,
        "discount_percent": 0
      },
      {
        "min_quantity": 50,
        "max_quantity": 99,
        "price_per_unit": 330.00,
        "discount_percent": 5.7
      },
      {
        "min_quantity": 100,
        "max_quantity": null,  # No upper limit
        "price_per_unit": 300.00,
        "discount_percent": 14.3
      }
    ],
    "tax_rate": 12,
    "currency": "INR",
    "payment_terms": "30 days credit",  # Optional
    "delivery_time": "3-5 business days"
  },
  
  # Inventory
  "inventory": {
    "stock": 500,
    "low_stock_threshold": 50,
    "in_stock": true,
    "track_inventory": true,
    "allow_backorder": false,
    "warehouse_location": "Mumbai Warehouse A"
  },
  
  # Media
  "images": [
    {
      "url": "https://res.cloudinary.com/...",
      "public_id": "products/ashwagandha_1",
      "alt_text": "Ashwagandha Capsules Front",
      "is_primary": true,
      "order": 1
    }
  ],
  "videos": [
    {
      "url": "https://res.cloudinary.com/...",
      "thumbnail_url": "...",
      "title": "Product Demo"
    }
  ],
  
  # Product Details
  "specifications": {
    "weight": "100g",
    "dimensions": "10x5x15 cm",
    "pack_size": "60 capsules",
    "shelf_life": "24 months",
    "storage": "Store in cool dry place"
  },
  "ingredients": [
    {
      "name": "Ashwagandha Extract",
      "quantity": "500mg",
      "percentage": 100
    }
  ],
  "tags": ["ayurvedic", "immunity", "stress-relief", "organic"],
  
  # SEO
  "seo": {
    "meta_title": "Organic Ashwagandha Capsules - Dr MediScie",
    "meta_description": "Premium quality organic...",
    "keywords": ["ashwagandha", "immunity", "stress"]
  },
  
  # Visibility & Access Control (CRITICAL)
  "visibility": {
    "b2c_visible": true,      # Show to B2C customers
    "b2b_visible": true,      # Show to B2B buyers
    "is_vendor_product": false,  # If true, ONLY B2B can see
    "is_featured": false,
    "is_new_arrival": false,
    "is_bestseller": false
  },
  
  # Approval (for vendor products)
  "approval": {
    "status": "APPROVED",  # PENDING | APPROVED | REJECTED
    "reviewed_by": "admin_id",
    "reviewed_at": ISODate,
    "rejection_reason": null
  },
  
  # Reviews & Ratings
  "ratings": {
    "average": 4.5,
    "count": 120,
    "distribution": {
      "5_star": 80,
      "4_star": 25,
      "3_star": 10,
      "2_star": 3,
      "1_star": 2
    }
  },
  
  # Analytics
  "analytics": {
    "views": 1500,
    "b2c_orders": 45,
    "b2b_orders": 12,
    "total_revenue": 45000.00,
    "last_ordered_at": ISODate
  },
  
  # Status
  "status": "ACTIVE",  # ACTIVE | INACTIVE | DRAFT | OUT_OF_STOCK
  "is_deleted": false,
  "created_by": "admin_id",  # or vendor_id
  "created_at": ISODate,
  "updated_at": ISODate
}

# Indexes
products_slug_unique
products_sku_unique
products_vendor_id_status_compound
products_category_visibility_compound
products_b2c_visible_status_compound
products_b2b_visible_status_compound
products_vendor_product_flag
```

### 4.3 Orders Collection

```python
{
  "_id": ObjectId,
  "id": "ord_uuid_v4",
  "order_number": "DRM-ORD-2024-00001",  # Human readable
  
  # Customer Info
  "user_id": "usr_uuid",
  "user_email": "customer@example.com",
  "user_type": "B2C_CUSTOMER",  # B2C_CUSTOMER | B2B_BUYER
  
  # B2B Order Specific
  "b2b_details": {
    "company_name": "ABC Distributors",
    "gst_number": "27AABCU9603R1Z",
    "po_number": "PO-2024-001",  # Purchase Order Number
    "credit_days": 30
  },
  
  # Order Items (Can be multi-vendor)
  "items": [
    {
      "id": "item_uuid",
      "product_id": "prd_uuid",
      "product_name": "Ashwagandha Capsules",
      "sku": "DRM-ASH-001",
      "vendor_id": "vnd_uuid",  # null if admin product
      "vendor_name": "Natural Herbs India",
      "variant_id": "var_uuid",
      "quantity": 50,
      "price_type": "B2B",  # B2C | B2B
      "unit_price": 330.00,  # Price at time of order
      "mrp": 599.00,
      "tax_rate": 12,
      "tax_amount": 1980.00,  # (50 * 330 * 12%)
      "subtotal": 16500.00,  # (50 * 330)
      "total": 18480.00,  # subtotal + tax
      "commission_rate": 15,  # Vendor commission %
      "commission_amount": 2472.00,  # Platform keeps this
      "vendor_settlement": 15508.00,  # Vendor gets this (after commission)
      "status": "CONFIRMED",  # PENDING | CONFIRMED | SHIPPED | DELIVERED | CANCELLED | RETURNED
      "image_url": "https://..."
    }
  ],
  
  # Order Summary
  "pricing": {
    "subtotal": 16500.00,
    "tax_total": 1980.00,
    "shipping_charge": 0.00,  # Free shipping for B2B bulk orders
    "discount_amount": 0.00,
    "coupon_code": null,
    "grand_total": 18480.00,
    "currency": "INR"
  },
  
  # Shipping Address
  "shipping_address": {
    "name": "John Doe",
    "phone": "+91-9876543210",
    "street": "123 Industrial Area",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India",
    "address_type": "BUSINESS"  # HOME | BUSINESS
  },
  
  # Billing Address
  "billing_address": {
    "same_as_shipping": false,
    "name": "ABC Distributors Pvt Ltd",
    "gst_number": "27AABCU9603R1Z",
    "street": "456 Business Park",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400002",
    "country": "India"
  },
  
  # Payment Details
  "payment": {
    "method": "RAZORPAY",  # RAZORPAY | COD | BANK_TRANSFER | CREDIT_TERMS
    "status": "PAID",  # PENDING | PAID | FAILED | REFUNDED | PARTIALLY_REFUNDED
    "razorpay_order_id": "order_N1a2b3c4d5e6f7",
    "razorpay_payment_id": "pay_X1y2z3a4b5c6d7",
    "razorpay_signature": "signature_hash",
    "transaction_id": "txn_uuid",
    "paid_amount": 18480.00,
    "paid_at": ISODate,
    "payment_gateway_response": {}  # Full response from Razorpay
  },
  
  # Shipping & Tracking
  "shipping": {
    "method": "EXPRESS",  # STANDARD | EXPRESS | SAME_DAY
    "carrier": "BlueDart",
    "tracking_number": "BD1234567890",
    "tracking_url": "https://...",
    "estimated_delivery": ISODate,
    "shipped_at": ISODate,
    "delivered_at": ISODate
  },
  
  # Order Status
  "status": "CONFIRMED",  # PENDING | CONFIRMED | PROCESSING | SHIPPED | DELIVERED | CANCELLED | RETURNED | REFUNDED
  "status_history": [
    {
      "status": "PENDING",
      "note": "Order placed",
      "timestamp": ISODate,
      "updated_by": "usr_uuid"
    },
    {
      "status": "CONFIRMED",
      "note": "Payment confirmed",
      "timestamp": ISODate,
      "updated_by": "admin_id"
    }
  ],
  
  # Multi-vendor Split (if applicable)
  "vendor_splits": [
    {
      "vendor_id": "vnd_uuid_1",
      "vendor_name": "Natural Herbs India",
      "items_count": 2,
      "subtotal": 10000.00,
      "tax": 1200.00,
      "total": 11200.00,
      "commission_amount": 1680.00,  # 15% of 11200
      "settlement_amount": 9520.00,  # Vendor gets this
      "settlement_status": "PENDING",  # PENDING | SETTLED
      "settled_at": null
    }
  ],
  
  # Invoice
  "invoice": {
    "invoice_number": "INV-2024-00001",
    "invoice_url": "https://cloudinary.com/invoices/...",
    "generated_at": ISODate
  },
  
  # Return/Refund
  "return": {
    "is_returned": false,
    "return_requested_at": null,
    "return_reason": null,
    "return_status": null,  # REQUESTED | APPROVED | REJECTED | PICKED_UP | REFUNDED
    "refund_amount": 0.00,
    "refund_status": null,
    "refunded_at": null
  },
  
  # Metadata
  "notes": "Customer requested faster delivery",
  "internal_notes": "VIP customer - priority handling",
  "created_at": ISODate,
  "updated_at": ISODate
}

# Indexes
orders_user_id_status_compound
orders_order_number_unique
orders_vendor_id_compound
orders_payment_status_compound
orders_created_at_desc
```

### 4.4 Transactions Collection (Financial Ledger)

```python
{
  "_id": ObjectId,
  "id": "txn_uuid_v4",
  "transaction_number": "TXN-2024-00001",
  
  # Transaction Type
  "type": "ORDER_PAYMENT",  # ORDER_PAYMENT | VENDOR_PAYOUT | REFUND | COMMISSION | PLATFORM_FEE
  
  # Related Entities
  "order_id": "ord_uuid",
  "user_id": "usr_uuid",
  "vendor_id": "vnd_uuid",  # null for non-vendor transactions
  
  # Payment Details
  "payment_gateway": "RAZORPAY",
  "gateway_transaction_id": "pay_X1y2z3a4b5c6d7",
  "gateway_order_id": "order_N1a2b3c4d5e6f7",
  
  # Amounts (Double-entry bookkeeping)
  "amount": 18480.00,
  "tax_amount": 1980.00,
  "net_amount": 16500.00,
  "commission_amount": 2472.00,  # Platform commission
  "vendor_settlement_amount": 14028.00,  # Amount payable to vendor
  "currency": "INR",
  
  # Transaction Flow
  "debit_account": "CUSTOMER_WALLET",  # Source
  "credit_account": "ADMIN_REVENUE",    # Destination
  
  # Status
  "status": "SUCCESS",  # PENDING | SUCCESS | FAILED | REVERSED
  "status_message": "Payment captured successfully",
  
  # Reconciliation
  "is_reconciled": true,
  "reconciled_at": ISODate,
  "reconciliation_note": "Bank statement matched",
  
  # Metadata
  "gateway_response": {},  # Full payment gateway response
  "created_at": ISODate,
  "updated_at": ISODate
}

# Indexes
transactions_order_id
transactions_user_id_type_compound
transactions_vendor_id_compound
transactions_status_created_at_compound
transactions_type_status_compound
```

### 4.5 Vendor Payouts Collection

```python
{
  "_id": ObjectId,
  "id": "payout_uuid_v4",
  "payout_number": "PAYOUT-2024-00001",
  
  # Vendor Info
  "vendor_id": "vnd_uuid",
  "vendor_name": "Natural Herbs India",
  "vendor_email": "vendor@example.com",
  
  # Bank Details
  "bank_details": {
    "account_holder_name": "Natural Herbs India",
    "account_number": "****6789",  # Last 4 digits
    "ifsc_code": "HDFC0001234",
    "bank_name": "HDFC Bank"
  },
  
  # Payout Period
  "period": {
    "start_date": ISODate("2024-01-01"),
    "end_date": ISODate("2024-01-31")
  },
  
  # Financial Summary
  "summary": {
    "total_orders": 25,
    "gross_revenue": 250000.00,  # Total sales
    "platform_commission": 37500.00,  # 15% commission
    "tax_deducted": 2250.00,  # TDS if applicable
    "other_deductions": 0.00,
    "net_payable": 210250.00  # Amount to be paid
  },
  
  # Included Orders
  "order_ids": ["ord_uuid_1", "ord_uuid_2", "..."],
  "order_count": 25,
  
  # Payout Details
  "payout_method": "BANK_TRANSFER",  # BANK_TRANSFER | RAZORPAY_X | MANUAL
  "payout_amount": 210250.00,
  "payout_status": "COMPLETED",  # PENDING | PROCESSING | COMPLETED | FAILED
  
  # Transfer Info
  "transfer_details": {
    "utr_number": "HDFC12345678901234",  # Unique Transaction Reference
    "transfer_date": ISODate,
    "transfer_mode": "NEFT",  # NEFT | RTGS | IMPS
    "initiated_by": "admin_id",
    "completed_at": ISODate
  },
  
  # Invoice
  "vendor_invoice": {
    "invoice_number": "VINV-2024-00001",
    "invoice_url": "https://cloudinary.com/vendor-invoices/...",
    "generated_at": ISODate
  },
  
  # Approval Workflow
  "approval": {
    "requested_by": "admin_id",
    "requested_at": ISODate,
    "approved_by": "admin_id",
    "approved_at": ISODate,
    "approval_note": "Monthly settlement for January 2024"
  },
  
  # Status History
  "status_history": [
    {
      "status": "PENDING",
      "note": "Payout initiated",
      "timestamp": ISODate,
      "updated_by": "admin_id"
    },
    {
      "status": "COMPLETED",
      "note": "Transfer successful",
      "timestamp": ISODate,
      "updated_by": "system"
    }
  ],
  
  # Metadata
  "notes": "Regular monthly payout",
  "created_at": ISODate,
  "updated_at": ISODate
}

# Indexes
payouts_vendor_id_status_compound
payouts_payout_number_unique
payouts_status_created_at_compound
payouts_period_vendor_compound
```

### 4.6 Commission Logs Collection

```python
{
  "_id": ObjectId,
  "id": "comm_uuid_v4",
  
  # Reference
  "order_id": "ord_uuid",
  "order_number": "DRM-ORD-2024-00001",
  "order_item_id": "item_uuid",
  
  # Vendor Info
  "vendor_id": "vnd_uuid",
  "vendor_name": "Natural Herbs India",
  
  # Product Info
  "product_id": "prd_uuid",
  "product_name": "Ashwagandha Capsules",
  "sku": "DRM-ASH-001",
  
  # Financial Details
  "item_subtotal": 16500.00,  # Before tax
  "item_tax": 1980.00,
  "item_total": 18480.00,  # After tax
  
  # Commission Calculation
  "commission_rate": 15,  # Percentage
  "commission_amount": 2472.00,  # Platform keeps this
  "vendor_settlement": 15508.00,  # Vendor gets this
  
  # Status
  "status": "ACCRUED",  # ACCRUED | SETTLED | DISPUTED | REVERSED
  "settled_in_payout_id": "payout_uuid",  # Reference to payout
  "settled_at": null,
  
  # Metadata
  "created_at": ISODate,
  "updated_at": ISODate
}

# Indexes
commission_vendor_id_status_compound
commission_order_id
commission_settled_at
```

### 4.7 Audit Logs Collection

```python
{
  "_id": ObjectId,
  "id": "audit_uuid_v4",
  
  # Actor (Who did the action)
  "user_id": "usr_uuid",
  "user_email": "admin@drmedisc ie.com",
  "user_role": "ADMIN",
  "user_ip": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  
  # Action Details
  "action": "APPROVE_B2B_USER",  # CRUD operations, status changes
  "entity_type": "USER",  # USER | PRODUCT | ORDER | VENDOR | PAYOUT
  "entity_id": "usr_uuid",
  "entity_name": "ABC Distributors",
  
  # Changes (Before & After)
  "changes": {
    "field": "b2b_profile.approval_status",
    "old_value": "PENDING",
    "new_value": "APPROVED"
  },
  
  # Context
  "description": "B2B account approved after document verification",
  "severity": "INFO",  # DEBUG | INFO | WARNING | ERROR | CRITICAL
  "category": "USER_MANAGEMENT",  # Categorize actions
  
  # Request Info
  "request": {
    "method": "POST",
    "path": "/api/admin/b2b-users/usr_uuid/approve",
    "query_params": {},
    "body": { "approval_note": "Documents verified" }
  },
  
  # Timestamp
  "timestamp": ISODate,
  "created_at": ISODate
}

# Indexes
audit_user_id_timestamp_compound
audit_entity_type_entity_id_compound
audit_action_timestamp_compound
audit_timestamp_desc
```

### 4.8 Notifications Collection

```python
{
  "_id": ObjectId,
  "id": "notif_uuid_v4",
  
  # Recipient
  "user_id": "usr_uuid",
  "user_email": "customer@example.com",
  "user_role": "B2B_BUYER",
  
  # Notification Details
  "type": "B2B_ACCOUNT_APPROVED",  # Type of notification
  "category": "ACCOUNT",  # ACCOUNT | ORDER | PAYMENT | PRODUCT | SYSTEM
  "priority": "HIGH",  # LOW | MEDIUM | HIGH | URGENT
  
  # Content
  "title": "Your B2B Account has been Approved!",
  "message": "Congratulations! Your B2B account for ABC Distributors has been approved. You can now access wholesale products and pricing.",
  "action_text": "Browse Products",
  "action_url": "/products?type=b2b",
  
  # Channels
  "channels": {
    "in_app": true,
    "email": true,
    "sms": false,
    "push": false
  },
  
  # Delivery Status
  "delivery_status": {
    "in_app": {
      "sent": true,
      "read": false,
      "read_at": null
    },
    "email": {
      "sent": true,
      "delivered": true,
      "opened": false,
      "sent_at": ISODate,
      "provider_response": {}
    }
  },
  
  # Related Entity
  "entity_type": "USER",
  "entity_id": "usr_uuid",
  
  # Metadata
  "expires_at": ISODate,  # Auto-delete after 90 days
  "created_at": ISODate
}

# Indexes
notifications_user_id_created_at_desc
notifications_user_id_read_compound
notifications_type_created_at_compound
```

---

## 5. API ARCHITECTURE

### 5.1 API Structure

```
/api/v1/
├── auth/
│   ├── POST   /register           # B2C customer registration
│   ├── POST   /register-b2b       # B2B company registration
│   ├── POST   /register-vendor    # Vendor registration
│   ├── POST   /login              # Universal login (all roles)
│   ├── POST   /logout             # Logout (revoke refresh token)
│   ├── POST   /refresh            # Refresh access token
│   ├── POST   /forgot-password    # Password reset request
│   └── POST   /reset-password     # Reset password with token
│
├── users/
│   ├── GET    /me                 # Get current user profile
│   ├── PUT    /me                 # Update profile
│   ├── GET    /me/addresses       # Get user addresses
│   ├── POST   /me/addresses       # Add new address
│   ├── PUT    /me/addresses/:id   # Update address
│   ├── DELETE /me/addresses/:id   # Delete address
│   ├── GET    /me/wishlist        # Get wishlist
│   ├── POST   /me/wishlist        # Add to wishlist
│   └── DELETE /me/wishlist/:id    # Remove from wishlist
│
├── products/
│   ├── GET    /                   # List products (role-based visibility)
│   ├── GET    /:id                # Get product details (role-based pricing)
│   ├── GET    /featured           # Featured products
│   ├── GET    /new-arrivals       # New arrivals
│   ├── GET    /search             # Search products
│   └── GET    /category/:slug     # Products by category
│
├── cart/
│   ├── GET    /                   # Get cart
│   ├── POST   /add                # Add to cart
│   ├── PUT    /update/:item_id    # Update cart item
│   ├── DELETE /remove/:item_id    # Remove from cart
│   └── DELETE /clear              # Clear cart
│
├── orders/
│   ├── POST   /create             # Create order (B2C or B2B)
│   ├── GET    /                   # Get user orders
│   ├── GET    /:id                # Get order details
│   ├── POST   /:id/cancel         # Cancel order
│   └── POST   /:id/return         # Request return
│
├── payments/
│   ├── POST   /create-order       # Create Razorpay order
│   ├── POST   /verify             # Verify payment signature
│   └── POST   /webhook            # Razorpay webhook handler
│
├── vendor/  (Protected: VENDOR role only)
│   ├── GET    /dashboard          # Vendor analytics
│   ├── GET    /products           # Get vendor products
│   ├── POST   /products           # Add new product
│   ├── PUT    /products/:id       # Update product
│   ├── DELETE /products/:id       # Delete product
│   ├── GET    /orders             # Get orders for vendor products
│   ├── GET    /payouts            # Get payout history
│   └── GET    /analytics          # Sales analytics
│
├── admin/  (Protected: ADMIN role only)
│   ├── GET    /dashboard          # Admin dashboard stats
│   │
│   ├── # B2B Management
│   ├── GET    /b2b-users          # List B2B registration requests
│   ├── GET    /b2b-users/:id      # Get B2B user details
│   ├── POST   /b2b-users/:id/approve   # Approve B2B account
│   ├── POST   /b2b-users/:id/reject    # Reject B2B account
│   │
│   ├── # Vendor Management
│   ├── GET    /vendors            # List all vendors
│   ├── GET    /vendors/:id        # Get vendor details
│   ├── POST   /vendors/:id/approve     # Approve vendor
│   ├── POST   /vendors/:id/reject      # Reject vendor
│   ├── PUT    /vendors/:id/commission  # Update commission rate
│   │
│   ├── # Product Management
│   ├── GET    /products           # All products (including pending)
│   ├── POST   /products/:id/approve    # Approve vendor product
│   ├── POST   /products/:id/reject     # Reject vendor product
│   ├── PUT    /products/:id/visibility # Update product visibility
│   │
│   ├── # Order Management
│   ├── GET    /orders             # All orders (B2C + B2B)
│   ├── PUT    /orders/:id/status  # Update order status
│   ├── POST   /orders/:id/refund  # Process refund
│   │
│   ├── # Financial Management
│   ├── GET    /transactions       # All transactions
│   ├── GET    /payouts            # Vendor payouts
│   ├── POST   /payouts/create     # Create vendor payout
│   ├── POST   /payouts/:id/process     # Process payout
│   ├── GET    /commissions        # Commission logs
│   ├── GET    /revenue            # Revenue analytics
│   │
│   ├── # User Management
│   ├── GET    /users              # All users
│   ├── PUT    /users/:id/status   # Activate/deactivate user
│   │
│   └── # Reports
│       ├── GET    /reports/sales  # Sales report
│       ├── GET    /reports/vendors     # Vendor performance
│       └── GET    /reports/products    # Product performance
│
└── categories/
    ├── GET    /                   # List categories
    └── GET    /:slug              # Get category details
```

### 5.2 API Response Format (Standard)

```python
# Success Response
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    # Response data here
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "req_uuid"
  }
}

# Error Response
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "B2B account not approved",
    "details": "Your B2B account is pending admin approval. You will receive an email once approved."
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "req_uuid"
  }
}

# Paginated Response
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

---

## 6. AUTHENTICATION & AUTHORIZATION

### 6.1 JWT Token Strategy

```python
# Access Token (Short-lived: 15 minutes)
{
  "user_id": "usr_uuid",
  "email": "user@example.com",
  "role": "B2B_BUYER",
  "permissions": ["read:products", "create:orders"],
  "b2b_status": "APPROVED",  # Only for B2B users
  "vendor_id": "vnd_uuid",   # Only for vendors
  "exp": 1705320000,  # Expiration timestamp
  "iat": 1705319100,  # Issued at
  "jti": "token_uuid"  # JWT ID (for revocation)
}

# Refresh Token (Long-lived: 30 days)
{
  "user_id": "usr_uuid",
  "token_id": "refresh_uuid",
  "exp": 1707907200,
  "iat": 1705315200
}
```

### 6.2 Role-Based Access Control (RBAC)

```python
# Permission Matrix
PERMISSIONS = {
    "B2C_CUSTOMER": [
        "read:products:b2c",
        "read:own:orders",
        "create:orders:b2c",
        "update:own:profile",
        "manage:own:cart",
        "manage:own:wishlist"
    ],
    
    "B2B_BUYER": [
        "read:products:b2b",  # Can see vendor products
        "read:products:wholesale_pricing",
        "create:orders:b2b",
        "read:own:orders",
        "update:own:profile",
        "manage:own:cart",
        "download:invoices"
    ],
    
    "VENDOR": [
        "read:own:products",
        "create:products",  # Subject to admin approval
        "update:own:products",
        "delete:own:products",
        "read:own:orders",
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
        "read:all:transactions",
        "read:all:analytics",
        "manage:all:users"
    ]
}

# Middleware Example
async def require_role(required_roles: list):
    async def decorator(request):
        user = request.state.user
        
        if user.role not in required_roles:
            raise HTTPException(403, "Insufficient permissions")
        
        # Additional check for B2B users
        if user.role == "B2B_BUYER":
            if user.b2b_status != "APPROVED":
                raise HTTPException(403, "B2B account not approved")
        
        # Additional check for Vendors
        if user.role == "VENDOR":
            if user.vendor_status != "APPROVED":
                raise HTTPException(403, "Vendor account not approved")
        
        return await call_next(request)
    
    return decorator
```

### 6.3 B2B Access Control Flow

```python
# B2B Registration → Login Flow

1. User Registers as B2B:
   POST /api/auth/register-b2b
   {
     "email": "buyer@company.com",
     "password": "secure_pass",
     "company_name": "ABC Distributors",
     "gst_number": "27AABCU9603R1Z",
     "pan_number": "AABCU9603R",
     "business_documents": ["file1", "file2"]
   }
   
   Response:
   {
     "success": true,
     "message": "B2B registration submitted. Awaiting admin approval.",
     "data": {
       "user_id": "usr_uuid",
       "approval_status": "PENDING"
     }
   }

2. User Attempts Login:
   POST /api/auth/login
   {
     "email": "buyer@company.com",
     "password": "secure_pass"
   }
   
   # Check approval status
   if user.role == "B2B_BUYER" and user.b2b_status != "APPROVED":
       raise HTTPException(403, {
           "code": "B2B_NOT_APPROVED",
           "message": "Your B2B account is pending approval",
           "details": "Please wait for admin to review your application"
       })
   
   # If approved, return tokens
   return {
       "access_token": "jwt_token",
       "refresh_token": "refresh_token",
       "user": { ... }
   }

3. Admin Approves:
   POST /api/admin/b2b-users/:id/approve
   
   # Update user status
   user.b2b_profile.approval_status = "APPROVED"
   user.b2b_profile.approved_by = admin.id
   user.b2b_profile.approved_at = datetime.now()
   
   # Send notification
   send_notification(user, "B2B_ACCOUNT_APPROVED")
   
   # Send email
   send_email(user.email, "B2B Account Approved")

4. User Logs In Again:
   # Now login succeeds
   # User can access B2B products and pricing
```

---

## 7. BUSINESS LOGIC FLOWS

### 7.1 B2B Order Flow

```
┌───────────────────────────────────────────────────────────┐
│              B2B Order Placement Flow                      │
├───────────────────────────────────────────────────────────┤
│                                                             │
│  B2B Buyer (Approved)                                      │
│         │                                                  │
│         │ (Browses Products)                               │
│         ▼                                                  │
│  [View Vendor Products]                                    │
│  - Only B2B-visible products                               │
│  - Wholesale pricing displayed                             │
│  - MOQ enforced                                            │
│         │                                                  │
│         │ (Adds to Cart)                                   │
│         ▼                                                  │
│  [Cart Validation]                                         │
│  - Check MOQ for each product                              │
│  - Validate stock availability                             │
│  - Apply tier pricing if applicable                        │
│         │                                                  │
│         │ (Proceeds to Checkout)                           │
│         ▼                                                  │
│  [Checkout]                                                │
│  - Enter/Select Shipping Address                           │
│  - Enter/Select Billing Address (with GST)                 │
│  - Optional: Enter PO Number                               │
│  - Select Payment Method:                                  │
│    ├─ Razorpay (Immediate)                                 │
│    ├─ Bank Transfer                                        │
│    └─ Credit Terms (30/60 days)                            │
│         │                                                  │
│         │ (Places Order)                                   │
│         ▼                                                  │
│  [Order Created]                                           │
│  - Status: PENDING                                         │
│  - Generate Order Number                                   │
│  - Calculate Commission                                    │
│  - Split Order by Vendor (if multi-vendor)                 │
│         │                                                  │
│         │ (Payment Processing)                             │
│         ▼                                                  │
│  [Payment Gateway]                                         │
│  - All payments → ADMIN account                            │
│  - Create transaction log                                  │
│         │                                                  │
│         │ (Payment Success)                                │
│         ▼                                                  │
│  [Order Confirmed]                                         │
│  - Status: CONFIRMED                                       │
│  - Deduct inventory                                        │
│  - Create commission log                                   │
│  - Add to vendor settlement queue                          │
│  - Send notifications (Buyer, Vendor, Admin)               │
│  - Generate GST Invoice                                    │
│         │                                                  │
│         │ (Vendor Processes)                               │
│         ▼                                                  │
│  [Order Processing]                                        │
│  - Vendor marks as PROCESSING                              │
│  - Vendor ships items                                      │
│  - Status: SHIPPED                                         │
│  - Add tracking details                                    │
│         │                                                  │
│         │ (Delivery)                                       │
│         ▼                                                  │
│  [Order Delivered]                                         │
│  - Status: DELIVERED                                       │
│  - Commission becomes settleable                           │
│         │                                                  │
│         │ (Admin Settles)                                  │
│         ▼                                                  │
│  [Vendor Payout]                                           │
│  - Admin creates payout                                    │
│  - Transfer to vendor bank account                         │
│  - Record UTR number                                       │
│  - Send payout notification                                │
│                                                             │
└───────────────────────────────────────────────────────────┘
```

### 7.2 Vendor Product Approval Flow

```
┌───────────────────────────────────────────────────────────┐
│           Vendor Product Approval Flow                     │
├───────────────────────────────────────────────────────────┤
│                                                             │
│  Vendor (Approved)                                         │
│         │                                                  │
│         │ (Adds New Product)                               │
│         ▼                                                  │
│  POST /api/vendor/products                                 │
│  {                                                         │
│    "name": "Organic Turmeric Powder",                      │
│    "b2c_price": { "selling_price": 299 },                  │
│    "b2b_price": { "wholesale_price": 180, "moq": 20 },     │
│    "stock": 1000,                                          │
│    "images": [...]                                         │
│  }                                                         │
│         │                                                  │
│         ▼                                                  │
│  [Product Created]                                         │
│  - status: "PENDING"                                       │
│  - approval_status: "PENDING"                              │
│  - visibility: { b2c_visible: false, b2b_visible: false }  │
│  - is_vendor_product: true                                 │
│         │                                                  │
│         │ (Notify Admin)                                   │
│         ▼                                                  │
│  [Admin Reviews]                                           │
│  - Check product details                                   │
│  - Check pricing                                           │
│  - Verify images                                           │
│  - Check compliance                                        │
│         │                                                  │
│         ├─────────────┬──────────────┐                     │
│         ▼             ▼              ▼                     │
│    [APPROVE]    [REJECT]       [REQUEST_CHANGES]          │
│         │             │              │                     │
│         │             │              │                     │
│  [If APPROVED]        │              │                     │
│  - approval_status: "APPROVED"       │                     │
│  - visibility.b2b_visible: true      │                     │
│  - status: "ACTIVE"                  │                     │
│  - Send vendor notification          │                     │
│         │             │              │                     │
│  [If REJECTED]        │              │                     │
│         │ - approval_status: "REJECTED"                    │
│         │ - status: "REJECTED"                             │
│         │ - Send rejection reason                          │
│         │                                                  │
│  [If REQUEST_CHANGES]                                      │
│         │ - Send feedback to vendor                        │
│         │ - Vendor edits and resubmits                     │
│         │                                                  │
│         ▼                                                  │
│  [Product Live]                                            │
│  - Visible to B2B buyers only                              │
│  - Vendor can track performance                            │
│                                                             │
└───────────────────────────────────────────────────────────┘
```

### 7.3 Vendor Payout Settlement Flow

```
┌───────────────────────────────────────────────────────────┐
│            Vendor Payout Settlement Flow                   │
├───────────────────────────────────────────────────────────┤
│                                                             │
│  [Delivered Orders]                                        │
│         │                                                  │
│         │ (Commission Logs Created)                        │
│         ▼                                                  │
│  [Settleable Amount Calculation]                           │
│  For Vendor: "Natural Herbs India"                         │
│  Period: Jan 1 - Jan 31, 2024                              │
│                                                             │
│  Total Orders: 25                                          │
│  Gross Revenue: ₹250,000                                   │
│  Platform Commission (15%): ₹37,500                        │
│  TDS (if applicable): ₹2,250                               │
│  Net Payable: ₹210,250                                     │
│         │                                                  │
│         │ (Admin Creates Payout)                           │
│         ▼                                                  │
│  POST /api/admin/payouts/create                            │
│  {                                                         │
│    "vendor_id": "vnd_uuid",                                │
│    "period_start": "2024-01-01",                           │
│    "period_end": "2024-01-31",                             │
│    "payout_amount": 210250.00                              │
│  }                                                         │
│         │                                                  │
│         ▼                                                  │
│  [Payout Record Created]                                   │
│  - status: "PENDING"                                       │
│  - Generate payout_number                                  │
│  - Link all settled order_ids                              │
│         │                                                  │
│         │ (Admin Approves)                                 │
│         ▼                                                  │
│  [Transfer Initiated]                                      │
│  - Method: Bank Transfer (NEFT/RTGS)                       │
│  - status: "PROCESSING"                                    │
│         │                                                  │
│         │ (Bank Transfer)                                  │
│         ▼                                                  │
│  [Transfer Completed]                                      │
│  - Record UTR number                                       │
│  - status: "COMPLETED"                                     │
│  - Update commission logs: "SETTLED"                       │
│  - Send vendor notification                                │
│  - Generate vendor invoice                                 │
│         │                                                  │
│         ▼                                                  │
│  [Vendor Receives Payment]                                 │
│  - View payout in dashboard                                │
│  - Download payout invoice                                 │
│                                                             │
└───────────────────────────────────────────────────────────┘
```

---

## 8. SECURITY ARCHITECTURE

### 8.1 Security Layers

```
┌───────────────────────────────────────────────────────────┐
│                  Security Layers                           │
├───────────────────────────────────────────────────────────┤
│                                                             │
│  [Layer 1: Transport Security]                             │
│  - HTTPS/TLS 1.3 (SSL Certificate)                         │
│  - HSTS Headers                                            │
│  - Secure Cookies (httpOnly, secure, sameSite)             │
│                                                             │
│  [Layer 2: Authentication]                                 │
│  - JWT with RS256 algorithm                                │
│  - Access Token (15 min expiry)                            │
│  - Refresh Token (30 day expiry)                           │
│  - Token Revocation List (Redis)                           │
│  - Bcrypt password hashing (cost: 12)                      │
│                                                             │
│  [Layer 3: Authorization (RBAC)]                           │
│  - Role-based access control                               │
│  - Permission-based guards                                 │
│  - Resource-level access control                           │
│  - B2B approval status check                               │
│  - Vendor approval status check                            │
│                                                             │
│  [Layer 4: Input Validation]                               │
│  - Pydantic models (strict validation)                     │
│  - SQL injection prevention (parameterized queries)        │
│  - XSS prevention (output encoding)                        │
│  - CSRF tokens                                             │
│  - File upload validation (type, size, content)            │
│                                                             │
│  [Layer 5: Rate Limiting]                                  │
│  - API rate limits (per IP)                                │
│    ├─ Auth endpoints: 5 req/min                            │
│    ├─ Public APIs: 100 req/min                             │
│    └─ Protected APIs: 500 req/min                          │
│  - Redis-based rate limiting                               │
│                                                             │
│  [Layer 6: Data Protection]                                │
│  - PII data encryption at rest                             │
│  - Sensitive data masking in logs                          │
│  - Secure token storage (Redis, short TTL)                 │
│  - Payment data: PCI DSS compliance (via Razorpay)         │
│                                                             │
│  [Layer 7: Audit & Monitoring]                             │
│  - All admin actions logged                                │
│  - Failed login attempt tracking                           │
│  - Suspicious activity alerts                              │
│  - Real-time monitoring (Sentry/CloudWatch)                │
│                                                             │
│  [Layer 8: Infrastructure Security]                        │
│  - MongoDB IP whitelist                                    │
│  - Environment variables (no hardcoded secrets)            │
│  - Secrets management (AWS Secrets Manager)                │
│  - Regular security updates                                │
│                                                             │
└───────────────────────────────────────────────────────────┘
```

### 8.2 Payment Security Flow

```python
# Payment Flow (Razorpay Integration)

1. Create Order:
   POST /api/payments/create-order
   {
     "order_id": "ord_uuid",
     "amount": 18480.00
   }
   
   # Server-side (Admin Account)
   razorpay_order = razorpay_client.order.create({
       "amount": 1848000,  # Amount in paise
       "currency": "INR",
       "receipt": "ord_uuid",
       "notes": {
           "order_id": "ord_uuid",
           "user_id": "usr_uuid"
       }
   })
   
   return {
       "razorpay_order_id": razorpay_order["id"],
       "razorpay_key_id": RAZORPAY_KEY_ID  # Public key
   }

2. Frontend Payment:
   # Razorpay Checkout opens
   # User completes payment
   # Payment goes to ADMIN Razorpay account
   
3. Verify Payment:
   POST /api/payments/verify
   {
     "razorpay_order_id": "order_xyz",
     "razorpay_payment_id": "pay_abc",
     "razorpay_signature": "signature_hash"
   }
   
   # Server verifies signature
   expected_signature = hmac.new(
       RAZORPAY_SECRET.encode(),
       f"{razorpay_order_id}|{razorpay_payment_id}".encode(),
       hashlib.sha256
   ).hexdigest()
   
   if expected_signature != razorpay_signature:
       raise HTTPException(400, "Invalid payment signature")
   
   # Update order status
   order.payment.status = "PAID"
   order.status = "CONFIRMED"
   
   # Create transaction log
   create_transaction(order, payment_details)
   
   # Calculate and log commission
   calculate_commission(order)

4. Webhook Handler (Backup):
   POST /api/payments/webhook
   # Razorpay webhook for payment updates
   # Verify webhook signature
   # Update order status
   # Handle edge cases (delayed payments, failures)
```

---

## 9. PERFORMANCE & SCALABILITY

### 9.1 Caching Strategy

```python
# Redis Caching Implementation

# Cache Keys Structure
CACHE_KEYS = {
    "product_list": "products:list:{filters_hash}",
    "product_detail": "product:{product_id}",
    "user_profile": "user:{user_id}",
    "vendor_analytics": "vendor:{vendor_id}:analytics",
    "category_tree": "categories:tree",
    "cart": "cart:{user_id}",
    "session": "session:{session_id}"
}

# Cache TTL
CACHE_TTL = {
    "product_list": 300,  # 5 minutes
    "product_detail": 600,  # 10 minutes
    "user_profile": 1800,  # 30 minutes
    "vendor_analytics": 3600,  # 1 hour
    "category_tree": 86400,  # 24 hours
    "cart": 3600,  # 1 hour
    "session": 1800  # 30 minutes
}

# Cache Invalidation Strategy
def invalidate_product_cache(product_id):
    # Clear specific product
    redis.delete(f"product:{product_id}")
    
    # Clear product lists (all variations)
    redis.delete_pattern("products:list:*")
    
    # Clear category cache
    redis.delete("categories:tree")

# Write-through Caching
async def get_product(product_id, user_role):
    cache_key = f"product:{product_id}:{user_role}"
    
    # Try cache first
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # Fetch from database
    product = await products_col.find_one({"id": product_id})
    
    # Apply role-based filtering
    product = filter_by_role(product, user_role)
    
    # Cache result
    await redis.setex(
        cache_key,
        CACHE_TTL["product_detail"],
        json.dumps(product)
    )
    
    return product
```

### 9.2 Database Indexing

```javascript
// MongoDB Indexes

// Users Collection
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "role": 1, "b2b_profile.approval_status": 1 })
db.users.createIndex({ "vendor_profile.vendor_id": 1 }, { unique: true, sparse: true })
db.users.createIndex({ "b2b_profile.gst_number": 1 }, { unique: true, sparse: true })

// Products Collection
db.products.createIndex({ "slug": 1 }, { unique: true })
db.products.createIndex({ "sku": 1 }, { unique: true })
db.products.createIndex({ "vendor_id": 1, "status": 1 })
db.products.createIndex({ "category_id": 1, "visibility.b2c_visible": 1 })
db.products.createIndex({ "visibility.b2b_visible": 1, "status": 1 })
db.products.createIndex({ "visibility.is_vendor_product": 1 })
db.products.createIndex({ "approval.status": 1, "vendor_id": 1 })

// Orders Collection
db.orders.createIndex({ "user_id": 1, "status": 1 })
db.orders.createIndex({ "order_number": 1 }, { unique: true })
db.orders.createIndex({ "items.vendor_id": 1 })
db.orders.createIndex({ "payment.status": 1 })
db.orders.createIndex({ "created_at": -1 })

// Transactions Collection
db.transactions.createIndex({ "order_id": 1 })
db.transactions.createIndex({ "user_id": 1, "type": 1 })
db.transactions.createIndex({ "vendor_id": 1 })
db.transactions.createIndex({ "status": 1, "created_at": -1 })

// Vendor Payouts Collection
db.vendor_payouts.createIndex({ "vendor_id": 1, "status": 1 })
db.vendor_payouts.createIndex({ "payout_number": 1 }, { unique: true })
db.vendor_payouts.createIndex({ "status": 1, "created_at": -1 })

// Commission Logs Collection
db.commission_logs.createIndex({ "vendor_id": 1, "status": 1 })
db.commission_logs.createIndex({ "order_id": 1 })
db.commission_logs.createIndex({ "settled_at": 1 })

// Audit Logs Collection
db.audit_logs.createIndex({ "user_id": 1, "timestamp": -1 })
db.audit_logs.createIndex({ "entity_type": 1, "entity_id": 1 })
db.audit_logs.createIndex({ "timestamp": -1 })
```

### 9.3 Query Optimization

```python
# Optimized Queries

# ❌ BAD: Loading all fields
async def get_products_bad():
    products = await products_col.find({}).to_list(100)
    return products

# ✅ GOOD: Projection + Pagination
async def get_products_good(page=1, limit=20, user_role="B2C_CUSTOMER"):
    skip = (page - 1) * limit
    
    # Build query based on role
    query = {
        "status": "ACTIVE",
        "visibility.b2c_visible": True if user_role == "B2C_CUSTOMER" else None,
        "visibility.b2b_visible": True if user_role == "B2B_BUYER" else None
    }
    
    # Remove None values
    query = {k: v for k, v in query.items() if v is not None}
    
    # Projection (only needed fields)
    projection = {
        "id": 1,
        "name": 1,
        "slug": 1,
        "images": {"$slice": 1},  # Only first image
        "b2c_price" if user_role == "B2C_CUSTOMER" else "b2b_price": 1,
        "inventory.in_stock": 1,
        "ratings.average": 1
    }
    
    # Execute with index hint
    products = await products_col.find(
        query,
        projection
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Count total (cached)
    total = await get_cached_count("products", query)
    
    return {
        "products": products,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": math.ceil(total / limit)
        }
    }

# Aggregation Pipeline (Vendor Analytics)
async def get_vendor_analytics(vendor_id):
    pipeline = [
        # Match vendor orders
        {
            "$match": {
                "items.vendor_id": vendor_id,
                "status": "DELIVERED"
            }
        },
        # Unwind items
        {
            "$unwind": "$items"
        },
        # Filter vendor items only
        {
            "$match": {
                "items.vendor_id": vendor_id
            }
        },
        # Group and calculate
        {
            "$group": {
                "_id": None,
                "total_orders": {"$sum": 1},
                "total_revenue": {"$sum": "$items.total"},
                "total_commission": {"$sum": "$items.commission_amount"},
                "total_settlement": {"$sum": "$items.vendor_settlement"}
            }
        }
    ]
    
    result = await orders_col.aggregate(pipeline).to_list(1)
    return result[0] if result else {}
```

### 9.4 Background Jobs (Celery)

```python
# Celery Tasks

# Task 1: Send Email Notifications
@celery_app.task
def send_email_notification(user_id, notification_type, context):
    user = get_user(user_id)
    template = get_email_template(notification_type)
    send_email(user.email, template, context)

# Task 2: Generate Invoice PDF
@celery_app.task
def generate_invoice_pdf(order_id):
    order = get_order(order_id)
    pdf_bytes = create_invoice_pdf(order)
    upload_to_cloudinary(pdf_bytes, f"invoices/{order_id}.pdf")
    update_order(order_id, {"invoice.generated": True})

# Task 3: Process Vendor Payout
@celery_app.task
def process_vendor_payout(payout_id):
    payout = get_payout(payout_id)
    
    # Initiate bank transfer
    result = initiate_bank_transfer(
        account_number=payout.bank_details.account_number,
        ifsc=payout.bank_details.ifsc_code,
        amount=payout.payout_amount,
        purpose="Vendor Settlement"
    )
    
    # Update payout status
    update_payout(payout_id, {
        "status": "COMPLETED" if result.success else "FAILED",
        "utr_number": result.utr,
        "transfer_date": datetime.now()
    })
    
    # Notify vendor
    send_email_notification.delay(
        payout.vendor_id,
        "PAYOUT_COMPLETED",
        {"amount": payout.payout_amount, "utr": result.utr}
    )

# Task 4: Sync Inventory
@celery_app.task
def sync_inventory():
    # Sync with warehouse management system
    # Update product stock levels
    pass

# Task 5: Generate Analytics Report
@celery_app.task
def generate_daily_analytics_report():
    # Calculate daily metrics
    # Store in analytics collection
    # Send report to admin
    pass

# Celery Beat Schedule (Periodic Tasks)
CELERY_BEAT_SCHEDULE = {
    "sync-inventory-hourly": {
        "task": "sync_inventory",
        "schedule": crontab(minute=0, hour="*")  # Every hour
    },
    "generate-daily-report": {
        "task": "generate_daily_analytics_report",
        "schedule": crontab(hour=0, minute=0)  # Daily at midnight
    },
    "cleanup-expired-tokens": {
        "task": "cleanup_expired_refresh_tokens",
        "schedule": crontab(hour=2, minute=0)  # Daily at 2 AM
    }
}
```

---

## 10. DEPLOYMENT ARCHITECTURE

### 10.1 Production Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Production Architecture                    │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  [CloudFlare CDN]                                             │
│         │                                                     │
│         ▼                                                     │
│  [Load Balancer (Nginx)]                                      │
│         │                                                     │
│         ├───────────────┬───────────────┐                     │
│         ▼               ▼               ▼                     │
│  [Frontend]      [Frontend]      [Frontend]                   │
│  Container 1     Container 2     Container 3                  │
│  (React App)     (React App)     (React App)                  │
│         │               │               │                     │
│         └───────────────┴───────────────┘                     │
│                     │                                         │
│                     ▼                                         │
│              [API Gateway]                                    │
│                     │                                         │
│         ├───────────────┬───────────────┐                     │
│         ▼               ▼               ▼                     │
│  [Backend]       [Backend]       [Backend]                    │
│  Container 1     Container 2     Container 3                  │
│  (FastAPI)       (FastAPI)       (FastAPI)                    │
│         │               │               │                     │
│         └───────────────┴───────────────┘                     │
│                     │                                         │
│         ├───────────────┬───────────────┐                     │
│         ▼               ▼               ▼                     │
│  [MongoDB Atlas]  [Redis Cluster]  [Celery Workers]           │
│  (Primary DB)     (Cache/Session) (Background Jobs)           │
│                         │                                     │
│                         ▼                                     │
│              [External Services]                              │
│              ├─ Razorpay (Payments)                           │
│              ├─ Cloudinary (Media)                            │
│              ├─ SendGrid (Email)                              │
│              └─ AWS S3 (Backups)                              │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

### 10.2 Environment Configuration

```yaml
# Production Environment Variables

# Application
NODE_ENV=production
API_VERSION=v1
PORT=8000

# Database
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/drmediscie
MONGO_MAX_POOL_SIZE=50
MONGO_MIN_POOL_SIZE=10

# Redis
REDIS_URL=redis://redis-cluster:6379/0
REDIS_PASSWORD=secure_password
REDIS_MAX_CONNECTIONS=50

# JWT
JWT_SECRET=your_super_secret_key_min_32_chars
JWT_ALGORITHM=RS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30

# Razorpay (ADMIN Account)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_key
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email
SENDGRID_API_KEY=your_sendgrid_key
FROM_EMAIL=noreply@drmediscie.com

# Celery
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/2

# Security
CORS_ORIGINS=["https://drmediscie.com", "https://www.drmediscie.com"]
RATE_LIMIT_PER_MINUTE=100
SESSION_SECRET=your_session_secret

# Monitoring
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
LOG_LEVEL=INFO

# File Upload
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=["image/jpeg", "image/png", "application/pdf"]
```

---

## 11. MIGRATION PLAN

### 11.1 Phase-by-Phase Migration

```
Phase 1: User Management & RBAC (Week 1-2)
├─ Database Schema Updates
│  ├─ Add B2B profile fields to users collection
│  ├─ Add vendor profile fields to users collection
│  ├─ Create indexes
│  └─ Migrate existing users (set role = B2C_CUSTOMER)
│
├─ Backend Implementation
│  ├─ Update user model with new fields
│  ├─ Implement B2B registration endpoint
│  ├─ Implement vendor registration endpoint
│  ├─ Implement RBAC middleware
│  ├─ Implement approval workflows
│  └─ Update JWT token with role/status
│
├─ Frontend Implementation
│  ├─ Create B2B registration form
│  ├─ Create vendor registration form
│  ├─ Update login to handle different roles
│  ├─ Create approval status check
│  └─ Add role-based redirects
│
└─ Testing
   ├─ Test B2B registration flow
   ├─ Test vendor registration flow
   ├─ Test admin approval workflow
   └─ Test access control

Phase 2: Product System & Dual Pricing (Week 3-4)
├─ Database Schema Updates
│  ├─ Add b2b_price to products collection
│  ├─ Add visibility controls
│  ├─ Add vendor_id field
│  ├─ Add approval fields
│  └─ Create new indexes
│
├─ Backend Implementation
│  ├─ Update product model with dual pricing
│  ├─ Implement role-based product filtering
│  ├─ Implement vendor product endpoints
│  ├─ Implement product approval workflow
│  └─ Update product APIs with visibility logic
│
├─ Frontend Implementation
│  ├─ Update product cards (show correct pricing)
│  ├─ Create vendor product management UI
│  ├─ Update product detail page (B2C vs B2B view)
│  ├─ Add MOQ validation
│  └─ Add tier pricing display
│
└─ Testing
   ├─ Test B2C product visibility
   ├─ Test B2B product visibility
   ├─ Test vendor product CRUD
   └─ Test pricing isolation

Phase 3: Order System & Multi-vendor (Week 5-6)
├─ Database Schema Updates
│  ├─ Update orders collection schema
│  ├─ Add vendor_splits to orders
│  ├─ Add commission tracking
│  └─ Create order indexes
│
├─ Backend Implementation
│  ├─ Update order creation logic
│  ├─ Implement order splitting by vendor
│  ├─ Implement commission calculation
│  ├─ Add B2B order validation (MOQ, etc.)
│  └─ Create vendor order endpoints
│
├─ Frontend Implementation
│  ├─ Update checkout for B2B orders
│  ├─ Create vendor order management UI
│  ├─ Update order confirmation emails
│  └─ Add GST invoice generation
│
└─ Testing
   ├─ Test B2C order flow
   ├─ Test B2B order flow
   ├─ Test multi-vendor orders
   └─ Test commission calculation

Phase 4: Financial System (Week 7-8)
├─ Database Schema Updates
│  ├─ Create transactions collection
│  ├─ Create vendor_payouts collection
│  ├─ Create commission_logs collection
│  └─ Create financial indexes
│
├─ Backend Implementation
│  ├─ Implement transaction logging
│  ├─ Implement commission tracking
│  ├─ Implement vendor payout creation
│  ├─ Implement payout processing
│  └─ Add financial reports
│
├─ Frontend Implementation
│  ├─ Create vendor payout dashboard
│  ├─ Create admin financial dashboard
│  ├─ Add payout request/approval UI
│  └─ Add transaction history views
│
└─ Testing
   ├─ Test payment flow
   ├─ Test commission calculation
   ├─ Test payout creation
   └─ Test payout processing

Phase 5: Admin Control Panel (Week 9-10)
├─ Backend Implementation
│  ├─ Create admin analytics endpoints
│  ├─ Implement bulk approval actions
│  ├─ Add export functionality (CSV/Excel)
│  └─ Create admin reporting endpoints
│
├─ Frontend Implementation
│  ├─ Create admin dashboard
│  ├─ Create B2B approval management UI
│  ├─ Create vendor approval management UI
│  ├─ Create product approval management UI
│  ├─ Create financial reports UI
│  ├─ Create analytics dashboards
│  └─ Add notification center
│
└─ Testing
   ├─ Test all admin workflows
   ├─ Test analytics accuracy
   ├─ Test report generation
   └─ End-to-end system testing
```

---

## 12. SUCCESS METRICS

```
Key Performance Indicators (KPIs):

1. User Metrics:
   - B2B registrations per month
   - B2B approval rate
   - Vendor onboarding rate
   - User retention rate

2. Order Metrics:
   - B2C orders vs B2B orders
   - Average order value (B2C vs B2B)
   - Order fulfillment time
   - Return/refund rate

3. Financial Metrics:
   - Total revenue (B2C + B2B)
   - Platform commission collected
   - Vendor payout accuracy
   - Payment success rate

4. System Performance:
   - API response time (< 200ms)
   - System uptime (99.9%)
   - Database query performance
   - Cache hit rate

5. Security Metrics:
   - Failed login attempts
   - Security incident count
   - Compliance audit results
```

---

## 13. CONCLUSION

This architecture provides a **production-ready, scalable, enterprise-grade unified commerce platform** with:

✅ Strict B2B access control
✅ Controlled vendor marketplace
✅ Dual pricing system (B2C vs B2B)
✅ Centralized admin financial control
✅ Comprehensive RBAC
✅ Financial ledger & commission tracking
✅ Vendor payout management
✅ Security-first approach
✅ Performance optimization
✅ Scalability for 10K+ users

**Next Steps:**
1. Review and approve this architecture
2. Begin Phase 1 implementation
3. Iterative development with testing
4. Deploy phase-by-phase to production

---

**Document Version:** 1.0  
**Last Updated:** {{ current_date }}  
**Prepared by:** Enterprise Architecture Team  
**Status:** Ready for Implementation
