# Sattva — Premium Indian Wellness & Lifestyle Store (Updated Plan)

## 1) Objectives
- Deliver a production-ready e-commerce web app with premium UI (tokens/fonts), responsive UX, SEO basics, and a PWA-ready shell.
- Lock down the **core commerce flow** end-to-end: **browse → product → cart → checkout → Razorpay/COD → order created → invoice**.
- Ensure external integrations are stable:
  - **Razorpay payments** (create order + verify signature + webhook/idempotency)
  - **Cloudinary media** (upload + transformations + safe delivery)
- Provide a full admin panel for day-1 operations: products, categories, orders, coupons, banners, customers.
- Seed realistic catalog/content so the storefront looks complete on launch.
- Ensure environment/proxy correctness (HTTPS) so the app works reliably in production-like hosted previews.

**Current status (high-level)**
- Backend: FastAPI + MongoDB running; seeded data present.
- Frontend: React app now routes correctly and compiles; homepage loads.
- Key integration blockers fixed: HTTPS mixed-content redirects, routing boilerplate, banner rendering logic.
- Next: comprehensive E2E testing + UI/UX polish and guideline conformance.

---

## 2) Implementation Steps

### Phase 1 — Core Flow POC (Isolation: payments + media)
**Goal:** do not proceed until Razorpay + Cloudinary work reliably with our environment.

**Status:** ✅ *POC scripts implemented*; ⚠️ *Razorpay credentials may still fail authentication depending on provided keys*.

**User stories (POC)**
1. As a dev, I can upload an image to Cloudinary and receive a secure URL to display in UI.
2. As a customer, I can create a Razorpay order for a known amount.
3. As a customer, I can complete a Razorpay test payment and we can verify the signature server-side.
4. As a system, I can receive and validate Razorpay webhooks for payment events.
5. As a system, I can persist a minimal Order record and mark paymentStatus accordingly.

**Steps**
- Web research: Razorpay best practices (Orders API, signature verification, webhooks), FastAPI patterns, Cloudinary signed uploads.
- Create standalone scripts (implemented under `/app/tests/poc_test.py`):
  - Cloudinary upload verification
  - Razorpay order create + signature verification
- Implement FastAPI endpoints:
  - `POST /api/upload/*` (Cloudinary)
  - `POST /api/payments/create-order`, `POST /api/payments/verify`, webhook endpoint
- Acceptance for Phase 1:
  - Repeatable success for create-order + verify
  - Cloudinary assets render via returned URL(s)

**Notes / known caveat**
- Razorpay test keys previously returned `BAD_REQUEST_ERROR` during POC; may require fresh test credentials for final E2E payment testing.

---

### Phase 2 — V1 App Development (MVP storefront + admin-lite)
**Goal:** working storefront with core checkout, clean premium UI, seed data, and basic admin.

**Status:** ✅ *Implementation largely complete*; ✅ *Frontend now compiles and loads*; ⚠️ *Full E2E testing pending*.

**User stories (V1)**
1. As a shopper, I can browse categories and product lists with filters/sort and quickly find items.
2. As a shopper, I can view a product page, select variant/qty, and add to cart.
3. As a shopper, I can checkout with COD or Razorpay and receive an order confirmation.
4. As a shopper, I can see my orders list and order details (timeline + totals).
5. As an admin, I can create/edit products with images uploaded to Cloudinary and manage stock.

**Backend (FastAPI + Motor, `/api/*`)**
- Core models + indexes: User, Category, Product, Order, Coupon, Review, Banner.
- Public APIs: products, categories, cart, checkout/orders, payments, blog, banners.
- Admin APIs: CRUD products/categories/coupons/banners; orders management.
- Seed pipeline: categories + products + banners + coupons + admin user.

**Important platform fixes applied (integration stability)**
- ✅ Fixed frontend router: removed boilerplate App.js, enabled full routing map for client + admin.
- ✅ Fixed FastAPI HTTPS redirect issue:
  - Set `redirect_slashes=False` to prevent 307 redirects causing HTTPS→HTTP mixed-content blocks.
- ✅ Updated router handlers to support both `/prefix` and `/prefix/` forms:
  - Added `@router.get('')` in key routers (categories/products/orders listing).
- ✅ Fixed Home Hero banner rendering bug:
  - Removed broken `loading` state that never updated when banners arrived.

