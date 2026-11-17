-- Security personnel onboarding: no administrator-created password.
--
-- A security officer is provisioned exactly like a resident: the account
-- starts in PENDING_ACTIVATION with an unguessable random hash and the
-- officer sets their own password through the emailed activation link.
--
-- The optional shift / gate assignment now travels with the record so a
-- bulk sheet can carry Name, Phone, Email and Gate/Shift.

ALTER TABLE security
    ADD COLUMN IF NOT EXISTS shift varchar(120);

-- Activation is triggered with the email or phone number on record,
-- scoped to the estate through security.user_id -> users.estate_id.
CREATE INDEX IF NOT EXISTS idx_security_email
    ON security (email);

CREATE INDEX IF NOT EXISTS idx_security_phone
    ON security (phone_number);
