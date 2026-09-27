CREATE TABLE reader_states (
    owner TEXT NOT NULL,
    file_id INTEGER NOT NULL REFERENCES book_files(id) ON DELETE CASCADE,
    revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
    data TEXT NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (owner, file_id)
);
