-- =====================================================================
--  Create the platform owner (SUPER_ADMIN)
--
--  WHEN TO RUN
--  ------------
--  AFTER the multi-estate backend has booted at least once,
--  so the `active` and `estate_id` columns exist on `users`.
--
--  Login details created by this script:
--      Username:  Adeyemi        (capital A — logins are case-sensitive)
--      Password:  ade123
--      Role:      SUPER_ADMIN (platform owner, no estate)
--
--  Run in pgAdmin or:
--      docker compose exec db psql -U postgres -d estateflow -f ...
-- =====================================================================

INSERT INTO users (username, password, role, active, estate_id)
VALUES (
    'Adeyemi',
    '$2a$10$RJLLVmIP4u6tacSfpG1bteogsgxx1HN8S9dx7vYN2c0mReKY2H2r6',
    'ROLE_SUPER_ADMIN',
    true,
    NULL
);

-- Expect: 1 row inserted.
--
-- Then log in via the browser with the "Platform Owner" role selected.
--
-- To change the password later, generate a new BCrypt hash and re-run:
--   UPDATE users SET password = '<new-hash>' WHERE username = 'Adeyemi';
--
-- Note: 'ade123' is fine for local testing, but choose a strong
-- password before going live on a VPS.
