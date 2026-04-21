# Restaurant platform — roadmap & backlog

This file tracks **what exists today**, **what to build next**, and **known gaps**. Update it as you ship.

---

## Done (initial scaffold)

### Backend (Django + DRF + Channels)

- [x] Project layout: `config/settings` (base / development / production), ASGI + **Daphne**, SQLite dev DB.
- [x] **Custom user** (`email` login), `CustomerProfile`, **`is_platform_admin`** flag.
- [x] **Multi-tenant core**: `Organization`, `Location`, `Table`; tip/service charge/tax fields on `Location`.
- [x] **Staff**: `StaffAssignment` (user + org + location + role), `Shift`.
- [x] **Menus**: `Menu`, `MenuLocation` (one active menu per location enforced in `clean()`), `Category`, `MenuItem`, `MenuItemModifier`.
- [x] **Dining sessions**: QR `token`, open/close, partial unique constraint (one open session per table).
- [x] **Orders**: `Order`, `OrderLine` (snapshots), `CustomerRequest`; customer create via session token; staff list/update status & tip.
- [x] **Payments**: `Payment`, `PaymentAllocation`; **stub create** endpoint (no real PSP).
- [x] **Platform**: `AuditLog` model + read-only API for platform admins.
- [x] **Notifications**: in-app `Notification` model + list + mark-read.
- [x] **WebSockets**: `ws/location/<uuid>/` with **JWT in `?token=`**; broadcasts on order / customer request changes (signals).
- [x] **API docs**: Swagger UI at `/api/docs/`, schema at `/api/schema/`.
- [x] **CORS** open in development; **Redis** channel layer optional via `REDIS_URL`.

### Frontend (Next.js App Router)

- [x] TypeScript, minimal global CSS, **no visual design** — `Stub` placeholder pages for all major routes from `PROJECT_STRUCTURE.md`.
- [x] Stub components (`layout`, `customer`, `staff`, `ui`, `forms`), hooks, `cartStore`, types, `apiUrl()` helper.

---

## Next (recommended order)

### Product & API hardening

1. **Authentication UX**: httpOnly cookies vs localStorage for JWT; refresh rotation handling on frontend.
2. **Role matrix**: org admin vs location manager vs waiter/kitchen — tighten `StaffAssignment` permissions (today some mutations are platform-admin-only).
3. **Session close rules**: enforce “fully paid” (or manager override) before `close` when you define payment state machine.
4. **Takeaway / delivery orders**: public or authenticated APIs (no `DiningSession`), address model, mandatory payment at submit.
5. **Payment gateway**: replace `payments/stub-create/` with real provider; webhooks; idempotency; refunds.
6. **Menu duplication**: “copy menu” for forking shared → location-specific menus.
7. **Modifiers on order lines**: structured payload + validation against `MenuItemModifier`.
8. **Real-time**: optional **customer** WS channel per session; kitchen display filters.
9. **Audit**: write `AuditLog` rows from sensitive actions (not only model).
10. **Email/SMS**: receipts, marketing opt-in from `CustomerProfile`.

### Frontend (step-by-step UI)

1. Design system: tokens in `src/styles/variables.css`, `ui/` primitives, layout shells for `dashboard` vs `platform` vs public.
2. Auth pages: login/register + token storage + `me` hydration.
3. Staff dashboard: floor (tables + open sessions), kitchen board (order status), order detail.
4. Customer: table session flow (`/session/[token]`), menu from `menus/public/:locationId/`, cart, requests, checkout.
5. Platform admin: organizations, users, audit viewer.
6. WebSocket client hook (`useLocationChannel`) using `NEXT_PUBLIC_WS_URL` + JWT.

### DevOps

1. `docker-compose` for Postgres + Redis + backend + frontend.
2. CI: `ruff`/`black`, `pytest`, `npm run build`.
3. Production: `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, static/media, HTTPS for cookies.

---

## Known limitations / tech debt

- **Stub payments** — amounts are recorded but no card processing.
- **Order totals** — service charge logic is simplified; tip presets from `Location` not yet exposed as a dedicated breakdown endpoint.
- **Staff assignment CRUD** — restricted; org admins may need self-service invites.
- **Customer request PATCH** — staff updates status via `customer-requests` ViewSet; no push notification pipeline yet.
- **SQLite** — partial unique constraints require recent SQLite; use Postgres for production.
- **Frontend** — routes are placeholders only; no data fetching or WebSocket client yet.

---

## How to run locally

**Backend** (from `backend/`):

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

- API: `http://127.0.0.1:8000/api/v1/`
- Admin: `http://127.0.0.1:8000/admin/`
- WS: `ws://127.0.0.1:8000/ws/location/<location-uuid>/?token=<jwt_access>`

**Frontend** (from `frontend/`):

```bash
npm install
npm run dev
```

---

*Last updated: project bootstrap.*
