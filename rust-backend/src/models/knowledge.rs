use serde::{Deserialize, Serialize};
use sqlx::types::JsonValue;
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[allow(dead_code)]
pub struct Knowledge {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub description: Option<String>,
    #[sqlx(json)]
    pub data: Option<JsonValue>,
    #[sqlx(json)]
    pub meta: Option<JsonValue>,
    #[sqlx(json)]
    pub access_control: Option<JsonValue>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct CreateKnowledgeRequest {
    pub name: String,
    pub description: Option<String>,
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct KnowledgeResponse {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub description: Option<String>,
    pub data: Option<JsonValue>,
    pub meta: Option<JsonValue>,
    pub access_control: Option<JsonValue>,
    pub created_at: i64,
    pub updated_at: i64,
}

impl From<Knowledge> for KnowledgeResponse {
    fn from(knowledge: Knowledge) -> Self {
        KnowledgeResponse {
            id: knowledge.id,
            user_id: knowledge.user_id,
            name: knowledge.name,
            description: knowledge.description,
            data: knowledge.data,
            meta: knowledge.meta,
            access_control: knowledge.access_control,
            created_at: knowledge.created_at,
            updated_at: knowledge.updated_at,
        }
    }
}
