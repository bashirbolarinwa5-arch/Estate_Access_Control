#!/usr/bin/env bash
set -Eeuo pipefail

# Backup-first backend deployment for the current Docker Compose VPS topology.
# The React app is hosted by Vercel; see the printed frontend command below.
# This script deliberately requires an explicit production confirmation.

: "${DEPLOY_HOST:?Set DEPLOY_HOST, for example root@203.0.113.10}"
: "${DEPLOY_CONFIRM:?Set DEPLOY_CONFIRM=YES only when ready to deploy}"
if [[ "$DEPLOY_CONFIRM" != "YES" ]]; then
  echo "Refusing deployment: set DEPLOY_CONFIRM=YES to proceed." >&2
  exit 2
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RELEASE_DIR="${RELEASE_DIR:-$ROOT_DIR/release}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/adeyemi/estateflow}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_NAME="estateflow_${STAMP}.dump"

test -s "$RELEASE_DIR/backend/app.jar"
test -s "$RELEASE_DIR/backend/Dockerfile"
test -s "$RELEASE_DIR/docker-compose.prod.yml"

echo "Creating and verifying a PostgreSQL backup on the VPS before migration..."
ssh "$DEPLOY_HOST" bash -s -- "$DEPLOY_PATH" "$BACKUP_NAME" <<'REMOTE_BACKUP'
set -Eeuo pipefail
deploy_path="$1"
backup_name="$2"
backup_dir="/opt/adeyemi/backups"
mkdir -p "$backup_dir"
docker exec estateflow-db pg_dump -U postgres -d estateflow -Fc > "$backup_dir/$backup_name"
test -s "$backup_dir/$backup_name"
docker exec -i estateflow-db pg_restore --list < "$backup_dir/$backup_name" > /tmp/estateflow_backup_list.txt
for t in users estate resident visitor visit security activity_log; do
  grep -q "TABLE DATA public $t " /tmp/estateflow_backup_list.txt
done
echo "Backup ready and verified: $backup_dir/$backup_name"
REMOTE_BACKUP

echo "Uploading the compiled backend and Compose configuration..."
ssh "$DEPLOY_HOST" "mkdir -p '$DEPLOY_PATH/backend'"
scp "$RELEASE_DIR/backend/app.jar" "$RELEASE_DIR/backend/Dockerfile" "$DEPLOY_HOST:$DEPLOY_PATH/backend/"
scp "$RELEASE_DIR/docker-compose.prod.yml" "$DEPLOY_HOST:$DEPLOY_PATH/"

echo "Starting the backend; Flyway V1 runs before Hibernate initialization..."
ssh "$DEPLOY_HOST" bash -s -- "$DEPLOY_PATH" <<'REMOTE_DEPLOY'
set -Eeuo pipefail
deploy_path="$1"
cd "$deploy_path"
test -s .env
docker compose -f docker-compose.prod.yml up -d --build backend
docker compose -f docker-compose.prod.yml ps backend

started=0
for _ in $(seq 1 60); do
  logs="$(docker logs estateflow-api 2>&1 || true)"
  if grep -q "Started Demo4Application" <<< "$logs"; then
    started=1
    break
  fi
  status="$(docker inspect --format '{{.State.Status}}' estateflow-api 2>/dev/null || true)"
  if [[ "$status" == "exited" || "$status" == "dead" ]]; then
    printf '%s\n' "$logs" | tail -n 120
    echo "Backend exited during startup; the database backup is retained." >&2
    exit 1
  fi
  sleep 2
done
if [[ "$started" != "1" ]]; then
  docker compose -f docker-compose.prod.yml logs --tail=120 backend
  echo "Backend did not report successful startup; the database backup is retained." >&2
  exit 1
fi

version="$(docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d estateflow -Atc \
  "SELECT version FROM flyway_schema_history WHERE version = '1' AND success = true LIMIT 1;")"
test "$version" = "1"

column_count="$(docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d estateflow -Atc \
  "SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'public_id' AND table_name IN ('users','estate','resident','visitor','visit','security','activity_log') AND is_nullable = 'NO';")"
test "$column_count" = "7"
echo "Flyway migration and all seven non-null public_id columns verified."
REMOTE_DEPLOY

echo "Backend deployment verified. PostgreSQL backup: /opt/adeyemi/backups/$BACKUP_NAME"
echo "Frontend assets are staged locally under release/frontend; this project serves the frontend from Vercel."
echo "After committing and linking/authenticating the Vercel project, deploy with:"
echo "  npx vercel --prod --cwd estateflow-frontend"
