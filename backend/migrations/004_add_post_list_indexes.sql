-- Cover the public archive and adjacent-post ordering with one composite index.
CREATE INDEX IF NOT EXISTS idx_posts_status_created_id
ON posts(status, created_at DESC, id DESC);
