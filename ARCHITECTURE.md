# Architecture rules

This file records the boundaries that keep the blog deployable and prevent API
implementations from drifting apart.

## HTTP API

- `/api` is the only backend API prefix.
- Every JSON response uses `ApiResponse<T>`: `{ code, message, data }`.
- Resource routes are canonical REST routes such as `/posts` and
  `/admin/posts/:id`. Do not add parallel legacy aliases or a second response
  format.
- The frontend sends all API traffic through `front/src/services/http.ts`.
  Admin authentication is added by `front/src/services/admin.ts`; feature code
  does not create another HTTP client.
- File bytes never pass through the API. The browser uploads directly to R2
  from a session created by `/api/admin/uploads`.
- Multipart upload identifiers are kept in browser storage for six days. A
  repeated selection of the same file asks R2 which parts already exist,
  refreshes expired signed URLs, and uploads only missing parts. Explicit user
  cancellation aborts and removes the multipart session.

## Data ownership

- SQLite stores posts, categories, tags, book metadata, and changelog entries.
- R2 stores images, videos, and ebook files.
- The backend service runs as `www-data`; the database directory and all SQLite
  sidecar files must remain owned and writable by that account.
- The SQLite pool has one connection while the SQLx bundled SQLite version
  predates the upstream WAL-reset race fix. Revisit the pool size after SQLx can
  use a fixed SQLite release.

## Deployment invariants

- Pull requests run frontend and backend checks. Pushes to `main` deploy.
- Deployments are serialized by the workflow concurrency group.
- Before a backend swap, the workflow checks the R2 browser upload preflight,
  creates and validates an online SQLite backup, and retains seven backups in
  `/var/backups/chuyi-blog`.
- The previous binary and systemd unit are retained. A failed readiness or
  integration check restores them automatically.
- Readiness opens a write transaction and rolls it back. Liveness only proves
  that the process is serving HTTP.
- Database migrations must remain compatible with the previous binary so the
  automated binary rollback is safe. Destructive schema cleanup belongs in a
  later deploy after old code no longer depends on it.

## Article editor

- Markdown source is the canonical article content. CodeMirror edits that source
  directly; previewing must never parse and serialize it back into stored content.
- Editor preview reuses the public `Markdown` component and its existing media
  styles. Video and gallery directives remain compatible with existing posts.
- Upload insertion positions track document edits while the upload is pending.
- `cd front && npm run test:editor` checks source preservation, toolbar history,
  media rendering, asynchronous image insertion, and narrow-screen layout.
  Install Chromium first with `npx playwright install chromium`.
