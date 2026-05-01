# Dr MediScie — Unified Commerce Platform (Incremental Migration Plan)

## 1) Objectives
- Transform the existing **Dr MediScie** storefront into a **high-scale Unified Commerce Platform** combining:
  - **B2C** (retail customers)
  - **B2B** (approved business buyers only)
  - **Controlled multivendor marketplace** (restricted vendor model)
  - **Centralized Admin Finance Control** (all revenue collected by Admin; vendor settlements tracked/payouted by Admin)
- Enforce **non-negotiable business rules** at the API level (no UI-only enforcement):
  - **B2B gatekeeping**: B2B registration → `PENDING` → Admin approve/reject → only `APPROVED` can login + browse + order.
  - **Vendor restrictions**: vendors can manage only their products + view their analytics; no customer data, no payments, no withdrawals.
  - **Dual pricing isolation**: strict separation of **B2C retail pricing** vs **B2B wholesale pricing**; no leakage.
  - **Visibility rules**: vendor products visible **only** to approved B2B; admin products visible to both (configurable).
  - **Payments**: 100% payments to **Admin account** (Razorpay primary). Vendors are settled via internal payout system.
- Build production-grade foundations:
  - JWT Access + Refresh tokens, **RBAC guards**, rate limiting, audit logs
  - Pagination everywhere, optimized MongoDB indexes
  - Redis caching (product listing, sessions, rate limits)
  - Background jobs (Celery + Redis): invoices, emails/notifications, settlement computation

**Current status (high-level)**
- ✅ Existing Dr MediScie UI rebrand completed (logo, header, auth pages, admin sidebar).
- ✅ Frontend compiles and loads; routing stabilized; hero banner rendering fixed.
- ✅ Backend (FastAPI + MongoDB) running; seeding works.
- ✅ Mixed-content/HTTPS redirect issues resolved.
- ✅ Initial E2E run previously completed for B2C flows (storefront + admin) with high success.
- ✅ Enterprise architecture document created: `/app/ARCHITECTURE.md`.
- ⏳ Next: **Unified Commerce Phase 1 (User Management & RBAC)** implementation.

---

## 2) Implementation Steps

### Phase 0 — Architecture & Design Baseline (Enterprise)
**Goal:** lock the architecture, schemas, API contracts before deep changes.

**Status:** ✅ *Completed*

**Deliverables**
- ✅ Created `/app/ARCHITECTURE.md` including:
  - Role matrix, B2B gating workflow, vendor restrictions
  - Dual pricing model and visibility rules
  - Centralized finance model (transactions, commission logs, vendor payouts)
  - Mandatory collections and indexing strategy
  - Proposed API structure `/api/v1/*`
  - Redis/Celery scaling plan

**Acceptance**
- Architecture is approved and becomes source-of-truth for implementation phases.

---

### Phase 1 — User Management & RBAC (B2B Gatekeeping + Vendor Approval)
**Goal:** implement strict access control foundations for B2B and vendors with admin approvals.

**Status:** ⏳ *Not started (implementation)* — **Starting now**

**Core rules to enforce (must-pass)**
1. B2B users register with company details + documents; status defaults to `PENDING`.
2. Until `APPROVED`: **cannot login**, cannot browse products, cannot place orders.
3. Vendors must be `APPROVED` by admin.
4. RBAC enforced on every endpoint; audit logs recorded for admin actions.

**Backend (FastAPI + Motor)**
- Data model updates:
  - Extend `users` schema with:
    - `role` expanded: `B2C_CUSTOMER`, `B2B_BUYER`, `VENDOR`, `ADMIN`, `SUB_ADMIN`
    - `b2b_profile` with `approval_status`, GST/PAN, docs, approval metadata
    - `vendor_profile` with `approval_status`, commission rate, bank details (masked), vendor_id
  - Add new collections (Phase 1 minimal):
    - `audit_logs` (mandatory)
    - `notifications` (in-app + email-ready)
- Auth flows:
  - `POST /api/v1/auth/register` (B2C)
  - `POST /api/v1/auth/register-b2b` (B2B with docs)
  - `POST /api/v1/auth/register-vendor` (Vendor onboarding)
  - `POST /api/v1/auth/login` (universal) with **role gating**:
    - deny login for B2B `PENDING/REJECTED`
    - deny login for Vendor `PENDING/REJECTED`
  - Access + Refresh token lifecycle + revocation strategy
- RBAC middleware:
  - Role guard + permission guard
  - Resource-scoped access helpers (vendor can only access own resources)
- Admin approvals:
  - `GET /api/v1/admin/b2b-users?status=PENDING`
  - `POST /api/v1/admin/b2b-users/{id}/approve|reject`
  - `GET /api/v1/admin/vendors?status=PENDING`
  - `POST /api/v1/admin/vendors/{id}/approve|reject`
- Security hardening:
  - Rate limiting (Redis-backed)
  - Audit logs for approval actions + sensitive operations

**Frontend (React)**
- Add role-aware auth UX:
  - Separate registration options: B2C / B2B / Vendor
  - B2B registration form: company name, GST, PAN, upload docs
  - Vendor registration form: store/business info, upload docs
- Login UX:
  - Show clean error state for `B2B_NOT_APPROVED` and `VENDOR_NOT_APPROVED`
  - Role-based post-login redirect:
    - B2C → `/`
    - B2B → `/products` (B2B view)
    - Vendor → `/vendor/dashboard`
    - Admin → `/admin/dashboard`
- Admin UI:
  - Add pages/tables for approving B2B users and vendors
  - Audit log viewer (basic table + filters)

