use crate::config::Config;
use crate::error::{AppError, AppResult};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tracing::warn;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Model {
    pub id: String,
    pub name: Option<String>,
    pub object: String,
    pub created: i64,
    pub owned_by: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub info: Option<ModelInfo>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pipeline: Option<PipelineInfo>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<Tag>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub arena: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub meta: Option<ModelMeta>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub params: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelMeta {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub capabilities: Option<ModelCapabilities>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<Tag>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub knowledge: Option<Vec<KnowledgeItem>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub profile_image_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelCapabilities {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vision: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub usage: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeItem {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub collection_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub collection_names: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub legacy: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineInfo {
    #[serde(rename = "type")]
    pub pipeline_type: Option<String>,
    pub priority: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub name: String,
}

pub struct ModelService {
    client: Client,
    config: Config,
}

impl ModelService {
    pub fn new(config: Config) -> Self {
        Self {
            client: Client::new(),
            config,
        }
    }

    /// Fetch all models from all configured backends
    pub async fn get_all_models(&self) -> AppResult<Vec<Model>> {
        let mut all_models = Vec::new();

        // Fetch OpenAI models
        if self.config.enable_openai_api {
            match self.fetch_openai_models().await {
                Ok(models) => all_models.extend(models),
                Err(e) => warn!("Failed to fetch OpenAI models: {}", e),
            }
        }

        // Fetch function/pipeline models
        match self.fetch_function_models().await {
            Ok(models) => all_models.extend(models),
            Err(e) => warn!("Failed to fetch function models: {}", e),
        }

        Ok(all_models)
    }

    /// Fetch base models (without applying filters or arena models)
    pub async fn get_all_base_models(&self) -> AppResult<Vec<Model>> {
        let mut base_models = Vec::new();

        // Fetch OpenAI models
        if self.config.enable_openai_api {
            match self.fetch_openai_models().await {
                Ok(models) => base_models.extend(models),
                Err(e) => warn!("Failed to fetch OpenAI models: {}", e),
            }
        }

        // Fetch function models
        match self.fetch_function_models().await {
            Ok(models) => base_models.extend(models),
            Err(e) => warn!("Failed to fetch function models: {}", e),
        }

        Ok(base_models)
    }

    /// Fetch models from OpenAI-compatible API endpoints
    async fn fetch_openai_models(&self) -> AppResult<Vec<Model>> {
        let mut all_models = Vec::new();

        for (idx, base_url) in self.config.openai_api_base_urls.iter().enumerate() {
            let api_key = self
                .config
                .openai_api_keys
                .get(idx)
                .cloned()
                .unwrap_or_default();

            let api_config = self
                .config
                .openai_api_configs
                .get(&idx.to_string())
                .or_else(|| self.config.openai_api_configs.get(base_url))
                .and_then(|v| v.as_object())
                .cloned();

            match self
                .fetch_models_from_endpoint(base_url, &api_key, api_config.as_ref())
                .await
            {
                Ok(mut models) => {
                    // Add urlIdx to each model for backend routing
                    for model in &mut models {
                        if let Some(info) = &mut model.info {
                            if let Some(_meta) = &mut info.meta {
                                // Store the URL index for routing
                            }
                        } else {
                            model.info = Some(ModelInfo {
                                meta: Some(ModelMeta {
                                    description: None,
                                    capabilities: None,
                                    tags: None,
                                    knowledge: None,
                                    profile_image_url: None,
                                }),
                                params: Some(json!({ "urlIdx": idx })),
                            });
                        }
                    }
                    all_models.extend(models);
                }
                Err(e) => {
                    warn!("Failed to fetch models from {}: {}", base_url, e);
                }
            }
        }

        Ok(all_models)
    }

    /// Fetch models from a single OpenAI-compatible endpoint
    async fn fetch_models_from_endpoint(
        &self,
        base_url: &str,
        api_key: &str,
        config: Option<&serde_json::Map<String, Value>>,
    ) -> AppResult<Vec<Model>> {
        let is_azure = config
            .and_then(|c| c.get("azure"))
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        let url = if is_azure {
            let api_version = config
                .and_then(|c| c.get("api_version"))
                .and_then(|v| v.as_str())
                .unwrap_or("2023-05-15");
            format!("{}/models?api-version={}", base_url, api_version)
        } else {
            format!("{}/models", base_url)
        };

        let mut request = self.client.get(&url);

        // Add authentication based on config
        if is_azure {
            let auth_type = config
                .and_then(|c| c.get("auth_type"))
                .and_then(|v| v.as_str())
                .unwrap_or("bearer");

            match auth_type {
                "azure_ad" | "microsoft_entra_id" => {
                    // Azure AD authentication - handled separately
                    // For now, skip auth header
                }
                _ => {
                    // Default: API key authentication
                    request = request.header("api-key", api_key);
                }
            }
        } else {
            // Standard Bearer token for OpenAI and compatible APIs
            if !api_key.is_empty() {
                request = request.header("Authorization", format!("Bearer {}", api_key));
            }
        }

        let response = request.send().await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::ExternalServiceError(format!(
                "Failed to fetch models: {} - {}",
                status, error_text
            )));
        }

        let response_data: Value = response.json().await?;

        let models: Vec<Model> = response_data
            .get("data")
            .and_then(|d| d.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| {
                        let id = v.get("id")?.as_str()?;
                        Some(Model {
                            id: id.to_string(),
                            name: v.get("name").and_then(|n| n.as_str().map(|s| s.to_string())),
                            object: v
                                .get("object")
                                .and_then(|o| o.as_str())
                                .unwrap_or("model")
                                .to_string(),
                            created: v.get("created").and_then(|c| c.as_i64()).unwrap_or(0),
                            owned_by: v
                                .get("owned_by")
                                .and_then(|o| o.as_str())
                                .unwrap_or("openai")
                                .to_string(),
                            info: None,
                            pipeline: None,
                            tags: None,
                            arena: None,
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();

        Ok(models)
    }

    /// Fetch function/pipeline models from database
    async fn fetch_function_models(&self) -> AppResult<Vec<Model>> {
        // TODO: Implement fetching functions from database and converting them to models
        // For now, return empty vector
        // This would need to query the `function` table and convert each function
        // with type="pipe" into a Model
        Ok(Vec::new())
    }

    /// Get model by ID
    pub async fn get_model_by_id(&self, model_id: &str) -> AppResult<Option<Model>> {
        let all_models = self.get_all_models().await?;
        Ok(all_models.into_iter().find(|m| m.id == model_id))
    }

    /// Check if user has access to a model
    pub fn check_model_access(
        &self,
        _model: &Model,
        _user_id: &str,
        _user_role: &str,
    ) -> bool {
        // TODO: Implement model access control based on user permissions
        // For now, allow all access
        true
    }

    /// Filter models based on user access
    pub fn filter_models_by_access(
        &self,
        models: Vec<Model>,
        _user_id: &str,
        _user_role: &str,
    ) -> Vec<Model> {
        // TODO: Implement filtering based on:
        // - Model access controls
        // - User roles and permissions
        // - Model visibility settings
        
        // Filter out filter pipelines from the results
        models
            .into_iter()
            .filter(|m| {
                if let Some(pipeline) = &m.pipeline {
                    pipeline.pipeline_type.as_deref() != Some("filter")
                } else {
                    true
                }
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_model_service_creation() {
        let config = Config::default();
        let service = ModelService::new(config);
        assert!(service.config.openai_api_base_urls.is_empty());
    }
}

