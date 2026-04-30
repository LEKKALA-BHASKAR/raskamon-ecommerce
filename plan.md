# Sattva — Premium Indian Wellness & Lifestyle Store (Plan)

## 1) Objectives
- Deliver a production-ready e-commerce web app with premium UI (tokens/fonts), responsive UX, SEO basics, and PWA-ready shell.
- Prove and lock down the **core commerce flow** end-to-end: **browse → product → cart → checkout → Razorpay/COD → order created → invoice**.
- Ensure external integrations are stable: **Razorpay payments (order+verify+webhook)** and **Cloudinary media upload/display**.
- Provide admin panel for day-1 operations: products, categories, orders, coupons, banners, customers.
- Seed realistic catalog/content so the storefront looks complete on launch.

## 2) Implementation Steps

### Phase 1 — Core Flow POC (Isolation: payments + media) 
**Goal:** do not proceed until Razorpay + Cloudinary work reliably with our environment.

**User stories (POC)**
1. As a dev, I can upload an image to Cloudinary and receive a secure URL to display in UI.
2. As a customer, I can create a Razorpay order for a known amount.
3. As a customer, I can complete a Razorpay test payment and we can verify the signature server-side.
4. As a system, I can receive and validate Razorpay webhooks for payment events.
5. As a system, I can persist a minimal Order record and mark paymentStatus accordingly.

**Steps**
- Web search: Razorpay best practices (Orders API, signature verification, webhooks), FastAPI patterns, Cloudinary signed uploads.
- Create 2 standalone Python scripts:
  - `poc_cloudinary_upload.py`: upload local image → get `secure_url`.
  - `poc_razorpay_flow.py`: create order → simulate/verify signature payload → (optionally) webhook verifier.
- Implement minimal FastAPI POC endpoints:
  - `POST /api/v1/upload` (signed upload or server upload) + retrieval test.
  - `POST /api/v1/payments/create-order` and `POST /api/v1/payments/verify`.
  - `POST /api/v1/payments/webhook` with signature validation.
- Acceptance for Phase 1: repeatable success (10 consecutive runs) for create-order + verify; Cloudinary image visible via returned URL.

---

### Phase 2 — V1 App Development (MVP storefront + admin-lite, defer advanced auth) 
**Goal:** working storefront with core checkout, clean premium UI, seed data, and basic admin.

**User stories (V1)**
1. As a shopper, I can browse categories and product lists with filters/sort and quickly find items.
2. As a shopper, I can view a product page, select variant/qty, and add to cart.
3. As a shopper, I can checkout with COD or Razorpay and receive an order confirmation.
4. As a shopper, I can see my orders list and order details (timeline + totals).
5. As an admin, I can create/edit products with images uploaded to Cloudinary and manage stock.

**Backend (FastAPI + Motor, /api/v1)**
- Project structure (MVC-ish): `routers/ services/ models/ schemas/ core/ utils/`.
- Core models + indexes: User, Category, Product, Order, Coupon, Review, Banner.
- Public APIs:
  - Products: list/detail/search/featured/related
  - Categories: tree/by-slug
  - Cart: session-based cart (anonymous) + merge later
  - Checkout: address capture + shipping calc (MVP shipping zones)
  - Payments: Razorpay create/verify + COD flow
  - Orders: create/list/detail
- Admin APIs (guarded later; for V1 can use simple admin key header in env):
  - CRUD: products, categories, banners, coupons; order status update
- Seed pipeline: categories + 40–60 products + banners + reviews + coupons.

**Frontend (React 18 + Tailwind + Framer Motion)**
- Design system: Tailwind config tokens (Primary/Secondary/Tertiary/Neutral), typography (Noto Serif/Manrope), components.
- Pages (V1): Home, PLP, PDP, Cart drawer + Cart page, Checkout steps, Order success, Orders list/detail, Search.
- Admin (V1): dashboard summary, products CRUD, categories CRUD, orders list/detail.
- UX standards: skeleton loaders, toast, responsive nav + sticky header, wishlist button UI (can be local-only in V1).

**End-of-phase test**
- One full E2E run: seed → browse → add to cart → Razorpay payment → order created → webhook updates → order detail visible.

---

### Phase 3 — Add Auth + Account + Operational Features (production hardening)
**User stories (Auth/Account)**
1. As a user, I can sign up/login with email/password and stay logged in via refresh tokens.
2. As a user, I can reset my password via email OTP.
3. As a user, I can save multiple addresses and reuse them at checkout.
4. As a user, I can maintain a server-side wishlist across devices.
5. As an admin, I can manage customers and block/unblock accounts.

**Backend**
- Auth: JWT access (15m) + refresh (7d) via httpOnly cookies; password hashing; rate limits on auth endpoints.
- Email: SMTP/fastapi-mail for OTP + transactional emails (order confirmation).
- Migrate cart: anonymous → user cart merge on login.
- RBAC: roles (`customer`, `admin`, `staff`), route guards, AuditLog.

**Frontend**
- Auth screens: login/signup/verify-otp/forgot/reset.
- Account area: profile, addresses CRUD, wishlist, notifications, loyalty points.
- Admin: customer management, audit log viewer.

**End-of-phase test**
- E2E: signup → browse → checkout → view orders; admin updates status; user sees timeline update.

---

### Phase 4 — Premium Commerce Features + SEO/PWA + Reliability
**User stories (Premium)**
1. As a shopper, I can apply coupons and see accurate discount rules at cart/checkout.
2. As a shopper, I can write reviews with images and see rating breakdown.
3. As a shopper, I can use instant search suggestions and recent searches.
4. As an admin, I can manage banners, flash sales, and low-stock alerts.
5. As a store owner, I can view sales analytics and export reports.

**Backend**
- Coupons: validation, usage limits, expiry, min order, max uses.
- Reviews: moderation, verified purchase, helpful votes.
- Shipping zones + free-above logic; tax config (MVP).
- Invoices: PDF generation + download.
- Webhooks reliability: idempotency keys, event log table/collection.

**Frontend**
- Enhanced PLP: advanced filters, grid/list toggle, quick view modal.
- PDP: zoom gallery, pincode checker, share, related products.
- SEO: React Helmet Async, structured data, sitemap generation endpoint.
- PWA: manifest, service worker, offline shell.

**End-of-phase test**
- Regression suite on core flows + admin ops; verify Lighthouse basics (performance/SEO/accessibility).

---

## 3) Next Actions (Immediate)
1. Confirm/store placeholders: finalize “Sattva” copy tone + sample brands (or proceed with defaults).
2. Run Phase 1 web research + implement POC scripts for Razorpay + Cloudinary.
3. Validate POC success criteria (repeatable payment verify + webhook + image upload/display).
4. Once stable, start Phase 2 V1 build with seed data + premium UI tokens.

## 4) Success Criteria
- Core checkout succeeds for both **Razorpay** and **COD**, creating accurate Orders and updating payment status via verify/webhook.
- Cloudinary uploads are reliable; images render correctly across Home/PLP/PDP/Admin.
- Seeded storefront looks complete (categories, products, banners) and is fully responsive.
- Admin can manage products/orders without breaking storefront.
- No critical bugs in one full E2E run per phase; regression tests pass after each phase.
