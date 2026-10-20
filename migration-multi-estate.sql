-- =====================================================================
--  EstateFlow → Multi-Estate migration (one-time backfill)
--
--  WHEN TO RUN
--  -----------
--  1. Deploy the multi-estate backend ONCE (Hibernate, with
--     ddl-auto=update, automatically creates):
--        - the `estates` table
--        - users.estate_id, visitors.estate_id,
--          visits.estate_id, activity_logs.estate_id (nullable FKs)
--  2. Then run THIS script against the live database to attach
--     all existing data to its first estate.
--
--  Run with:  docker compose exec db psql -U postgres -d estateflow -f ...
--  or paste each statement into psql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Create the first estate
-- ---------------------------------------------------------------------
INSERT INTO estates (estate_name, estate_code, active, created_at)
VALUES ('Default Estate', 'EST001', true, now());

-- ---------------------------------------------------------------------
-- 2. Attach every estate user to it.
--    SUPER_ADMIN rows must stay NULL (platform, not estate).
-- ---------------------------------------------------------------------
UPDATE users
SET estate_id = (SELECT id FROM estates WHERE estate_code = 'EST001')
WHERE role <> 'ROLE_SUPER_ADMIN'
  AND estate_id IS NULL;

-- ---------------------------------------------------------------------
-- 3. Historic visitors and visits belong to the estate too.
--    (Un-migrated rows would be invisible to estate users,
--    because every estate query filters by estate.)
-- ---------------------------------------------------------------------
UPDATE visitors
SET estate_id = (SELECT id FROM estates WHERE estate_code = 'EST001')
WHERE estate_id IS NULL;

UPDATE visits
SET estate_id = (SELECT id FROM estates WHERE estate_code = 'EST001')
WHERE estate_id IS NULL;

-- ---------------------------------------------------------------------
-- 4. Activity logs:
--    Rows with estate_id NULL read as platform-level history.
--    Old logs date from before estates existed, so they are
--    left visible to the SUPER_ADMIN only.
--    OPTIONALLY attach them to the estate as well:
-- ---------------------------------------------------------------------
-- UPDATE activity_logs
-- SET estate_id = (SELECT id FROM estates WHERE estate_code = 'EST001')
-- WHERE estate_id IS NULL;

-- ---------------------------------------------------------------------
-- 5. Sanity checks (should all return sensible counts)
-- ---------------------------------------------------------------------
SELECT estate_code, active FROM estates;
SELECT role, count(*) FROM users GROUP BY role;
SELECT count(*) AS users_without_estate
FROM users WHERE role <> 'ROLE_SUPER_ADMIN' AND estate_id IS NULL;
SELECT count(*) AS visits_without_estate FROM visits WHERE estate_id IS NULL;
