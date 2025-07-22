use crate::config::Settings;
use crate::models::{AiAssistRequest, AiAssistResponse, Message};
use crate::services::BlogService;
use crate::utils::{AppError, AppResult};
use reqwest::Client;
use serde_json::json;

pub struct AiService {
    settings: Settings,
    client: Client,
    blog_service: Option<BlogService>,
}

impl AiService {
    pub fn new(settings: Settings) -> Self {
        Self {
            settings,
            client: Client::new(),
            blog_service: None,
        }
    }

    pub fn with_blog_service(mut self, blog_service: BlogService) -> Self {
        self.blog_service = Some(blog_service);
        self
    }

    pub async fn generate_response(
        &self,
        message: &str,
        conversation_history: &[Message],
    ) -> AppResult<String> {
        // Get blog content for context (similar to the original implementation)
        let blog_content = self.retrieve_blog_content(message).await?;

        // Build conversation context
        let conversation_context = if !conversation_history.is_empty() {
            conversation_history
                .iter()
                .rev()
                .take(5) // Take last 5 messages
                .map(|msg| {
                    let role = if msg.is_user { "User" } else { "Assistant" };
                    format!("{}: {}", role, msg.content)
                })
                .collect::<Vec<_>>()
                .join("\n")
        } else {
            String::new()
        };

        // Build the full prompt (similar to the original implementation)
        let cyrus_context = r#"
You are Cyrus's AI assistant on his personal blog. You should:

1. **Be helpful and informative** about Cyrus's blog content, projects, and experiences
2. **Stay in character** as a knowledgeable assistant who knows about Cyrus's work
3. **Use the provided blog content** to answer questions accurately
4. **Be conversational and friendly** while maintaining professionalism
5. **If you don't know something**, admit it rather than making things up

About Cyrus:
- Undergraduate student at Southwest University of Science and Technology
- Passionate about coding, machine learning, game development
- Experienced in Golang programming, AI development, web scraping
- Interested in VSCode plugin development, quantitative trading, financial knowledge, and cybersecurity
- Loves exploring new technologies and sharing knowledge through his blog

Blog Content Context:
"#;

        let full_prompt = format!(
            "{}\n{}\n\nConversation History:\n{}\n\nUser Question: {}\n\nPlease provide a helpful response based on the blog content and context above. Keep your response concise but comprehensive and always be truthful about what content actually exists.",
            cyrus_context,
            blog_content,
            conversation_context,
            message
        );

        // Try to use Deepseek API if available
        if let Some(api_key) = &self.settings.ai.deepseek_api_key {
            match self.call_deepseek_api(api_key, &full_prompt).await {
                Ok(response) => return Ok(response),
                Err(e) => {
                    tracing::warn!(
                        "Deepseek API failed: {}, falling back to default response",
                        e
                    );
                }
            }
        }

        // Fallback response
        self.generate_fallback_response(message).await
    }

    pub async fn ai_assist(&self, request: AiAssistRequest) -> AppResult<AiAssistResponse> {
        let api_key = request
            .deepseek_api_key
            .or_else(|| self.settings.ai.deepseek_api_key.clone())
            .ok_or_else(|| AppError::validation("Deepseek API key not provided"))?;

        let model = request
            .deepseek_model
            .unwrap_or_else(|| "deepseek-chat".to_string());

        // Build prompt based on type
        let full_prompt = self.build_assist_prompt(&request.prompt, &request.prompt_type);

        let response = self.call_deepseek_api(&api_key, &full_prompt).await?;

        Ok(AiAssistResponse { content: response })
    }

    async fn retrieve_blog_content(&self, query: &str) -> AppResult<String> {
        if let Some(blog_service) = &self.blog_service {
            // Simple keyword-based search
            let search_results = blog_service
                .get_posts(Some(1), Some(5), Some(query.to_string()))
                .await?;

            if !search_results.posts.is_empty() {
                let content = search_results
                    .posts
                    .iter()
                    .map(|post| format!("Title: {}\nExcerpt: {}\n", post.title, post.excerpt))
                    .collect::<Vec<_>>()
                    .join("\n");

                return Ok(format!("Relevant blog posts:\n{}", content));
            }
        }

        Ok("No specific blog content found for this query.".to_string())
    }

    async fn call_deepseek_api(&self, api_key: &str, prompt: &str) -> AppResult<String> {
        let payload = json!({
            "model": "deepseek-chat",
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.7,
            "max_tokens": 500
        });

        let response = self
            .client
            .post(&self.settings.ai.deepseek_api_url)
            .header("Content-Type", "application/json")
            .header("Authorization", format!("Bearer {}", api_key))
            .json(&payload)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(AppError::internal(format!(
                "Deepseek API error: {}",
                error_text
            )));
        }

        let response_json: serde_json::Value = response.json().await?;

        let content = response_json
            .get("choices")
            .and_then(|choices| choices.get(0))
            .and_then(|choice| choice.get("message"))
            .and_then(|message| message.get("content"))
            .and_then(|content| content.as_str())
            .unwrap_or("Sorry, I couldn't generate a response.");

        Ok(content.to_string())
    }

    async fn generate_fallback_response(&self, message: &str) -> AppResult<String> {
        // Simple keyword-based fallback responses
        let message_lower = message.to_lowercase();

        let response = if message_lower.contains("hello") || message_lower.contains("hi") {
            "Hello! I'm Cyrus's AI assistant. I can help you learn about his blog posts, projects, and experiences. What would you like to know?"
        } else if message_lower.contains("project") {
            "Cyrus has worked on various projects including machine learning, game development, web scraping, and VSCode plugins. You can explore his blog posts to learn more about specific projects."
        } else if message_lower.contains("technology") || message_lower.contains("tech") {
            "Cyrus is passionate about many technologies including Golang, AI/ML, web development, and cybersecurity. Check out his blog posts for detailed insights!"
        } else {
            "I'm here to help you learn about Cyrus's blog content and projects. Could you be more specific about what you'd like to know?"
        };

        Ok(response.to_string())
    }

    fn build_assist_prompt(&self, prompt: &str, prompt_type: &str) -> String {
        match prompt_type {
            "blog_post" => format!("Write a blog post about: {}\n\nPlease create an engaging, informative blog post with proper structure including introduction, main content, and conclusion.", prompt),
            "technical" => format!("Provide technical explanation for: {}\n\nPlease explain this technical concept clearly with examples and practical applications.", prompt),
            "summary" => format!("Summarize the following: {}\n\nPlease provide a concise but comprehensive summary.", prompt),
            _ => prompt.to_string(),
        }
    }
}
