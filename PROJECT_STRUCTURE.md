# Dinebird — Project Structure

Monorepo layout: **Next.js (frontend)** + **Django (backend API)**. Paths are relative to the repository root (`restaurant/`).

```
restaurant/
├── frontend/                 # Next.js application
├── backend/                  # Django project + apps
├── PROJECT_STRUCTURE.md      # This file
└── README.md                 # (optional) setup & run instructions
```

---

## 1. Frontend — Next.js (App Router)

Recommended: **TypeScript**, **React 18+**, **Next.js 14+** (App Router).

```
frontend/
├── public/
│   ├── favicon.ico
│   ├── icons/
│   └── images/
├── src/
│   ├── app/                          # App Router (routes)
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Marketing / landing (optional)
│   │   ├── globals.css
│   │   ├── error.tsx
│   │   ├── not-found.tsx
│   │   │
│   │   ├── (marketing)/              # Public marketing pages (optional group)
│   │   │   ├── layout.tsx
│   │   │   ├── pricing/page.tsx
│   │   │   └── contact/page.tsx
│   │   │
│   │   ├── (auth)/                   # Login, register, forgot password
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── guest/                # Guest checkout continuation (optional)
│   │   │
│   │   ├── (customer)/               # Logged-in customer area
│   │   │   ├── layout.tsx
│   │   │   ├── account/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── orders/page.tsx
│   │   │   │   └── profile/page.tsx
│   │   │   └── ...
│   │   │
│   │   ├── o/[orgSlug]/              # Org-scoped public URLs (optional)
│   │   │   └── ...
│   │   │
│   │   ├── l/[locationId]/           # Location context (takeaway/delivery)
│   │   │   ├── menu/page.tsx
│   │   │   ├── checkout/page.tsx
│   │   │   └── order/[orderId]/page.tsx
│   │   │
│   │   ├── session/                  # QR table session (deep link)
│   │   │   └── [token]/
│   │   │       ├── page.tsx          # Menu + cart + requests
│   │   │       ├── checkout/page.tsx
│   │   │       └── payment/page.tsx
│   │   │
│   │   ├── dashboard/                # Staff / admin shell
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # Role-based redirect or overview
│   │   │   ├── floor/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── tables/page.tsx
│   │   │   │   └── sessions/[sessionId]/page.tsx
│   │   │   ├── kitchen/
│   │   │   │   └── page.tsx
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [orderId]/page.tsx
│   │   │   ├── staff/
│   │   │   │   ├── page.tsx
│   │   │   │   └── shifts/page.tsx
│   │   │   ├── menus/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [menuId]/page.tsx
│   │   │   │   └── assignments/page.tsx   # Which locations use which menu
│   │   │   ├── locations/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [locationId]/
│   │   │   │       ├── page.tsx
│   │   │   │       ├── settings/page.tsx  # Tax, tip, service charge UI
│   │   │   │       └── tables/page.tsx
│   │   │   ├── reports/page.tsx
│   │   │   └── settings/
│   │   │       └── organization/page.tsx
│   │   │
│   │   └── platform/                 # Platform (super) admin only
│   │       ├── layout.tsx
│   │       ├── page.tsx
│   │       ├── organizations/page.tsx
│   │       ├── organizations/[id]/page.tsx
│   │       ├── users/page.tsx
│   │       └── audit/page.tsx
│   │
│   ├── components/
│   │   ├── ui/                       # Primitives: Button, Input, Modal, etc.
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   ├── customer/
│   │   │   ├── MenuGrid.tsx
│   │   │   ├── CartDrawer.tsx
│   │   │   ├── CheckoutSummary.tsx
│   │   │   └── ServiceRequests.tsx   # Waiter, bill, etc.
│   │   ├── staff/
│   │   │   ├── TableMap.tsx
│   │   │   ├── OrderCard.tsx
│   │   │   ├── SessionDetail.tsx
│   │   │   └── PaymentSplit.tsx
│   │   └── forms/
│   │
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts             # Axios/fetch + base URL, interceptors
│   │   │   ├── auth.ts
│   │   │   ├── sessions.ts
│   │   │   ├── orders.ts
│   │   │   ├── payments.ts
│   │   │   └── types.ts              # Or colocate types per domain
│   │   ├── auth/
│   │   │   └── session.ts            # NextAuth or custom JWT in cookie
│   │   ├── money.ts                  # Minor units, formatting
│   │   └── utils.ts
│   │
│   ├── hooks/
│   │   useMediaQuery.ts
│   │   useCart.ts
│   │   useTableSession.ts
│   │   ...
│   │
│   ├── store/                        # Optional: Zustand / Redux if needed
│   │   └── cartStore.ts
│   │
│   ├── styles/
│   │   └── variables.css
│   │
│   └── types/
│       ├── api.ts
│       ├── domain.ts
│       └── index.ts
│
├── .env.local.example
├── next.config.js
├── tsconfig.json
├── package.json
└── eslint.config.mjs                 # or .eslintrc
```

### Frontend notes

- **Route groups** `(marketing)`, `(auth)`, `(customer)` share layouts without affecting the URL.
- **QR flow** lives under `session/[token]`; token maps server-side to `DiningSession`.
- **Staff vs platform**: `dashboard/*` for org staff; `platform/*` for your SaaS admins (guard with role from API).
- Adjust `o/[orgSlug]` if you prefer subdomain-based tenancy later (`middleware.ts`).

---

## 2. Backend — Django

