# Reader regression checks

Run `npm run test:reader` after installing Playwright Chromium and WebKit (`npx playwright install --with-deps chromium webkit`). The tests use original, generated EPUB/PDF fixtures and mocked account/API endpoints; no production data is accessed. Regenerate fixtures with `python3 tests/fixtures/make_reader_fixtures.py`.

Coverage includes actual mobile taps, chapter and PDF outline navigation, restoring in a fresh browser context, highlight persistence/deletion, notes and reviews, offline retry, stale-writer conflicts, and inert EPUB scripts. Backend `cargo test --lib` separately exercises database migrations, per-account/file isolation, authentication and atomic revision checks. This repository's existing SQLx query macros require a migrated SQLite `DATABASE_URL` even during compilation.

## Data and deployment

- EPUBs now open through `/api/books/:book_id/files/:file_id/epub`, which returns an immutable edition version, the original OPF path and spine weights. Versioned resource URLs serve individual chapters/styles/images; the browser never downloads the original archive to read it. Resource requests enforce book visibility and carry a restrictive CSP for direct navigation.
- The backend prepares an EPUB once under `backend/data/epub-v1/`, using the existing Python 3 runtime. Preparation streams the original from authenticated R2 storage, validates archive paths and size limits, extracts to staging and atomically publishes it. New uploads prepare in the background; existing editions prepare on first access. No database migration or CFI rewriting is needed. Warm existing public editions by requesting their EPUB manifest before activating the new frontend.
- Reading displays the current chapter and prefetches the next two and previous one after a short idle delay. Save-Data and 2G connections disable prefetch. IndexedDB chapter cache holds at most 32 entries of at most 512 KiB each; the in-memory text cache holds eight entries. Failed requests are never cached. Private editions bypass persistent chapter caching. Images and styles use normal HTTP caching.
- Progress uses a prefix sum of linear spine resource sizes and a text-node offset index built only for the current rendered chapter. No whole-book `locations.generate()` call remains. The percentage is an estimate weighted by resource size; CFI remains the precise restoration and annotation anchor. Book replacement changes the version and cannot reuse the old cache.
- Run `python3 -B backend/scripts/test_prepare_epub.py` from the repository root for extraction integrity/path/size checks. The long-book browser regression verifies immediate restored progress, bounded chapter requests, no archive download, cache reuse on reload and distant TOC jumps in Chromium and WebKit.

- Deploy the backend and frontend together. Backend startup applies `007_add_reader_states.sql` automatically through the existing SQLx migrator. It adds a separate table and does not rewrite books.
- `/api/books/:book_id/files/:file_id/reader` requires the existing allowed Google account cookie. `X-Reader-Account` must match that session so a tab left open during an account switch cannot write one user's local data to another account.
- Data is private to the account and the exact file/edition. EPUB uses a CFI; PDF uses a page number. Bookmarks, notes, ratings and reviews are also per edition. Public bookshelf editorial progress/notes remain separate from personal reading data.
- PUT includes the last server revision. Stale writes receive HTTP 409. The UI lets the reader choose the cloud or current local version. Requests are serialized; edits made while saving remain pending.
- Guests use browser storage. Account caches have separate keys; the old `book-reader:<book>:<file>` position is imported only if the cloud edition has never been saved. Failed writes remain cached and can be retried. Anonymous use does not provide cross-device synchronization.
- PDF supports page bookmarks/notes and embedded outlines. Text-range highlighting is currently available for EPUB.

## WebKit compatibility

The reader route is outside the public Layout, whose Dock could intercept taps. A permanent menu button is independent of hover and iframe gestures; gesture hit testing uses the visible reader viewport, including in scroll mode.

[WebKit issue 218086](https://bugs.webkit.org/show_bug.cgi?id=218086) blocks even parent-owned event listeners inside `sandbox="allow-same-origin"` frames. EPUB chapters now pass through DOMPurify after EPUB.js resource replacement, then receive a leading CSP with `script-src 'none'`. This permits the reader's parent-owned event listeners while the sanitizer and CSP prevent book scripts, inline handlers and nested frames from running. Do not remove the pre-render sanitizer/CSP while retaining `allowScriptedContent: true`. The browser tests also insert a script after sanitization to verify CSP independently.
