-- One phone number, one account per estate.
--
-- A phone number is a login identifier for "First time here? Create
-- password", so two residents must never share one inside the same
-- estate. The application enforces this in PhoneDirectoryGuard; this
-- partial unique index makes it impossible to bypass, while still
-- allowing rows with no phone number on record.
--
-- The two known duplicate pairs (resident 25/35 and 26/33) were removed
-- before this migration was applied, so the index builds cleanly.
CREATE UNIQUE INDEX IF NOT EXISTS ux_resident_estate_phone
    ON resident (estate_id, phone_number)
    WHERE phone_number IS NOT NULL AND phone_number <> '';
