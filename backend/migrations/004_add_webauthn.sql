-- WebAuthn credentials storage
CREATE TABLE IF NOT EXISTS webauthn_credentials (
    id TEXT PRIMARY KEY,
    credential_id TEXT NOT NULL UNIQUE,
    credential_json TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT 'My Passkey',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_used_at TEXT
);

-- Store WebAuthn registration/authentication challenge state (ephemeral)
CREATE TABLE IF NOT EXISTS webauthn_challenges (
    id TEXT PRIMARY KEY,
    challenge_type TEXT NOT NULL CHECK (challenge_type IN ('registration', 'authentication')),
    state_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
