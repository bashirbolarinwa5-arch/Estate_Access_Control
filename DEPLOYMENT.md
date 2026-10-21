# 🚀 EstateFlow — Production Deployment Runbook

**Topology:**

```
┌─────────────────────┐          ┌────────────────────────────────┐
│  Vercel (HTTPS)     │          │  VPS (Ubuntu + Docker)         │
│                     │  HTTPS   │                                │
│  React frontend  ───┼──────────┼──►  Caddy ──► Spring Boot JAR  │
│  (built by Vercel)  │  API     │              │                 │
└─────────────────────┘  calls   │              ▼                 │
                                 │           PostgreSQL           │
                                 └────────────────────────────────┘
```

- **Frontend → Vercel:** Vercel imports the GitHub repo and builds `estateflow-frontend` itself. No source, no Node on the VPS.
- **Backend → VPS:** only the compiled Spring Boot JAR + Postgres run on the server. Spring Boot packages every dependency inside the JAR, so the server never sees `src/`, `pom.xml`, Maven or Node.

> **Security rule #1:** the SSH **private key never leaves your machine**, and nothing
> secret (passwords, JWT secret, `.env`) is ever committed to git. Secrets live only
> in the server's `.env` file.

> ⚠️ **HTTPS is not optional here.** Vercel always serves your site over HTTPS, and
> browsers **block HTTPS pages from calling HTTP APIs** ("mixed content"). So the API
> must eventually be served over HTTPS with a domain (Caddy — see *Part 3*). Until the
> domain is ready you can still deploy and test the backend locally / on the VPS via
> SSH, but the Vercel site won't be able to call it yet.

---

## 0. What you need before starting

