-- Estate-scoped resident email uniqueness — corrected.
--
-- The previous V3 constraint (UNIQUE (user_id, email)) was not actually
-- per-estate: user_id is already unique per resident row, so two different
-- residents of the SAME estate could still share an email.
--
-- Fix: store the estate directly on the resident row and enforce
-- UNIQUE (estate_id, email).

ALTER TABLE resident ADD COLUMN IF NOT EXISTS estate_id BIGINT;

UPDATE resident r
SET estate_id = u.estate_id
FROM users u
WHERE u.id = r.user_id AND r.estate_id IS NULL;

ALTER TABLE resident ALTER COLUMN estate_id SET NOT NULL;

ALTER TABLE resident DROP CONSTRAINT IF EXISTS uk_resident_estate_email;

ALTER TABLE resident ADD CONSTRAINT uk_resident_estate_email UNIQUE (estate_id, email);
