# Chuyi Blog

Personal blog and content-management application for `blog.chuyi.uk`.

## Structure

- `front/` — React, TypeScript and Vite frontend, including the public site and admin UI.
- `backend/` — Rust/Axum API backed by SQLite metadata.
- `backend/tools/gitbook2epub/` — runtime helper used by the GitBook-to-EPUB tool.

Media is stored exclusively in Cloudflare R2. The backend only validates upload requests and signs short-lived R2 URLs; file bytes travel directly between the browser and Cloudflare. Small images use one signed PUT, while videos and ebooks use signed multipart uploads. There is no local `/uploads` storage, upload proxy, or static upload route.

## Development

Frontend:

```bash
cd front
npm ci
npm run dev
```

The Vite development server proxies `/api` to `https://blog.chuyi.uk` by default. Set `VITE_API_TARGET=http://127.0.0.1:3006` to use a local backend.

Backend:

```bash
cd backend
cp .env.example .env
cargo run
```

SQLite migrations run automatically at startup. The database defaults to `backend/data/blog.db`; runtime database files are ignored by Git.

R2 is required in production. Configure `S3_ENABLED=true` and the `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION`, and `S3_PUBLIC_URL` variables shown in `backend/.env.example`.

The R2 bucket CORS policy must allow `PUT`, `GET`, and `HEAD` from the blog origin, allow the `Content-Type` header, and expose `ETag` so multipart uploads can be completed.
Interrupted multipart uploads retain their completed parts for up to six days.
Selecting the same local file again resumes the upload with fresh signed URLs.

## Checks

```bash
cd front && npm run typecheck && npm run build
cd backend && cargo fmt --all -- --check && cargo clippy --all-targets --locked -- -D warnings && cargo test --locked
```

Pushes to `main` are built and deployed by `.github/workflows/deploy.yml`.
Pull requests run the same build checks without deploying. Runtime boundaries
and rollback requirements are documented in [`ARCHITECTURE.md`](ARCHITECTURE.md).
