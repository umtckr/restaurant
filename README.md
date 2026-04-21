# Dinebird

Full-stack restaurant operations platform: **Django REST + Channels (WebSockets)** backend, **Next.js (App Router)** frontend.

- [Project structure](./PROJECT_STRUCTURE.md) — folder layout reference.
- [Roadmap & backlog](./ROADMAP.md) — what is implemented and what comes next.

## Quick start

See **How to run locally** in [ROADMAP.md](./ROADMAP.md).

## Environment

- **Backend**: copy `backend/.env.example` to `.env` and adjust (optional).
- **Frontend**: copy `frontend/.env.local.example` to `.env.local` and set `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL`.

## API highlights

| Area | Base path |
|------|-----------|
| Auth (JWT, register, me) | `/api/v1/auth/` |
| Organizations | `/api/v1/organizations/` |
| Locations & tables | `/api/v1/locations/`, `/api/v1/tables/` |
| Staff & shifts | `/api/v1/staff-assignments/`, `/api/v1/shifts/` |
| Menus (staff CRUD + public menu) | `/api/v1/menus/...`, `/api/v1/menus/public/<location_id>/` |
| Dining sessions | `/api/v1/dining-sessions/`, `/api/v1/dining-sessions/by-token/<uuid>/` |
| Orders | `/api/v1/orders/`, `/api/v1/orders/customer-create/` |
| Payments (stub) | `/api/v1/payments/stub-create/` |
| Platform audit | `/api/v1/platform/audit-logs/` |
| Notifications | `/api/v1/notifications/` |

WebSocket: `ws://<host>/ws/location/<location_uuid>/?token=<access_jwt>`