Recommended: **Django 5.x**, **Django REST Framework**, **SimpleJWT** (or session auth for admin), **PostgreSQL** in production.

```
backend/
├── manage.py
├── requirements.txt
├── .env.example
├── pytest.ini                        # Optional
│
├── config/                           # Project settings package (rename if you prefer project name)
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── development.py
│   │   └── production.py
│   ├── urls.py
│   ├── wsgi.py
│   ├── asgi.py                       # Channels later if using WebSockets
│   └── celery.py                     # Optional: async tasks
│
├── apps/
│   ├── __init__.py
│   │
│   ├── core/                         # Shared utilities
│   │   ├── __init__.py
│   │   ├── models.py                 # Abstract base models (TimeStamped, UUID)
│   │   ├── permissions.py            # Base DRF permission classes
│   │   ├── pagination.py
│   │   ├── exceptions.py
│   │   └── management/
│   │
│   ├── accounts/                     # Users, auth, roles
│   │   ├── __init__.py
│   │   ├── models.py                 # User, CustomerProfile (if separate)
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── admin.py
│   │   ├── services/
│   │   │   └── auth_service.py
│   │   └── migrations/
│   │
│   ├── platform_admin/               # Super-admin only operations
│   │   ├── __init__.py
│   │   ├── models.py                 # Optional: FeatureFlag, AuditLog
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── permissions.py
│   │   └── migrations/
│   │
│   ├── organizations/                # Franchise / brand (one per tenant)
│   │   ├── __init__.py
│   │   ├── models.py                 # Organization, OrganizationSettings
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── admin.py
│   │   └── migrations/
│   │
│   ├── locations/                    # Venues + floor + tables + billing policy
│   │   ├── __init__.py
│   │   ├── models.py                 # Location, Table, TaxRate, TipPolicy, ServiceChargePolicy
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── admin.py
│   │   └── migrations/
│   │
│   ├── staff/                        # Staff memberships & shifts
│   │   ├── __init__.py
│   │   ├── models.py                 # StaffMembership, Shift, Role
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── admin.py
│   │   └── migrations/
│   │
│   ├── menus/                        # Menus, items, modifiers, location assignment
│   │   ├── __init__.py
│   │   ├── models.py                 # Menu, MenuLocation, Category, Item, Modifier
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── admin.py
│   │   └── migrations/
│   │
│   ├── sessions_app/                 # DiningSession + QR token (name avoids django.contrib.sessions clash)
│   │   ├── __init__.py
│   │   ├── models.py                 # DiningSession, QrToken (or embedded)
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── services/
│   │   │   └── session_service.py
│   │   └── migrations/
│   │
│   ├── orders/                       # Orders, lines, requests (waiter, bill)
│   │   ├── __init__.py
│   │   ├── models.py                 # Order, OrderLine, CustomerRequest
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── services/
│   │   │   ├── order_service.py
│   │   │   └── pricing_service.py    # Tax, service charge, snapshots
│   │   ├── admin.py
│   │   └── migrations/
│   │
│   ├── payments/                     # Payment, allocation, gateway webhooks
│   │   ├── __init__.py
│   │   ├── models.py                 # Payment, PaymentAllocation, Refund
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── webhooks.py
│   │   ├── services/
│   │   │   ├── payment_service.py
│   │   │   └── split_service.py
│   │   ├── admin.py
│   │   └── migrations/
│   │
│   └── notifications/                # Optional: email/SMS/push
│       ├── __init__.py
│       ├── models.py
│       ├── tasks.py
│       └── migrations/
│
├── tests/
│   ├── conftest.py
│   ├── test_orders/
│   ├── test_payments/
│   └── test_permissions/
│
└── staticfiles/                      # collectstatic output (prod)
```

### Django API URL layout (conceptual)

Mount under `/api/v1/` (example):

| Prefix | App |
|--------|-----|
| `/api/v1/auth/` | `accounts` |
| `/api/v1/platform/` | `platform_admin` |
| `/api/v1/organizations/` | `organizations` |
| `/api/v1/locations/` | `locations` |
| `/api/v1/staff/` | `staff` |
| `/api/v1/menus/` | `menus` |
| `/api/v1/sessions/` | `sessions_app` |
| `/api/v1/orders/` | `orders` |
| `/api/v1/payments/` | `payments` |

### Backend notes

- **`sessions_app`** name avoids collision with Django’s built-in `sessions` framework.
- **Policies** (tip, service charge) can live on `Location` or related `LocationBillingPolicy` models in `locations` or `organizations`.
- **Payment allocations** and **order line snapshots** belong in `payments` / `orders` as discussed in your product spec.
- Add **`django-auditlog`** or a custom `AuditEvent` model under `platform_admin` or `core` for sensitive actions.

---

## 3. Optional additions

| Concern | Suggestion |
|--------|------------|
| Real-time (kitchen, waiter alerts) | `channels` app + Redis; ASGI in `config/asgi.py` |
| Background jobs | Celery + Redis/RabbitMQ |
| File uploads (menu images) | `django-storages` + S3-compatible bucket |
| API docs | `drf-spectacular` (OpenAPI) |
| Dev DB | Docker Compose: Postgres + Redis |

---

## 4. Creating the folders (when you scaffold)

This document only describes structure. To generate **Next.js** and **Django** projects, use their official CLIs in `frontend/` and `backend/` respectively, then align created files with the trees above.

---

*Generated for Dinebird (multi-location franchise, global customer profile, QR sessions, flexible menus, payments & splits).*
