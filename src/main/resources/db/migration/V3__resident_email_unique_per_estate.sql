-- Estate scoping for resident emails.
--
-- Email uniqueness was global (a single unique constraint on resident.email),
-- which wrongly prevented the same person/email from existing in different
-- estates, and made new-estate admins collide with existing residents when the
-- email namespace was shared.
--
-- The resident belongs to exactly one estate through its user
-- (resident.user_id -> users.id -> users.estate_id), so the per-estate scope is
-- expressed as (user_id, email) here.

ALTER TABLE resident DROP CONSTRAINT IF EXISTS ukea6j0tmqg8wr6b0a59qw8mxej;

ALTER TABLE resident ADD CONSTRAINT uk_resident_estate_email UNIQUE (user_id, email);
