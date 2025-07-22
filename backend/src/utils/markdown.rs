use pulldown_cmark::{html, Options, Parser};

pub fn markdown_to_html(markdown: &str) -> String {
    let mut options = Options::empty();
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_FOOTNOTES);
    options.insert(Options::ENABLE_TASKLISTS);
    options.insert(Options::ENABLE_SMART_PUNCTUATION);

    let parser = Parser::new_ext(markdown, options);
    let mut html_output = String::new();
    html::push_html(&mut html_output, parser);
    html_output
}

pub fn extract_excerpt(content: &str, max_length: usize) -> String {
    // Remove markdown formatting for excerpt
    let plain_text = strip_markdown(content);
    
    if plain_text.len() <= max_length {
        plain_text
    } else {
        let truncated = &plain_text[..max_length];
        // Try to break at word boundary
        if let Some(last_space) = truncated.rfind(' ') {
            format!("{}...", &truncated[..last_space])
        } else {
            format!("{}...", truncated)
        }
    }
}

fn strip_markdown(markdown: &str) -> String {
    // Simple markdown stripping - remove common markdown syntax
    let text = markdown
        .lines()
        .map(|line| {
            let line = line.trim();
            // Skip headers, code blocks, etc.
            if line.starts_with('#') || line.starts_with("```") || line.starts_with("---") {
                ""
            } else {
                line
            }
        })
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join(" ");
    
    // Remove inline markdown
    let text = regex::Regex::new(r"\*\*(.*?)\*\*").unwrap().replace_all(&text, "$1");
    let text = regex::Regex::new(r"\*(.*?)\*").unwrap().replace_all(&text, "$1");
    let text = regex::Regex::new(r"`(.*?)`").unwrap().replace_all(&text, "$1");
    let text = regex::Regex::new(r"\[(.*?)\]\(.*?\)").unwrap().replace_all(&text, "$1");
    
    text.to_string()
}