- A VPS running **Ubuntu 22.04 or 24.04**, min **2 GB RAM**, root access
- SSH access configured (key-based — you've done this ✅)
- A (free) Vercel account — sign in with GitHub
- A domain for the API (needed for HTTPS before real users use the site)

---

## Part 1 — Backend on the VPS (compiled JAR, no source)

### 1. Connect & install Docker (one time)

From your machine:

```bash
ssh root@<SERVER_IP>
```

On the server:

```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
docker --version && docker compose version    # verify
```

### 2. Firewall

```bash
ufw allow OpenSSH      # never lock yourself out of SSH
ufw allow 8081/tcp     # the API (remove later once Caddy/HTTPS is on)
ufw enable
ufw status
```

When Caddy goes live (Part 3), replace `8081/tcp` with `80/tcp` + `443/tcp`.

### 3. Build the release package (on your machine)

```powershell
.\build-release.ps1
```

This compiles the executable Spring Boot JAR and stages a backend-only package:

```
release/
  backend/app.jar            ← compiled executable JAR (all dependencies inside)
  backend/Dockerfile         ← JRE 17 runtime only — no Maven, no source
  docker-compose.prod.yml    ← db + api (+ commented Caddy service)
  Caddyfile.example          ← HTTPS template for later
  .env.example
```

### 4. Upload and start

```bash
scp -r release/* root@<SERVER_IP>:/opt/estateflow/
ssh root@<SERVER_IP>
cd /opt/estateflow
cp .env.example .env
openssl rand -base64 64       # copy output → JWT_SECRET
nano .env
```

Fill in:

| Variable | Value |
|---|---|
| `DB_PASSWORD` | a strong password you invent |
| `JWT_SECRET` | the base64 string from `openssl rand -base64 64` |
| `CORS_ALLOWED_ORIGINS` | your Vercel URL, e.g. `https://estateflow.vercel.app` (add preview URLs comma-separated; `https://*.vercel.app` is allowed too) |

Start it:

```bash
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps       # db + api should be Up
docker compose -f docker-compose.prod.yml logs -f backend   # Ctrl+C to exit
```

First startup only pulls base images (JRE, Postgres) — minutes, no compiling.

### 5. Seed the platform owner (one time)

Public signup only creates residents, so the SUPER_ADMIN is seeded manually:

```bash
docker compose -f docker-compose.prod.yml exec -T db \
  psql -U postgres -d estateflow < create-platform-owner.sql
```

> The seed file creates username `Adeyemi` (ROLE_SUPER_ADMIN, no estate). On a **fresh**
> database this just works — the `users_role_check` constraint issue only existed on the
> old local dev database. Log in as `Adeyemi`, then create your first estate and its
> admin from the Platform Owner dashboard.

To seed a regular estate admin instead, use the Platform Owner dashboard (never raw SQL) —
passwords are BCrypt-encoded automatically.

### 6. Deploying a backend update

```powershell
.\build-release.ps1
scp -r release/* root@<SERVER_IP>:/opt/estateflow/
```

```bash
cd /opt/estateflow
docker compose -f docker-compose.prod.yml up -d --build
```

Only the JAR changed — the image rebuilds in seconds and the database volume is untouched.

> *(Quick-trial alternative: `git clone` the repo on the server and `docker compose up -d --build`
> with the dev `docker-compose.yml` — builds Maven + npm on the server. Fine for a look-see,
> not for production.)*

---

## Part 2 — Frontend on Vercel

The repo already contains `estateflow-frontend/vercel.json` (SPA rewrites so React Router
paths like `/security` work on refresh).

1. Go to **vercel.com** → **Add New… → Project** → import `bashirbolarinwa5-arch/Estate_Access_Control`.
2. **Root Directory:** `estateflow-frontend` ← important, the frontend is a subfolder.
3. Framework preset **Vite** is auto-detected (build `npm run build`, output `dist`).
4. **Environment Variables** (before the first deploy):
   | Name | Value |
   |---|---|
   | `VITE_API_BASE_URL` | the API address browsers will call, e.g. `https://api.your-domain.com` (after Part 3). Vite inlines it at build time. |
5. **Deploy.** Vercel gives you `https://<project>.vercel.app`.
6. Back on the VPS: put that Vercel URL into `CORS_ALLOWED_ORIGINS` in `.env`, then:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```
   (recreates the API with the new CORS value).

**Preview deployments:** every commit/PR also gets a temporary `*.vercel.app` URL. Either
add them to `CORS_ALLOWED_ORIGINS` or use `https://*.vercel.app` once and cover them all
(the backend uses origin *patterns*, so wildcards are credential-safe).

Later: in the Vercel project → **Domains**, add your custom domain (e.g. `app.yourdomain.com`)
and point its DNS at Vercel — certificates are automatic.

---

## Part 3 — HTTPS for the API (required for production)

1. Buy/choose a domain; add a DNS **A record**: `api.your-domain.com` → `<SERVER_IP>`.
2. On the server:
   ```bash
   cd /opt/estateflow
   cp Caddyfile.example Caddyfile      # edit the domain inside
   ufw allow 80/tcp && ufw allow 443/tcp
   ufw delete allow 8081/tcp           # API now only reachable through Caddy
   nano docker-compose.prod.yml        # uncomment the caddy service + volumes
   ```
3. ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```
   Caddy obtains and renews the Let's Encrypt certificate automatically.
4. In Vercel: set `VITE_API_BASE_URL=https://api.your-domain.com` and **redeploy**
   (the value is baked into the bundle at build time).
5. Update `CORS_ALLOWED_ORIGINS=https://app-or-project.vercel.app` (unchanged unless
   the frontend domain changed too).

---

## 🔧 Everyday server commands

```bash
cd /opt/estateflow
docker compose -f docker-compose.prod.yml ps                    # what's running
docker compose -f docker-compose.prod.yml logs -f backend       # API logs (errors show here)
docker compose -f docker-compose.prod.yml restart backend       # restart one service
docker compose -f docker-compose.prod.yml down                  # stop (data volume survives)
docker compose -f docker-compose.prod.yml up -d                 # start again
```

---

## 🗄️ Backups (do this on day one)

Daily database dump at 2 AM, kept for 7 days:

```bash
mkdir -p /opt/backups
crontab -e
# add this line:
0 2 * * * docker compose -f /opt/estateflow/docker-compose.prod.yml exec -T db \
  pg_dump -U postgres estateflow | gzip > /opt/backups/estateflow-$(date +\%F).sql.gz && \
  find /opt/backups -name "*.sql.gz" -mtime +7 -delete
```

---

## ✅ Deployment checklist

- [ ] Docker installed, `docker compose version` works
- [ ] UFW: 22 + 8081 open (→ 22/80/443 once Caddy is on)
- [ ] `release/` uploaded, `.env` created with real `DB_PASSWORD` + fresh `JWT_SECRET`
- [ ] `docker compose -f docker-compose.prod.yml up -d` — db + api Up
- [ ] Platform owner seeded (`Adeyemi`), login works, first estate + admin created
- [ ] Vercel project deployed with `VITE_API_BASE_URL` set
- [ ] `CORS_ALLOWED_ORIGINS` matches the Vercel URL, API recreated
- [ ] **HTTPS live** (Caddy + domain) — mixed-content blocker cleared
- [ ] Cron backup running
- [ ] **Test accounts created during testing deleted**

---

## 🧯 Troubleshooting

| Symptom | Fix |
|---|---|
| Backend exits immediately | `docker compose logs backend` — 99%: wrong/missing `DB_PASSWORD` or `JWT_SECRET` in `.env` |
| CORS errors in the browser console | `CORS_ALLOWED_ORIGINS` in `.env` doesn't include the exact Vercel URL → fix, then `docker compose -f docker-compose.prod.yml up -d` |
| "Blocked mixed content" in the browser | the HTTPS Vercel site is calling the HTTP API → finish Part 3 (Caddy + domain) |
| Vercel build fails | check Root Directory is `estateflow-frontend` and `VITE_API_BASE_URL` is set in project env vars |
| Deep links 404 on Vercel refresh | `vercel.json` rewrites missing → it's committed in `estateflow-frontend/` |
| Port 80/443 already in use | something else owns them → `docker compose down` other stacks |
| Forgot a password | SUPER_ADMIN → reset from the dashboard; forgot `Adeyemi`'s → seed a new hash like step 5 |
