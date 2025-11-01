use async_openai::{
    config::OpenAIConfig,
    types::{CreateEmbeddingRequest, EmbeddingInput},
    Client,
};
use std::sync::Arc;
use tokio::sync::Semaphore;
use tracing::{debug, info};

/// Error types for embedding operations
#[derive(Debug, thiserror::Error)]
pub enum EmbeddingError {
    #[error("API error: {0}")]
    ApiError(String),

    #[error("Configuration error: {0}")]
    ConfigError(String),

    #[error("Invalid input: {0}")]
    InvalidInput(String),
}

/// Trait for embedding providers
#[async_trait::async_trait]
pub trait EmbeddingProvider: Send + Sync {
    /// Generate embeddings for a list of texts
    async fn embed(&self, texts: Vec<String>) -> Result<Vec<Vec<f32>>, EmbeddingError>;

    /// Get the dimension of the embeddings
    fn dimension(&self) -> usize;

    /// Get the model name
    fn model_name(&self) -> &str;
}

/// OpenAI embedding provider
pub struct OpenAIEmbeddings {
    client: Client<OpenAIConfig>,
    model: String,
    dimension: usize,
    /// Semaphore to limit concurrent requests
    semaphore: Arc<Semaphore>,
}

impl OpenAIEmbeddings {
    /// Create a new OpenAI embedding provider
    pub fn new(api_key: Option<String>, model: Option<String>) -> Result<Self, EmbeddingError> {
        let api_key = api_key
            .or_else(|| std::env::var("OPENAI_API_KEY").ok())
            .ok_or_else(|| {
                EmbeddingError::ConfigError(
                    "OPENAI_API_KEY not set and no API key provided".to_string(),
                )
            })?;

        let model = model.unwrap_or_else(|| "text-embedding-3-small".to_string());

        // Determine dimension based on model
        let dimension = match model.as_str() {
            "text-embedding-3-small" => 1536,
            "text-embedding-3-large" => 3072,
            "text-embedding-ada-002" => 1536,
            _ => 1536, // Default
        };

        let config = OpenAIConfig::new().with_api_key(api_key);
        let client = Client::with_config(config);

        // Limit concurrent requests to avoid rate limits
        let max_concurrent = std::env::var("OPENAI_MAX_CONCURRENT")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(10);

        info!(
            "Initialized OpenAI embeddings: model={}, dimension={}, max_concurrent={}",
            model, dimension, max_concurrent
        );

        Ok(Self {
            client,
            model,
            dimension,
            semaphore: Arc::new(Semaphore::new(max_concurrent)),
        })
    }

    /// Create from environment variables
    pub fn from_env() -> Result<Self, EmbeddingError> {
        let model = std::env::var("RAG_EMBEDDING_MODEL").ok();
        Self::new(None, model)
    }

    /// Embed texts in batches to avoid API limits
    async fn embed_batch(
        &self,
        texts: Vec<String>,
        batch_size: usize,
    ) -> Result<Vec<Vec<f32>>, EmbeddingError> {
        let mut all_embeddings = Vec::new();

        for chunk in texts.chunks(batch_size) {
            let _permit = self.semaphore.acquire().await.map_err(|e| {
                EmbeddingError::ApiError(format!("Failed to acquire semaphore: {}", e))
            })?;

            debug!("Embedding batch of {} texts", chunk.len());

            let request = CreateEmbeddingRequest {
                model: self.model.clone(),
                input: EmbeddingInput::StringArray(chunk.to_vec()),
                encoding_format: None,
                user: None,
                dimensions: None,
            };

            let response = self
                .client
                .embeddings()
                .create(request)
                .await
                .map_err(|e| EmbeddingError::ApiError(format!("OpenAI API error: {}", e)))?;

            for embedding_data in response.data {
                all_embeddings.push(embedding_data.embedding);
            }
        }

        Ok(all_embeddings)
    }
}

#[async_trait::async_trait]
impl EmbeddingProvider for OpenAIEmbeddings {
    async fn embed(&self, texts: Vec<String>) -> Result<Vec<Vec<f32>>, EmbeddingError> {
        if texts.is_empty() {
            return Ok(Vec::new());
        }

        info!("Generating embeddings for {} texts", texts.len());

        // OpenAI has a limit of ~8000 tokens per request, so batch accordingly
        // Assuming average of 100 tokens per text, batch size of 50 should be safe
        let batch_size = 50;

        self.embed_batch(texts, batch_size).await
    }

    fn dimension(&self) -> usize {
        self.dimension
    }

    fn model_name(&self) -> &str {
        &self.model
    }
}

/// Factory for creating embedding providers
pub struct EmbeddingFactory;

impl EmbeddingFactory {
    /// Create an embedding provider from environment variables
    pub fn from_env() -> Result<Arc<dyn EmbeddingProvider>, EmbeddingError> {
        let engine = std::env::var("RAG_EMBEDDING_ENGINE")
            .unwrap_or_else(|_| "openai".to_string())
            .to_lowercase();

        info!("Creating embedding provider: {}", engine);

        match engine.as_str() {
            "openai" => {
                let provider = OpenAIEmbeddings::from_env()?;
                Ok(Arc::new(provider))
            }
            _ => Err(EmbeddingError::ConfigError(format!(
                "Unsupported embedding engine: {}. Supported: openai",
                engine
            ))),
        }
    }

    /// Create an OpenAI embedding provider with custom configuration
    pub fn create_openai(
        api_key: Option<String>,
        model: Option<String>,
    ) -> Result<Arc<dyn EmbeddingProvider>, EmbeddingError> {
        let provider = OpenAIEmbeddings::new(api_key, model)?;
        Ok(Arc::new(provider))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore] // Requires API key
    async fn test_openai_embeddings() {
        let provider = OpenAIEmbeddings::from_env().unwrap();
        let texts = vec!["Hello world".to_string(), "Test embedding".to_string()];

        let embeddings = provider.embed(texts).await.unwrap();

        assert_eq!(embeddings.len(), 2);
        assert_eq!(embeddings[0].len(), provider.dimension());
    }

    #[test]
    fn test_embedding_dimension() {
        // Test without making API calls
        let provider = OpenAIEmbeddings::new(
            Some("test_key".to_string()),
            Some("text-embedding-3-small".to_string()),
        )
        .unwrap();

        assert_eq!(provider.dimension(), 1536);
        assert_eq!(provider.model_name(), "text-embedding-3-small");
    }
}
