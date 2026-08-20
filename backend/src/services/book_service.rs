use crate::database::Database;
use crate::models::{
    Book, BookFile, BookRecord, CreateBookFile, CreateBookRequest, UpdateBookRequest,
};
use crate::utils::error::{AppError, Result};
use crate::utils::FileHandler;
use std::sync::Arc;

const BOOK_COLUMNS: &str = "id, title, author, description, cover_url, reading_status, progress, rating, notes, started_at, finished_at, is_public, download_enabled, created_at, updated_at";
const VALID_READING_STATUSES: &[&str] = &["want_to_read", "reading", "finished", "paused"];

pub struct BookService {
    database: Database,
    file_handler: Arc<FileHandler>,
}

impl BookService {
    pub fn new(database: Database, file_handler: Arc<FileHandler>) -> Self {
        Self {
            database,
            file_handler,
        }
    }

    pub async fn list_public(&self) -> Result<Vec<Book>> {
        self.list(true).await
    }

    pub async fn list_admin(&self) -> Result<Vec<Book>> {
        self.list(false).await
    }

    async fn list(&self, public_only: bool) -> Result<Vec<Book>> {
        let sql = if public_only {
            format!("SELECT {BOOK_COLUMNS} FROM books WHERE is_public = 1 ORDER BY updated_at DESC, id DESC")
        } else {
            format!("SELECT {BOOK_COLUMNS} FROM books ORDER BY updated_at DESC, id DESC")
        };
        let records = sqlx::query_as::<_, BookRecord>(&sql)
            .fetch_all(self.database.pool())
            .await?;
        let mut books = Vec::with_capacity(records.len());
        for record in records {
            books.push(self.with_files(record, public_only).await?);
        }
        Ok(books)
    }

    pub async fn get(&self, id: i64, public_only: bool) -> Result<Book> {
        let sql = if public_only {
            format!("SELECT {BOOK_COLUMNS} FROM books WHERE id = ? AND is_public = 1")
        } else {
            format!("SELECT {BOOK_COLUMNS} FROM books WHERE id = ?")
        };
        let record = sqlx::query_as::<_, BookRecord>(&sql)
            .bind(id)
            .fetch_optional(self.database.pool())
            .await?
            .ok_or_else(|| AppError::NotFound("Book not found".to_string()))?;
        self.with_files(record, public_only).await
    }

    async fn with_files(&self, record: BookRecord, public_only: bool) -> Result<Book> {
        let files = if public_only && !record.download_enabled {
            Vec::new()
        } else {
            sqlx::query_as::<_, BookFile>(
                "SELECT id, book_id, format, file_url, r2_key, file_name, file_size, mime_type, created_at FROM book_files WHERE book_id = ? ORDER BY id",
            )
            .bind(record.id)
            .fetch_all(self.database.pool())
            .await?
        };
        Ok(Book { record, files })
    }

    pub async fn create(&self, request: CreateBookRequest) -> Result<Book> {
        validate_book(
            &request.title,
            &request.reading_status,
            request.progress,
            request.rating,
        )?;
        let result = sqlx::query(
            "INSERT INTO books (title, author, description, cover_url, reading_status, progress, rating, notes, started_at, finished_at, is_public, download_enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(request.title.trim())
        .bind(request.author.trim())
        .bind(request.description)
        .bind(request.cover_url)
        .bind(request.reading_status)
        .bind(request.progress)
        .bind(request.rating)
        .bind(request.notes)
        .bind(request.started_at)
        .bind(request.finished_at)
        .bind(request.is_public)
        .bind(request.download_enabled)
        .execute(self.database.pool())
        .await?;
        self.get(result.last_insert_rowid(), false).await
    }

    pub async fn update(&self, id: i64, request: UpdateBookRequest) -> Result<Book> {
        let current = self.get(id, false).await?.record;
        let title = request.title.unwrap_or(current.title);
        let reading_status = request.reading_status.unwrap_or(current.reading_status);
        let progress = request.progress.unwrap_or(current.progress);
        let rating = request.rating.unwrap_or(current.rating);
        validate_book(&title, &reading_status, progress, rating)?;
        sqlx::query(
            "UPDATE books SET title = ?, author = ?, description = ?, cover_url = ?, reading_status = ?, progress = ?, rating = ?, notes = ?, started_at = ?, finished_at = ?, is_public = ?, download_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        )
        .bind(title.trim())
        .bind(request.author.unwrap_or(current.author))
        .bind(request.description.unwrap_or(current.description))
        .bind(request.cover_url.unwrap_or(current.cover_url))
        .bind(reading_status)
        .bind(progress)
        .bind(rating)
        .bind(request.notes.unwrap_or(current.notes))
        .bind(request.started_at.unwrap_or(current.started_at))
        .bind(request.finished_at.unwrap_or(current.finished_at))
        .bind(request.is_public.unwrap_or(current.is_public))
        .bind(request.download_enabled.unwrap_or(current.download_enabled))
        .bind(id)
        .execute(self.database.pool())
        .await?;
        self.get(id, false).await
    }

    pub async fn delete(&self, id: i64) -> Result<()> {
        let book = self.get(id, false).await?;
        for file in &book.files {
            self.file_handler.delete_file(&file.file_url).await?;
        }
        sqlx::query("DELETE FROM books WHERE id = ?")
            .bind(id)
            .execute(self.database.pool())
            .await?;
        Ok(())
    }

    pub async fn add_file(&self, file: CreateBookFile) -> Result<BookFile> {
        self.get(file.book_id, false).await?;
        let result = sqlx::query(
            "INSERT INTO book_files (book_id, format, file_url, r2_key, file_name, file_size, mime_type) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(file.book_id)
        .bind(file.format)
        .bind(file.file_url)
        .bind(file.r2_key)
        .bind(file.file_name)
        .bind(file.file_size)
        .bind(file.mime_type)
        .execute(self.database.pool())
        .await?;
        sqlx::query_as::<_, BookFile>(
            "SELECT id, book_id, format, file_url, r2_key, file_name, file_size, mime_type, created_at FROM book_files WHERE id = ?",
        )
        .bind(result.last_insert_rowid())
        .fetch_one(self.database.pool())
        .await
        .map_err(Into::into)
    }

    pub async fn delete_file(&self, file_id: i64) -> Result<()> {
        let file = sqlx::query_as::<_, BookFile>(
            "SELECT id, book_id, format, file_url, r2_key, file_name, file_size, mime_type, created_at FROM book_files WHERE id = ?",
        )
        .bind(file_id)
        .fetch_optional(self.database.pool())
        .await?
        .ok_or_else(|| AppError::NotFound("Book file not found".to_string()))?;
        self.file_handler.delete_file(&file.file_url).await?;
        sqlx::query("DELETE FROM book_files WHERE id = ?")
            .bind(file_id)
            .execute(self.database.pool())
            .await?;
        Ok(())
    }
}

fn validate_book(title: &str, status: &str, progress: i64, rating: Option<i64>) -> Result<()> {
    if title.trim().is_empty() {
        return Err(AppError::BadRequest("Book title is required".to_string()));
    }
    if !VALID_READING_STATUSES.contains(&status) {
        return Err(AppError::BadRequest("Invalid reading status".to_string()));
    }
    if !(0..=100).contains(&progress) {
        return Err(AppError::BadRequest(
            "Progress must be between 0 and 100".to_string(),
        ));
    }
    if rating.is_some_and(|value| !(1..=5).contains(&value)) {
        return Err(AppError::BadRequest(
            "Rating must be between 1 and 5".to_string(),
        ));
    }
    Ok(())
}
