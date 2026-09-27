# Reader regression checks

Run `npm run test:reader` after installing Playwright Chromium and WebKit (`npx playwright install --with-deps chromium webkit`). The tests use original, generated EPUB/PDF fixtures and mocked account/API endpoints; no production data is accessed. Regenerate fixtures with `python3 tests/fixtures/make_reader_fixtures.py`.

Coverage includes actual mobile taps, chapter and PDF outline navigation, restoring in a fresh browser context, highlight persistence/deletion, notes and reviews, offline retry, stale-writer conflicts, and inert EPUB scripts. Backend `cargo test --lib` separately exercises database migrations, per-account/file isolation, authentication and atomic revision checks. This repository's existing SQLx query macros require a migrated SQLite `DATABASE_URL` even during compilation.

## Data and deployment

- Deploy the backend and frontend together. Backend startup applies `007_add_reader_states.sql` automatically through the existing SQLx migrator. It adds a separate table and does not rewrite books.
- `/api/books/:book_id/files/:file_id/reader` requires the existing allowed Google account cookie. `X-Reader-Account` must match that session so a tab left open during an account switch cannot write one user's local data to another account.
- Data is private to the account and the exact file/edition. EPUB uses a CFI; PDF uses a page number. Bookmarks, notes, ratings and reviews are also per edition. Public bookshelf editorial progress/notes remain separate from personal reading data.
- PUT includes the last server revision. Stale writes receive HTTP 409. The UI lets the reader choose the cloud or current local version. Requests are serialized; edits made while saving remain pending.
- Guests use browser storage. Account caches have separate keys; the old `book-reader:<book>:<file>` position is imported only if the cloud edition has never been saved. Failed writes remain cached and can be retried. Anonymous use does not provide cross-device synchronization.
- PDF supports page bookmarks/notes and embedded outlines. Text-range highlighting is currently available for EPUB.

## WebKit compatibility

The reader route is outside the public Layout, whose Dock could intercept taps. A permanent menu button is independent of hover and iframe gestures; gesture hit testing uses the visible reader viewport, including in scroll mode.

[WebKit issue 218086](https://bugs.webkit.org/show_bug.cgi?id=218086) blocks even parent-owned event listeners inside `sandbox="allow-same-origin"` frames. EPUB chapters now pass through DOMPurify after EPUB.js resource replacement, then receive a leading CSP with `script-src 'none'`. This permits the reader's parent-owned event listeners while the sanitizer and CSP prevent book scripts, inline handlers and nested frames from running. Do not remove the pre-render sanitizer/CSP while retaining `allowScriptedContent: true`. The browser tests also insert a script after sanitization to verify CSP independently.
