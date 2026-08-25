-- Remove features that belonged to the retired local-file backend.
DROP TABLE IF EXISTS music;
DROP TABLE IF EXISTS downloads;
DROP TABLE IF EXISTS pdf_documents;

-- Article PDFs used the old local upload API. Book PDFs remain in book_files
-- and are stored in R2.
ALTER TABLE posts DROP COLUMN pdf_url;

-- R2 objects used by the public reader are public by definition. The old
-- download switch could not enforce access and was therefore misleading.
ALTER TABLE books DROP COLUMN download_enabled;
