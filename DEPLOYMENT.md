# 🚀 EstateFlow — VPS Deployment Runbook

Step-by-step deployment to an Ubuntu VPS using the Docker setup in this repo.
Follow the steps in order — each one takes 1–5 minutes except the first build (~5–10 min).

> **Security rule #1:** the SSH **private key never leaves your machine**, and nothing
> secret (passwords, JWT secret, `.env`) is ever committed to git. Secrets live only
> in the server's `.env` file.

---

## 0. What you need before starting

- A VPS running **Ubuntu 22.04 or 24.04**, min **2 GB RAM**, root access
- SSH access configured (key-based — you've done this ✅)
- The repo URL: `https://github.com/bashirbolarinwa5-arch/Estate_Access_Control.git`

---

## 1. Connect to the server

From your own machine:

```bash
ssh root@<SERVER_IP>
```

## 2. Install Docker (on the server)

```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
docker --version && docker compose version    # verify
```

## 3. Firewall — only what's needed

```bash
ufw allow OpenSSH      # never lock yourself out of SSH
ufw allow 80/tcp       # the web app
ufw allow 8081/tcp     # the API
ufw enable
ufw status
```

## 4. Get the code (Option A — build from source on the server)

```bash
cd /opt
git clone https://github.com/bashirbolarinwa5-arch/Estate_Access_Control.git estateflow
cd estateflow
```

## 5. Create the secrets file

```bash
cp .env.example .env
openssl rand -base64 64        # copy the output — this is your JWT_SECRET
nano .env
```

Fill in:

| Variable | Value for a fresh VPS (no domain yet) |
|---|---|
| `DB_PASSWORD` | a strong password you invent |
| `JWT_SECRET` | the base64 string from `openssl rand -base64 64` |
| `WEB_PORT` | `80` (default) |
| `VITE_API_BASE_URL` | `http://<SERVER_IP>:8081` |
| `CORS_ALLOWED_ORIGINS` | `http://<SERVER_IP>` |

> The browser loads pages from `http://<SERVER_IP>` and calls the API at
> `http://<SERVER_IP>:8081` — those two values must match exactly what you
> browse from, or you'll get CORS errors.

## 6. Build and start everything

```bash
docker compose up -d --build
```

First build takes 5–10 minutes (Maven + npm downloads). After it finishes:

```bash
docker compose ps          # all three services should be Up
docker compose logs -f backend    # watch the API boot; Ctrl+C to exit
```

The app is now live at **http://<SERVER_IP>** 🎉

## 7. Seed the first administrator (one time)

Public signup can only create residents, so the first admin is seeded manually:

```bash
# 1) generate a BCrypt hash for your admin password — run this on YOUR
#    machine or any machine with Node.js:
npx bcrypt-cli "YourAdminPassword1!" 10
#    (or use any BCrypt generator producing a $2a$10$… / $2b$10$… string)

# 2) insert the admin (paste your hash — keep the quotes):
docker compose exec db psql -U postgres -d estateflow \
  -c "INSERT INTO users (username, password, role) VALUES ('admin', '$2a$10$<paste-hash-here>', 'ROLE_ADMIN');"
```

Log in at `http://<SERVER_IP>` with that admin, then create residents and
security personnel from the dashboard — their logins are created automatically.

## 8. Deploying an update (later)

```bash
cd /opt/estateflow
git pull
docker compose up -d --build
```

Only changed layers rebuild; the database is untouched.

---

## 📦 Option B — deploy compiled artifacts only (no source on the server)

Option A clones the repo and builds **on** the server. In production you usually
don't want `src/`, `pom.xml` or `package.json` on the target machine. Spring Boot
packages every dependency inside the executable JAR, so the server only needs
the built artifacts.

### On your machine (one command)

```powershell
.\build-release.ps1 -ApiBaseUrl "http://<SERVER_IP>:8081"
```

The script builds the backend JAR, builds the React bundle with the API URL baked
in, and stages a `release/` folder that contains **only deployable artifacts**:

```
release/
  backend/app.jar            ← compiled Spring Boot executable JAR (all deps inside)
  backend/Dockerfile         ← JRE 17 runtime only — no Maven, no source
  frontend/dist/...          ← built React bundle
  frontend/Dockerfile        ← nginx runtime only — no Node, no source
  frontend/nginx.conf
  docker-compose.prod.yml    ← db + api + web
  .env.example
```

### Copy to the server and start

```bash
scp -r release/* root@<SERVER_IP>:/opt/estateflow/
ssh root@<SERVER_IP>
cd /opt/estateflow
cp .env.example .env && nano .env
#   DB_PASSWORD, JWT_SECRET, WEB_PORT=80,
#   VITE_API_BASE_URL=http://<SERVER_IP>:8081   ← must match the -ApiBaseUrl
#   CORS_ALLOWED_ORIGINS=http://<SERVER_IP>       you built the bundle with
docker compose -f docker-compose.prod.yml up -d
```

First startup pulls the base images (JRE 17, nginx, Postgres) in minutes — no
compile step at all. Then seed the first admin exactly as in **step 7**, and use
the same firewall/backup steps.

### Deploying an update (Option B)

```powershell
.\build-release.ps1 -ApiBaseUrl "http://<SERVER_IP>:8081"
scp -r release/* root@<SERVER_IP>:/opt/estateflow/
```

```bash
cd /opt/estateflow
docker compose -f docker-compose.prod.yml up -d --build
```

Only the JAR and bundle changed — images rebuild in seconds and the database
volume is untouched.

> **Which option?** Option B is the recommended production flow (small attack
> surface, fast server deploys). Option A is convenient for a quick trial on the
> VPS. When we add CI/CD later, it automates Option B on every push.

---

## 🔧 Everyday server commands

```bash
docker compose ps                    # what's running
docker compose logs -f backend       # API logs (errors show here)
docker compose restart backend       # restart one service
docker compose down                  # stop everything (data volume survives)
docker compose up -d                 # start again
```

---

## 🗄️ Backups (do this on day one)

Daily database dump at 2 AM, kept for 7 days:

```bash
crontab -e
# add this line:
0 2 * * * docker compose -f /opt/estateflow/docker-compose.yml exec -T db \
  pg_dump -U postgres estateflow | gzip > /opt/backups/estateflow-$(date +\%F).sql.gz && \
  find /opt/backups -name "*.sql.gz" -mtime +7 -delete
```

```bash
mkdir -p /opt/backups       # create the folder first
```

---

## 🌐 Adding the domain later (HTTPS)

When a domain is pointed at the server, the plan is:

1. DNS: `app.yourdomain.com` → server IP, `api.yourdomain.com` → server IP
2. Add a **Caddy** service to `docker-compose.yml` (automatic HTTPS certificates) in front of web + api
3. Update `.env`: `VITE_API_BASE_URL=https://api.yourdomain.com`, `CORS_ALLOWED_ORIGINS=https://app.yourdomain.com`
4. `docker compose up -d --build`

---

## ✅ Deployment checklist

- [ ] Docker installed, `docker compose version` works
- [ ] UFW: only 22 / 80 / 8081 open
- [ ] `.env` created on the server — real `DB_PASSWORD` + fresh `JWT_SECRET`
- [ ] `VITE_API_BASE_URL` + `CORS_ALLOWED_ORIGINS` match the server IP/domain
- [ ] `docker compose up -d --build` — all 3 containers Up
- [ ] First admin seeded, logged in successfully
- [ ] Cron backup running
- [ ] **Test accounts created during testing deleted**

---

## 🧯 Troubleshooting

| Symptom | Fix |
|---|---|
| Backend exits immediately | `docker compose logs backend` — 99%: wrong/missing `DB_PASSWORD` or `JWT_SECRET` in `.env` |
| CORS errors in the browser console | `CORS_ALLOWED_ORIGINS` in `.env` doesn't exactly match the address in the browser bar → fix, then `docker compose up -d --build frontend` (the API URL is baked at build time) |
| Port 80 already in use | something else owns port 80 → `docker compose down` other stacks, or set a different `WEB_PORT` |
| Forgot admin password | seed a new admin row (step 7), log in, delete the old one |
