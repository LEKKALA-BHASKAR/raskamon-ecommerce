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
- Build production-grade foundations incrementally:
  - JWT Access + Refresh tokens, **RBAC guards**, basic rate limiting, audit logs
  - Pagination everywhere, optimized MongoDB indexes
  - Future: Redis caching + background jobs (Celery/Redis) for invoices/emails/settlements

**Current status (high-level)**
- ✅ Existing Dr MediScie UI rebrand completed (logo, header, auth pages, admin sidebar).
- ✅ Frontend compiles and loads; routing stabilized; hero banner rendering fixed.
- ✅ Backend (FastAPI + MongoDB) running; seeding works.
- ✅ Mixed-content/HTTPS redirect issues resolved.
- ✅ Enterprise architecture document created: `/app/ARCHITECTURE.md`.
- ✅ Phase 1 backend foundation files created:
  - `/app/backend/routers/auth_v2.py` (B2C enhanced registration + B2B/vendor registration + gated universal login)
  - `/app/backend/routers/admin_users.py` (admin approval queues + approve/reject + commission + audit log view)
  - `/app/backend/middleware/rbac.py` (role gating + permission matrix + basic in-memory rate limiter)
  - `/app/backend/utils/audit.py` (audit logger)
  - `/app/backend/models/user.py` (target unified schema; not fully wired yet)
- ⏳ **P0 blocker:** new Phase 1 routers are **unmounted** in `/app/backend/server.py` → endpoints unreachable.
- ⚠️ **Critical compatibility risk (must address while integrating Phase 1):**
  - Legacy auth (`/api/auth/*`) uses Mongo `_id`, legacy roles (`customer/admin/manager/...`) and JWT `sub` semantics.
  - New Phase 1 (`auth_v2/admin_users`) expects `users.id` field and role values like `ADMIN`, `B2B_BUYER`, `VENDOR`.
  - `utils.security.get_current_user()` currently fetches users by Mongo `_id` using `sub` from token.
  - If we mount Phase 1 routers without a bridge, admin approvals and RBAC checks can break or be unusable.

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

**Status:** ⏳ *In progress* — **backend integration is next**

**Phase 1 defaults (confirmed)**
- GST/PAN validation: **lenient** for MVP (basic presence; strict regex can be Phase 1.1/Phase 2 hardening)
- Business document uploads: **defer to post-approval** (no Cloudinary dependency in Phase 1)
- Notifications: **in-app status only** (no email sending in Phase 1)
- Admin credentials: keep existing legacy admin for now: `admin@sattva.in / admin@1234`

**Core rules to enforce (must-pass)**
1. B2B users register with company details; status defaults to `PENDING`.
2. Until `APPROVED`: **cannot login** (hard deny in backend).
3. Vendors must be `APPROVED` by admin to login.
4. RBAC enforced on admin approval endpoints; audit logs recorded for admin actions.

#### Phase 1A — Backend integration (P0) — ✅ COMPLETED
**Goal:** make Phase 1 endpoints reachable and functional without breaking existing B2C.

**Result:** All Phase 1 backend endpoints live & functional. End-to-end smoke tested via curl:
- B2B register → `PENDING` → login blocked (`B2B_NOT_APPROVED`) → admin approves → login succeeds with `APPROVED` status ✅
- Vendor register → `PENDING` → login blocked (`VENDOR_NOT_APPROVED`) → admin approves → login succeeds with `vendor_id` + `store_name` ✅
- B2B rejection flow works (`REJECTED` status stored with reason) ✅
- Audit logs captured for all admin actions (APPROVE_B2B_USER, REJECT_B2B_USER, APPROVE_VENDOR, FAILED_LOGIN, USER_LOGIN, B2B_USER_REGISTERED, VENDOR_REGISTERED) ✅
- Legacy B2C auth (`/api/auth/*`) still works — no regression ✅
- Legacy admin (`admin@sattva.in`, role `'admin'`) can call new `/api/admin_users/*` endpoints via RBAC legacy-role bridge ✅

**Work items**
1. **Mount Phase 1 routers** in `/app/backend/server.py` (non-breaking):
   - `app.include_router(auth_v2.router, prefix="/api/auth_v2", tags=[...])`
   - `app.include_router(admin_users.router, prefix="/api/admin_users", tags=[...])`
2. **Initialize audit logger on startup**:
   - call `init_audit_logger(db)` from `utils.audit` using `database.db`
   - ensure audit logs write to `audit_logs` collection
