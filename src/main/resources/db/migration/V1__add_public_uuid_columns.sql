-- Existing EstateFlow PostgreSQL schema upgrade.
-- Numeric BIGINT identity columns are intentionally left unchanged.
-- gen_random_uuid() is available in the supported PostgreSQL 16 image.

ALTER TABLE users ADD COLUMN IF NOT EXISTS public_id UUID;
ALTER TABLE estate ADD COLUMN IF NOT EXISTS public_id UUID;
ALTER TABLE resident ADD COLUMN IF NOT EXISTS public_id UUID;
ALTER TABLE visitor ADD COLUMN IF NOT EXISTS public_id UUID;
ALTER TABLE visit ADD COLUMN IF NOT EXISTS public_id UUID;
ALTER TABLE security ADD COLUMN IF NOT EXISTS public_id UUID;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS public_id UUID;

UPDATE users SET public_id = gen_random_uuid() WHERE public_id IS NULL;
UPDATE estate SET public_id = gen_random_uuid() WHERE public_id IS NULL;
UPDATE resident SET public_id = gen_random_uuid() WHERE public_id IS NULL;
UPDATE visitor SET public_id = gen_random_uuid() WHERE public_id IS NULL;
UPDATE visit SET public_id = gen_random_uuid() WHERE public_id IS NULL;
UPDATE security SET public_id = gen_random_uuid() WHERE public_id IS NULL;
UPDATE activity_log SET public_id = gen_random_uuid() WHERE public_id IS NULL;

ALTER TABLE users ALTER COLUMN public_id SET NOT NULL;
ALTER TABLE estate ALTER COLUMN public_id SET NOT NULL;
ALTER TABLE resident ALTER COLUMN public_id SET NOT NULL;
ALTER TABLE visitor ALTER COLUMN public_id SET NOT NULL;
ALTER TABLE visit ALTER COLUMN public_id SET NOT NULL;
ALTER TABLE security ALTER COLUMN public_id SET NOT NULL;
ALTER TABLE activity_log ALTER COLUMN public_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_public_id ON users (public_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_estate_public_id ON estate (public_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_resident_public_id ON resident (public_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_visitor_public_id ON visitor (public_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_visit_public_id ON visit (public_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_security_public_id ON security (public_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_activity_log_public_id ON activity_log (public_id);