**End-of-phase test (must)**
- B2B register → attempt login → denied → admin approves → login succeeds → can browse B2B products.
- Vendor register → attempt login → denied → admin approves → vendor dashboard accessible.
- Verify audit log entries created for approve/reject actions.

---

### Phase 2 — Product System (Dual Pricing + Visibility + Vendor Products)
**Goal:** enforce dual pricing and visibility rules with vendor-controlled product CRUD.

**Status:** ⏳ Not started

**Core rules to enforce (must-pass)**
1. Every product has both `b2c_price` and `b2b_price` (isolated).
2. Vendor products:
   - ❌ not visible to B2C
   - ✅ visible only to **approved B2B**
3. Admin products visible to both (config flag).
4. API must strictly return only correct price fields based on role.

**Backend**
- Product schema migration:
  - Add `b2c_price`, `b2b_price`, `visibility`, `vendor_id`, `approval.status`.
- Role-based product projection:
  - B2C: hide `b2b_price` and hide vendor products
  - Approved B2B: hide `b2c_price`, show vendor products
  - Vendor: only own products
  - Admin: all
- Vendor product endpoints:
  - `GET/POST/PUT/DELETE /api/v1/vendor/products`
  - New vendor products default to `approval.status=PENDING` and `visibility.b2b_visible=false` until approved.
- Admin product approval endpoints:
  - approve/reject vendor products and control visibility
- Add Redis caching for product lists/detail with role-aware cache keys.

**Frontend**
- B2C and B2B product listing views:
  - B2C shows retail price UI
  - B2B shows wholesale price + MOQ + tier pricing (optional)
- Vendor product management UI:
  - create/edit/delete products
  - status badge: pending/approved/rejected

**End-of-phase test**
- Vendor adds product → pending (not visible) → admin approves → visible to approved B2B only.
- B2C never sees vendor products or wholesale prices.

---

### Phase 3 — Order System (Multi-vendor + Order Splitting + B2B Ordering)
**Goal:** implement multi-vendor orders with admin-controlled payment and vendor order visibility.

**Status:** ⏳ Not started

**Backend**
- Order schema migration:
  - order items include vendor attribution, price_type (B2C/B2B), commission fields
  - order splitting (`vendor_splits`) for settlement tracking
- B2B order rules:
  - MOQ enforcement
  - optional PO number and GST invoice details
- Vendor order endpoints (read-only + fulfillment status updates limited):
  - `GET /api/v1/vendor/orders`
  - `PUT /api/v1/vendor/orders/{id}/status` (restricted transitions)

**Frontend**
- B2B checkout:
  - billing details + GST
  - bulk ordering UX
- Vendor dashboard:
  - list vendor-specific orders
  - update status: processing/shipped

**End-of-phase test**
- Mixed cart containing admin + vendor products → order created → split by vendor → vendor sees only their portion.

---

### Phase 4 — Financial System (Admin Payments + Ledger + Commission + Vendor Payouts)
**Goal:** build centralized finance: transaction logging, commission, payout ledger, refund tracking.

**Status:** ⏳ Not started

**Backend**
- Collections:
  - `transactions`, `commission_logs`, `vendor_payouts`
- Razorpay:
  - all orders paid to admin Razorpay account
  - webhook + idempotency event log
- Commission computation:
  - per item, stored at order time
- Vendor settlement workflow:
  - create payout batch for date range
  - mark payout complete with UTR, date, amount, status
- Background jobs:
  - payout report generation
  - invoice PDFs

**Frontend**
- Admin finance dashboard:
  - transactions list
  - commissions
  - vendor payouts workflow (create, mark paid with UTR)
- Vendor finance view:
  - payout history (read-only)

**End-of-phase test**
- Place B2B order → transaction log created → commission log created → payout batch generated → mark paid with UTR.

---

### Phase 5 — Admin Super Control Panel (Approvals + Governance + Reports)
**Goal:** one place to control everything: approvals, visibility rules, commissions, disputes, refunds, reports.

**Status:** ⏳ Not started

**Backend**
- Admin endpoints for:
  - B2B approvals, vendor approvals, product approvals
  - pricing rules + visibility rules
  - refunds + disputes
  - reporting exports (CSV)
  - audit log search

**Frontend**
- Admin pages:
  - B2B approvals queue
  - vendor approvals queue
  - product approvals queue
  - finance center
  - audit log viewer
  - analytics dashboards

**End-of-phase test**
- All governance flows function; audit logs cover sensitive actions.

---

## 3) Next Actions (Immediate)
1. **Update `/app/plan.md` to Unified Commerce plan** (this document).
2. Begin **Phase 1 backend changes**:
   - extend users schema + add `b2b_profile` and `vendor_profile`
   - implement `/api/v1/auth/register-b2b` and `/api/v1/auth/register-vendor`
   - implement login gating for B2B/Vendor approvals
3. Add **admin approval APIs** + audit logs.
4. Add **frontend**: B2B registration page + vendor registration page + admin approval screens.
5. Run targeted E2E:
   - B2B pending → denied login → approved → access
   - vendor pending → denied login → approved → vendor dashboard access

---

## 4) Success Criteria
- **B2B strict gatekeeping**: pending/rejected B2B users have **zero access** (cannot login, cannot view products, cannot order).
- **Vendor restrictions enforced**: vendors can only manage own products and view own analytics; no payments and no customer data.
- **Dual pricing isolation**: B2C never receives wholesale fields; B2B never receives retail-only price fields.
- **Vendor product visibility**: vendor products visible only to approved B2B; never to B2C.
- **Centralized admin finance**: all payments go to admin; vendor payout system logs UTR/date/status.
- **RBAC, rate limiting, audit logs** present and enforced across protected APIs.
- Performance basics: pagination everywhere; indexes defined; Redis caching introduced for high-traffic endpoints.
