use regex::Regex;

pub fn slugify(text: &str) -> String {
    // Convert to lowercase
    let mut slug = text.to_lowercase();
    
    // Replace spaces and special characters with hyphens
    let re = Regex::new(r"[^a-z0-9\-]").unwrap();
    slug = re.replace_all(&slug, "-").to_string();
    
    // Replace multiple consecutive hyphens with single hyphen
    let re = Regex::new(r"-+").unwrap();
    slug = re.replace_all(&slug, "-").to_string();
    
    // Remove leading and trailing hyphens
    slug = slug.trim_matches('-').to_string();
    
    // Ensure slug is not empty
    if slug.is_empty() {
        slug = "untitled".to_string();
    }
    
    slug
}

pub fn ensure_unique_slug(base_slug: &str, existing_slugs: &[String]) -> String {
    let mut slug = base_slug.to_string();
    let mut counter = 1;
    
    while existing_slugs.contains(&slug) {
        slug = format!("{}-{}", base_slug, counter);
        counter += 1;
    }
    
    slug
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_slugify() {
        assert_eq!(slugify("Hello World"), "hello-world");
        assert_eq!(slugify("Hello, World!"), "hello-world");
        assert_eq!(slugify("Multiple   Spaces"), "multiple-spaces");
        assert_eq!(slugify("Special@#$Characters"), "special-characters");
        assert_eq!(slugify(""), "untitled");
        assert_eq!(slugify("---"), "untitled");
    }

    #[test]
    fn test_ensure_unique_slug() {
        let existing = vec!["hello-world".to_string(), "hello-world-1".to_string()];
        assert_eq!(ensure_unique_slug("hello-world", &existing), "hello-world-2");
        assert_eq!(ensure_unique_slug("new-post", &existing), "new-post");
    }
}
