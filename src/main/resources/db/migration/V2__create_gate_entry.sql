-- Offline gate check-ins that arrive before (or without) a matching visit.
CREATE TABLE IF NOT EXISTS gate_entry (
    id BIGSERIAL PRIMARY KEY,
    public_id UUID NOT NULL UNIQUE,
    estate_id BIGINT NOT NULL REFERENCES estate (id),
    guard_user_id BIGINT REFERENCES users (id),
    access_code VARCHAR(12) NOT NULL,
    status VARCHAR(20) NOT NULL,
    visit_id BIGINT REFERENCES visit (id),
    occurred_at TIMESTAMP,
    received_at TIMESTAMP NOT NULL,
    note VARCHAR(300)
);

CREATE INDEX IF NOT EXISTS idx_gate_entry_estate_status
    ON gate_entry (estate_id, status);

CREATE INDEX IF NOT EXISTS idx_gate_entry_access_code
    ON gate_entry (access_code);
