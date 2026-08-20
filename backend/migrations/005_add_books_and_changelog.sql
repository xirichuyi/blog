CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    cover_url TEXT,
    reading_status TEXT NOT NULL DEFAULT 'want_to_read'
        CHECK (reading_status IN ('want_to_read', 'reading', 'finished', 'paused')),
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    rating INTEGER CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
    notes TEXT NOT NULL DEFAULT '',
    started_at TEXT,
    finished_at TEXT,
    is_public INTEGER NOT NULL DEFAULT 1 CHECK (is_public IN (0, 1)),
    download_enabled INTEGER NOT NULL DEFAULT 0 CHECK (download_enabled IN (0, 1)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS book_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    format TEXT NOT NULL,
    file_url TEXT NOT NULL UNIQUE,
    r2_key TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL CHECK (file_size > 0),
    mime_type TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_books_public_status
ON books(is_public, reading_status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_book_files_book_id
ON book_files(book_id);

CREATE TABLE IF NOT EXISTS changelog_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    published_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_changelog_status_published
ON changelog_entries(status, published_at DESC, id DESC);
