# 🏡 EstateFlow — Estate Visitor & Access Management

EstateFlow is a full-stack platform for managing visitor access in gated residential estates. It replaces the paper logbook at the gate with a verified digital workflow: residents pre-approve or approve their visitors, security guards register walk-ins and control entry/exit with access codes, and administrators manage the whole estate from one dashboard.

Every visit follows a strict, auditable status flow — **nobody gets in without the resident's approval, and nobody's in without a trace**.

---

## ✨ Features

### 👤 Administrator
- Manage **residents** — houses, names, phone numbers, emails, with login accounts created automatically
- Manage **security personnel** — creating a guard also provisions their login; deleting one **revokes their access immediately**
- View and approve every pending visit, and reject visits that should not go ahead
- Full **activity logs** — every check-in, check-out, approval, rejection and user action is recorded
- **Reports** — visit traffic and estate activity metrics (including a live *currently inside* report)

### 🧑‍💼 Resident
- **Pre-register visitors** and schedule planned visits (`APPROVED` instantly — it's your own guest)
- **Approve or reject walk-in visits** that the guard registers for your household
- See every visitor attached to your household, with their visit history
- Manage your own profile

### 💂 Security (gate)
- **Register walk-in visitors** against a resident — the visit starts life as `PENDING`
- See exactly **which walk-ins are awaiting resident approval**, and enter the access code to check a visitor in once it's approved
- **Check in / check out** visitors using one-time access codes
- Live view of **visitors currently inside the estate**
- No approval power by design — the gate can never admit someone into a resident's home without the resident's consent

> **Authorization rule:** security personnel can create walk-ins, view visits, and check visitors in/out — they **cannot approve or reject** visits. Approve/reject belongs to the resident (for their own visit) or the administrator.

---

## 🔁 Visitor Lifecycle

```
                ┌──────────────┐
  Guard walk-in │   PENDING    │  ← created by guard (or needs resident decision)
     ─────────► └──────┬───────┘
                       │       resident approves ──► REJECTED (if refused)
                       ▼
                 ┌──────────────┐
                 │   APPROVED   │ ← resident (own visit) or admin
                 └──────┬───────┘
                        │  guard verifies access code
                        ▼
                 ┌──────────────┐
                 │  CHECKED_IN  │ ← visitor on the estate
                 └──────┬───────┘
                        │  guard checks out
                        ▼
                 ┌──────────────┐
                 │ CHECKED_OUT  │
                 └──────────────┘
```

| Action | Resident | Security | Admin |
|---|:---:|:---:|:---:|
| Create walk-in visit (for a resident) | — | ✅ | ✅ |
| Create planned visit (own visitor) | ✅ | — | — |
| Approve pending visit (own / any) | ✅ own | ❌ | ✅ any |
| Reject pending visit | ✅ own | ❌ | ✅ any |
| Check in / check out | — | ✅ | ✅ |
| Manage residents & guards | — | — | ✅ |

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Backend | **Java 17**, **Spring Boot** (Web, Data JPA, Security, Validation), Spring Context |
| Database | **PostgreSQL** (H2 available for quick trials), Hibernate `ddl-auto=update` |
| Auth | **JWT** (jjwt) bearer tokens, `BCrypt` password hashing, role-based access (`ROLE_ADMIN`, `ROLE_RESIDENT`, `ROLE_SECURITY`) |
| Configuration | [`spring-dotenv`](https://github.com/paulschwarz/spring-dotenv) — secrets via environment variables or a `.env` file |
| Frontend | **React 19**, **Vite**, **React Router 7**, **Axios**, lucide-react icons |
| Code quality | ESLint (react-hooks + react-refresh rules), Maven build |

### Project structure

```
Estate_Access_Control/
├── src/main/java/com/example/demo/      # Spring Boot backend
│   ├── controller/                      # REST controllers (auth, residents, visitors, visits, security…)
│   ├── service/                         # Business logic (auth, visits, security, reports…)
│   ├── repository/                      # Spring Data JPA repositories
│   ├── entity/                          # JPA entities: User, Resident, Visitor, Visit, Security, ActivityLog
│   ├── security/                        # JWT filter, security config (CORS, route rules)
│   ├── response/                        # Request/response DTOs
│   └── exception/                       # Global exception handling
├── src/main/resources/                  # application.properties
├── estateflow-frontend/                 # React app (Vite)
│   └── src/
│       ├── pages/                       # Dashboard, Residents, Visitors, Visits, Security, Reports, ActivityLogs, Resident pages
│       ├── context/                     # Auth context (session persisted in localStorage)
│       ├── components/                  # Protected routes
│       └── services/                    # Axios API client (token injection + 401 handling)
└── mvnw / mvnw.cmd                      # Maven wrapper
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version |
|---|---|
| JDK | 17+ |
| Maven | (use the bundled wrapper) |
| Node.js | 18+ |
| PostgreSQL | 12+ (or use H2 for a quick look) |

### 1. Clone

```bash
git clone https://github.com/bashirbolarinwa5-arch/Estate_Access_Control.git
cd Estate_Access_Control
```

### 2. Create the database

```sql
CREATE DATABASE estateflow;
```

### 3. Configure the backend

All secrets are supplied by environment variables (or a `.env` file in the project root — supported by `spring-dotenv`):

| Variable | Required | Example | Purpose |
|---|:---:|---|---|
| `DB_PASSWORD` | ✅ | `••••••` | Postgres password |
| `JWT_SECRET` | ✅ | base64 string | JWT signing key — **generate a long random value**, e.g. `openssl rand -base64 64` |
| `CORS_ALLOWED_ORIGINS` | optional | `http://localhost:5173` | Comma-separated origins allowed to call the API (defaults to the dev frontend) |

### 4. Run the backend

```bash
# Linux/macOS
./mvnw spring-boot:run

# Windows
.\mvnw.cmd spring-boot:run
```

API starts on **http://localhost:8081**.

### 5. Run the frontend

```bash
cd estateflow-frontend
npm install
npm run dev
```

App starts on **http://localhost:5173** (Vite picks another port if 5173 is taken — set `CORS_ALLOWED_ORIGINS` accordingly). Point the frontend at a non-local backend with `VITE_API_BASE_URL`.

### 6. Seed the first administrator

Public signup is intentionally limited to `ROLE_RESIDENT` accounts — each estate needs a **seeded first admin** (all further admins/guards are created from the admin dashboard):

1. Generate a BCrypt hash for the admin password (any BCrypt generator producing `$2a$…`/`$2b$…` matches `BCryptPasswordEncoder`).
2. Insert into the `users` table created by Hibernate:

```sql
INSERT INTO users (username, password, role)
VALUES ('admin', '$2a$10$<your-bcrypt-hash>', 'ROLE_ADMIN');
```

3. Log in at the app with those credentials and use the dashboard to create residents and security personnel (their logins are created for you).

---

## 🔒 Security Model

- **Stateless JWT authentication** — every protected request carries a Bearer token; expired tokens are rejected and the frontend redirects to login.
- **Role-based authorization** on every route matcher in `SecurityConfig` — residents, guards and admins strictly cannot reach each other's operations (e.g. residents see only their own visits; the visits list is admin/guard only).
- **No self-service privilege escalation** — `/api/auth/register` can only ever create a `ROLE_RESIDENT`; any request asking for an admin or guard role must come from an **authenticated administrator**.
- **Passwords are never returned** — the user password field is excluded from all API responses.
- **Revocation on removal** — deleting a security officer deletes their login account in the same operation.
- **Per-resident visitor records** — a visitor's phone lookup is scoped to the resident they're visiting, so records never leak between households.

---

## 🧪 Quality

```bash
# Backend
./mvnw clean compile      # build check
./mvnw test               # unit tests (needs DB env vars, as above)

# Frontend
cd estateflow-frontend
npm run lint              # ESLint — currently zero errors
npm run build             # production build
```

---

## 📍 API Overview

Base URL: `http://localhost:8081` · Auth: `Authorization: Bearer <jwt>`

| Area | Endpoints (selection) | Access |
|---|---|---|
| Auth | `POST /api/auth/login` · `POST /api/auth/register` | public (register → resident only) |
| Residents | `POST/GET/PUT/DELETE /resident` · `GET /resident/me` | admin / resident-self |
| Visitors | `CRUD /visitor` · `POST /visitor/resident/{id}` | admin, guard, resident |
| Visits | `POST /visit` (walk-in) · `POST /visit/planned` · `GET /visit/me` · `PUT /visit/me/approve/{id}` · `PUT /visit/me/reject/{id}` | guard / resident |
| Visits (admin) | `PUT /visit/approve/{id}` · `PUT /visit/reject/{id}` · `DELETE /visit/{id}` | admin only |
| Gate | `POST /visit/check-In/{accessCode}` · `POST /visit/check-Out/{accessCode}` | guard, admin |
| Security staff | `POST/GET/PUT/DELETE /security` | admin only |
| Reports | `GET /api/reports/…` (incl. *currently inside*) | admin, guard |
| Activity logs | `GET /api/activity-logs/…` | admin, guard |

---

## 📈 Roadmap

Ideas that would make the pilot even stronger:

- [ ] Sentry/Buzzer integration — notify the resident's phone (SMS/WhatsApp) when the gate registers a walk-in
- [ ] Multi-estate (multi-tenant) support
- [ ] Flyway/Liquibase migrations instead of `ddl-auto=update`
- [ ] PDF/CSV export of visit reports and audit trail
- [ ] Mobile-responsive guard PWA with QR code scanning for access codes

---

## 👤 Author

**Bashir Bolarinwa** — [bashirbolarinwa5-arch](https://github.com/bashirbolarinwa5-arch)

Built as a real-world estate management product. Feedback and contributions welcome!
