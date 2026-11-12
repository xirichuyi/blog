-- 加密文章：password_hash 非空表示需要访问密码才能读取正文。
-- 可空列对旧版二进制兼容（旧版 INSERT/SELECT 不涉及该列）。
ALTER TABLE posts ADD COLUMN password_hash TEXT;