**Frontend (React 18 + Tailwind + Framer Motion)**
- Design system + UI primitives (shadcn-style components) present under `src/components/ui/`.
- Pages implemented: Home, PLP, PDP, Search, Blog, Static pages, Checkout, Order Success, Account Dashboard.
- Admin pages implemented: dashboard, products CRUD, categories, coupons, banners, orders, customers, reviews, analytics, settings.

**End-of-phase test**
- Execute one full E2E run: seed → browse → add to cart → checkout → COD and Razorpay (if keys work) → order created → order visible in account → admin updates status.

---

### Phase 3 — Add Auth + Account + Operational Features (production hardening)
**Goal:** stabilize authentication/account flows and operational reliability.

**Status:** ✅ Implemented JWT auth (email/password), refresh handling in client; ⚠️ E2E validation pending.

**User stories (Auth/Account)**
1. As a user, I can sign up/login with email/password and stay logged in.
2. As a user, I can reset my password (if enabled in PRD; OTP/email may be staged).
3. As a user, I can save multiple addresses and reuse them at checkout.
4. As a user, I can maintain wishlist across devices (if enabled).
5. As an admin, I can manage customers and block/unblock accounts.

**Backend**
- JWT access + refresh; password hashing; RBAC (`customer`, `admin`).
- Rate limiting + audit logging (recommended for production readiness).

**Frontend**
- Auth screens: login/register/forgot password.
- Account area: dashboard + orders.

**End-of-phase test**
- E2E: register → login → add to cart → checkout → view orders; admin updates order status and user sees updates.

---

### Phase 4 — Premium Commerce Features + SEO/PWA + Reliability
**Goal:** premium polish and reliability: invoices, shipping tracking stubs, advanced filters, SEO/PWA.

**Status:** ⏳ Not started / partially stubbed.

**User stories (Premium)**
1. As a shopper, I can apply coupons and see accurate discount rules at cart/checkout.
2. As a shopper, I can write reviews with images and see rating breakdown.
3. As a shopper, I can use instant search suggestions and recent searches.
4. As an admin, I can manage banners, flash sales, and low-stock alerts.
5. As a store owner, I can view sales analytics and export reports.

**Backend**
- Coupons: validation, usage limits, expiry, min order, max uses.
- Reviews: moderation, verified purchase.
- Shipping: zones/free-above logic; tax config.
- Invoices: PDF generation + download endpoint.
- Payments: webhook reliability (idempotency keys, event log collection).

**Frontend**
- Enhanced PLP: advanced filters (price slider, rating filter, tag multi-select), grid/list toggle.
- PDP: gallery enhancements, pincode checker, share, related products.
- SEO: metadata + structured data + sitemap.
- PWA: manifest + offline shell.

**End-of-phase test**
- Regression suite on core flows + admin ops; verify Lighthouse basics (performance/SEO/accessibility).

---

## 3) Next Actions (Immediate)
1. **Run comprehensive E2E testing** (use `testing_agent_v3`) across:
   - Browse → PLP filters/sort
   - PDP → add to cart
   - Cart drawer updates
   - Checkout (COD)
   - Checkout (Razorpay if keys allow)
   - Order success + order history
   - Admin login + dashboard + orders/products CRUD sanity
2. Fix any bugs discovered by E2E testing (prioritize P0 blockers).
3. UI/UX validation against `/app/design_guidelines.md`:
   - dark mode toggle, typography, spacing, Framer Motion polish, responsiveness.
4. Address external asset delivery issues (optional but recommended):
   - Replace blocked third-party images (Unsplash/Wikimedia ORB) with Cloudinary-hosted assets for consistent rendering.
5. Implement remaining PRD deliverables:
   - PDF invoices
   - Shipping tracking stub integration on user account
   - Advanced filters performance + correctness

---

## 4) Success Criteria
- **Core checkout succeeds** for both **COD** and **Razorpay** (when valid test keys are provided), creating accurate Orders and updating payment status via verify/webhook.
- No HTTPS mixed-content issues; no redirect-related breakages (`/api/*` endpoints stable without trailing slashes).
- Cloudinary uploads are reliable; images render correctly across Home/PLP/PDP/Admin.
- Seeded storefront looks complete (categories, products, banners) and is fully responsive.
- Admin can manage products/orders without breaking storefront.
- No critical bugs in one full E2E run per phase; regression tests pass after each phase.
