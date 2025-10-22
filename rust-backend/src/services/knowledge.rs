use crate::db::Database;
use crate::error::{AppError, AppResult};
use crate::models::knowledge::Knowledge;
use crate::utils::time::current_timestamp_seconds;

#[allow(dead_code)]
pub struct KnowledgeService<'a> {
    db: &'a Database,
}

#[allow(dead_code)]
impl<'a> KnowledgeService<'a> {
    pub fn new(db: &'a Database) -> Self {
        KnowledgeService { db }
    }

    pub async fn create_knowledge(
        &self,
        id: &str,
        user_id: &str,
        name: &str,
        description: Option<&str>,
        data: Option<serde_json::Value>,
    ) -> AppResult<Knowledge> {
        let now = current_timestamp_seconds();
        let data_str = data
            .as_ref()
            .map(|v| serde_json::to_string(v).unwrap_or_else(|_| "{}".to_string()));

        sqlx::query(
            r#"
            INSERT INTO knowledge (id, user_id, name, description, data, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(id)
        .bind(user_id)
        .bind(name)
        .bind(description)
        .bind(&data_str)
        .bind(now)
        .bind(now)
        .execute(&self.db.pool)
        .await?;

        self.get_knowledge_by_id(id)
            .await?
            .ok_or_else(|| AppError::InternalServerError("Failed to create knowledge".to_string()))
    }

    pub async fn get_knowledge_by_id(&self, id: &str) -> AppResult<Option<Knowledge>> {
        let result = sqlx::query_as::<_, Knowledge>(
            r#"
            SELECT id, user_id, name, description, data, meta, access_control, created_at, updated_at
            FROM knowledge
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.db.pool)
        .await?;

        Ok(result)
    }

    pub async fn get_knowledge_by_user_id(&self, user_id: &str) -> AppResult<Vec<Knowledge>> {
        let knowledge = sqlx::query_as::<_, Knowledge>(
            r#"
            SELECT id, user_id, name, description, data, meta, access_control, created_at, updated_at
            FROM knowledge
            WHERE user_id = $1
            ORDER BY updated_at DESC
            "#,
        )
        .bind(user_id)
        .fetch_all(&self.db.pool)
        .await?;

        Ok(knowledge)
    }

    pub async fn get_all_knowledge(&self) -> AppResult<Vec<Knowledge>> {
        let knowledge = sqlx::query_as::<_, Knowledge>(
            r#"
            SELECT id, user_id, name, description, data, meta, access_control, created_at, updated_at
            FROM knowledge
            ORDER BY updated_at DESC
            "#,
        )
        .fetch_all(&self.db.pool)
        .await?;

        Ok(knowledge)
    }

    pub async fn update_knowledge(
        &self,
        id: &str,
        name: Option<&str>,
        description: Option<&str>,
        data: Option<serde_json::Value>,
    ) -> AppResult<Knowledge> {
        let now = current_timestamp_seconds();

        let mut query_parts = vec!["UPDATE knowledge SET updated_at = $2"];
        let mut bind_values: Vec<String> = vec![now.to_string()];

        if let Some(name) = name {
            query_parts.push("name = $1");
            bind_values.push(name.to_string());
        }
        if let Some(description) = description {
            query_parts.push("description = ?");
            bind_values.push(description.to_string());
        }
        if let Some(data) = data {
            query_parts.push("data = ?");
            bind_values.push(serde_json::to_string(&data).unwrap());
        }

        let query_str = format!("{} WHERE id = $1", query_parts.join(", "));

        let mut query = sqlx::query(&query_str);
        for value in bind_values {
            query = query.bind(value);
        }
        query = query.bind(id);

        query.execute(&self.db.pool).await?;

        self.get_knowledge_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound("Knowledge not found".to_string()))
    }

    pub async fn delete_knowledge(&self, id: &str) -> AppResult<()> {
        sqlx::query("DELETE FROM knowledge WHERE id = $1")
            .bind(id)
            .execute(&self.db.pool)
            .await?;

        Ok(())
    }

    pub async fn delete_knowledge_by_user_id(&self, user_id: &str) -> AppResult<()> {
        sqlx::query("DELETE FROM knowledge WHERE user_id = $1")
            .bind(user_id)
            .execute(&self.db.pool)
            .await?;

        Ok(())
    }
}
