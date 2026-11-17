-- Self-service resident activation.
--
-- Administrators never create or share a password: an imported
-- resident starts in the PENDING_ACTIVATION state and stores an
-- unguessable random hash that nobody knows. The resident sets the
-- real password through the emailed, single-use activation link.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS pending_activation boolean NOT NULL DEFAULT false;

-- Activation may be triggered with the phone number on record,
-- looked up inside one estate.
CREATE INDEX IF NOT EXISTS idx_resident_estate_phone
    ON resident (estate_id, phone_number);