3. **Bridge legacy auth ↔ Phase 1 RBAC identity mismatch (P0)**
   - Align `get_current_user()` and JWT payload usage so admin endpoints work.
   - Preferred incremental strategy (minimal disruption):
     - Update `utils.security.get_current_user()` to find users by either:
       - `_id == payload.sub` (legacy) OR
       - `id == payload.user_id` (Phase 1)
     - Ensure Phase 1 login (`/api/auth_v2/login`) issues tokens compatible with `get_current_user()`.
       - Option A (recommended): include `sub` equal to Mongo `_id` as well (requires storing `_id` consistently) OR
       - Option B: update `get_current_user()` to use `user_id` claim for Phase 1.
   - Ensure `require_role()` decorator receives the user properly (consistent kwarg naming `user` in routes).
4. **Role mapping strategy (incremental)**
   - Legacy roles are lower-case (`admin`, `manager`, `customer`). Phase 1 uses uppercase enums.
   - Implement a temporary mapping layer (Phase 1A):
     - treat legacy `admin` as `ADMIN`
     - treat legacy `customer` as `B2C_CUSTOMER`
   - Do not migrate all existing users immediately; only ensure admin approvals can be executed.
5. **Indexes** (minimal Phase 1):
   - add/create indexes for:
     - `users.id` (unique, sparse)
     - `users.b2b_profile.gst_number` (sparse)
     - `users.vendor_profile.gstin` (sparse)
     - `users.vendor_profile.store_slug` (sparse)

**Acceptance (backend)**
- `/api/auth_v2/register-b2b` creates user with role `B2B_BUYER` and `approval_status=PENDING`.
- `/api/auth_v2/register-vendor` creates user with role `VENDOR` and `approval_status=PENDING`.
- `/api/auth_v2/login` denies login for pending/rejected B2B & vendors.
- Admin approval endpoints are callable using existing admin login token.
- Audit logs are written for approve/reject actions.
- No regression in existing B2C flows (`/api/auth/login`, storefront browsing, etc.).

#### Phase 1B — Backend testing (P0)
**Testing method:** manual curl (targeted) / backend testing agent.

**Must-run test flows**
1. B2B register → login denied (`B2B_NOT_APPROVED`) → admin approves → login succeeds.
2. Vendor register → login denied (`VENDOR_NOT_APPROVED`) → admin approves → login succeeds.
3. Audit logs show records for approval actions.

#### Phase 1C — Frontend Phase 1 UI (P0)
**Goal:** enable B2B/vendor onboarding and admin approval operations via UI.

**Frontend work items**
1. Registration split UX:
   - B2C (existing)
   - B2B registration form (company + GST + PAN + address + contact)
   - Vendor registration form (business/store + GSTIN + PAN + bank fields + identity fields)
   - Document uploads deferred; show placeholder text “upload after approval”.
2. Admin approval UI:
   - Pending B2B users table with detail view + approve/reject
   - Pending vendors table + approve/reject
   - (Optional in Phase 1C) audit log viewer
3. Auth context upgrade (incremental):
   - support new roles returned by `/api/auth_v2/login`
   - display clean errors for pending/rejected
   - role-based redirect

**Acceptance (frontend)**
- B2B and vendor can register from UI.
- Admin can approve/reject from UI.
- Pending users see meaningful message on login.

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
1. **Phase 1A (P0):** update `/app/backend/server.py` to mount:
   - `/api/auth_v2` → `routers/auth_v2.py`
   - `/api/admin_users` → `routers/admin_users.py`
2. **Phase 1A (P0):** initialize audit logger on startup (`init_audit_logger(database.db)`).
3. **Phase 1A (P0):** implement the **legacy ↔ Phase 1 auth compatibility bridge** so admin approvals work with existing admin token.
4. **Phase 1B (P0):** run backend tests (curl/testing agent) for register → pending → approve → login.
5. **Phase 1C (P0):** start frontend onboarding forms and admin approval UI.

---

## 4) Success Criteria
- **B2B strict gatekeeping**: pending/rejected B2B users have **zero access** (cannot login, cannot view products, cannot order).
- **Vendor restrictions enforced**: vendors can only manage own products and view own analytics; no payments and no customer data.
- **Dual pricing isolation**: B2C never receives wholesale fields; B2B never receives retail-only price fields.
- **Vendor product visibility**: vendor products visible only to approved B2B; never to B2C.
- **Centralized admin finance**: all payments go to admin; vendor payout system logs UTR/date/status.
- **RBAC and audit logs** present and enforced across protected APIs.
- **Compatibility preserved during migration**: existing B2C login and storefront flows remain operational while Phase 1 ships.
- Performance basics: pagination everywhere; indexes defined; Redis caching introduced for high-traffic endpoints (Phase 2+).