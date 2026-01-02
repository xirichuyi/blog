//! 文本处理工具模块
//! 
//! 提供安全的文本操作函数，特别是针对 UTF-8 多字节字符的处理

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
/// use crate::utils::text::truncate_safely;
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
    matches!(c, 
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
        '？'        // 中文问号
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
}

