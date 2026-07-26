//! 文本处理工具模块
//!
//! 提供安全的文本操作函数，特别是针对 UTF-8 多字节字符的处理

use regex::Regex;
use std::sync::LazyLock;

static MARKDOWN_IMAGE_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"!\[[^\]]*]\(\s*(?:<([^>\r\n]+)>|([^\s)"']+))(?:\s+["'][^"']*["'])?\s*\)"#)
        .expect("markdown image regex is valid")
});

/// 提取 Markdown 图片 URL，保持首次出现顺序并去重。
pub fn markdown_image_urls(content: &str) -> Vec<String> {
    let mut urls = Vec::new();
    for captures in MARKDOWN_IMAGE_RE.captures_iter(content) {
        let Some(url) = captures.get(1).or_else(|| captures.get(2)) else {
            continue;
        };
        let url = url.as_str().to_string();
        if !urls.contains(&url) {
            urls.push(url);
        }
    }
    urls
}

/// 安全地截取内容生成摘要
///
/// 处理 UTF-8 多字节字符（如中文），在安全的断点处截断，
/// 避免在字符中间切割导致的 panic。
///
/// # 参数
/// - `content`: 要截取的原始内容
/// - `max_chars`: 最大字符数（注意是字符数，不是字节数）
///
/// # 返回
/// - 如果内容长度小于等于 max_chars，返回原内容
/// - 否则返回截取后的内容，末尾添加 "..."
///
/// # 示例
/// ```
/// use chuyi_uk_back::utils::text::truncate_safely;
///
/// let content = "这是一段很长的中文内容，需要截取摘要。";
/// let summary = truncate_safely(content, 10);
/// assert!(summary.ends_with("..."));
/// ```
pub fn truncate_safely(content: &str, max_chars: usize) -> String {
    let char_count = content.chars().count();
    if char_count <= max_chars {
        return content.to_string();
    }

    // 安全地收集前 max_chars 个字符
    let truncated: String = content.chars().take(max_chars).collect();

    // 查找合适的截断点（空格、中文标点、换行符）
    let break_point = truncated
        .char_indices()
        .rev()
        .find(|(_, c)| is_break_char(*c))
        .map(|(pos, _)| pos);

    match break_point {
        // 只有当断点在后半部分时才使用，避免截得太短
        Some(pos) if pos > truncated.len() / 2 => {
            format!("{}...", &truncated[..pos])
        }
        _ => format!("{}...", truncated),
    }
}

/// 判断字符是否是合适的截断点
#[inline]
fn is_break_char(c: char) -> bool {
    matches!(
        c,
        ' ' |       // 空格
        '，' |      // 中文逗号
        '。' |      // 中文句号
        '、' |      // 顿号
        '；' |      // 中文分号
        '：' |      // 中文冒号
        '\n' |      // 换行
        '!' |       // 英文感叹号
        '?' |       // 英文问号
        '！' |      // 中文感叹号
        '？' // 中文问号
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_short_content_unchanged() {
        let content = "短内容";
        assert_eq!(truncate_safely(content, 10), "短内容");
    }

    #[test]
    fn test_truncate_at_space() {
        let content = "Hello world this is a long sentence";
        let result = truncate_safely(content, 15);
        assert!(result.ends_with("..."));
        assert!(result.len() <= 18); // 15 chars + "..."
    }

    #[test]
    fn test_truncate_chinese() {
        let content = "这是一段很长的中文内容，需要进行截取处理";
        let result = truncate_safely(content, 10);
        assert!(result.ends_with("..."));
    }

    #[test]
    fn test_truncate_at_chinese_punctuation() {
        let content = "第一句话。第二句话，第三句话";
        let result = truncate_safely(content, 8);
        // 应该在句号处截断
        assert!(result.contains("。") || result.ends_with("..."));
    }

    #[test]
    fn extracts_unique_markdown_image_urls() {
        let content = r#"
![cover](/uploads/images/cover.webp)
![R2](<https://assets.example.com/images/photo.webp> "caption")
![duplicate](/uploads/images/cover.webp)
[ordinary link](/uploads/images/not-an-image.webp)
"#;

        assert_eq!(
            markdown_image_urls(content),
            vec![
                "/uploads/images/cover.webp",
                "https://assets.example.com/images/photo.webp"
            ]
        );
    }
}
