use sqlx::{
    postgres::{PgConnectOptions, PgPoolOptions},
    PgPool,
};
use std::str::FromStr;
use std::time::Duration;

#[derive(Clone)]
pub struct Database {
    pub pool: PgPool,
}

impl Database {
    pub async fn new(database_url: &str) -> anyhow::Result<Self> {
        let connect_options = PgConnectOptions::from_str(database_url)?;

        let pool = PgPoolOptions::new()
            .max_connections(10)
            .min_connections(1)
            .acquire_timeout(Duration::from_secs(30))
            .idle_timeout(Duration::from_secs(600))
            .max_lifetime(Duration::from_secs(3600))
            .connect_with(connect_options)
            .await?;

        Ok(Database { pool })
    }

    pub async fn run_migrations(&self) -> anyhow::Result<()> {
        // Run PostgreSQL migrations in order
        let migrations = vec![
            include_str!("../migrations/postgres/001_initial.sql"),
            include_str!("../migrations/postgres/002_add_missing_columns.sql"),
            include_str!("../migrations/postgres/003_add_config_table.sql"),
            include_str!("../migrations/postgres/004_add_channel_messages.sql"),
            include_str!("../migrations/postgres/005_add_note_feedback_tables.sql"),
        ];
        
        for (idx, migration_sql) in migrations.iter().enumerate() {
            tracing::info!("Running migration {}", idx + 1);
            
            // Split SQL by semicolons and execute each statement separately
            for statement in migration_sql.split(';') {
                let trimmed = statement.trim();
                if !trimmed.is_empty() && !trimmed.starts_with("--") {
                    match sqlx::query(trimmed).execute(&self.pool).await {
                        Ok(_) => {},
                        Err(e) => {
                            // Log error but continue if it's a "already exists" error
                            if e.to_string().contains("already exists") {
                                tracing::debug!("Skipping existing object in migration {}: {}", idx + 1, e);
                            } else {
                                tracing::warn!("Error in migration {} statement: {} - Error: {}", idx + 1, trimmed, e);
                            }
                        }
                    }
                }
            }
        }

        tracing::info!("All migrations completed");
        Ok(())
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    // User methods
    pub async fn get_user_by_id(&self, user_id: &str) -> Result<crate::models::user::User, sqlx::Error> {
        let user: crate::models::user::User = sqlx::query_as(
            r#"
            SELECT id, name, email, username, role, profile_image_url, bio, gender, 
                   date_of_birth, info, settings,
                   api_key, oauth_sub, last_active_at, updated_at, created_at
            FROM "user" 
            WHERE id = $1
            "#
        )
        .bind(user_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(user)
    }

    pub async fn get_all_users(&self) -> Result<Vec<crate::models::user::User>, sqlx::Error> {
        let users: Vec<crate::models::user::User> = sqlx::query_as(
            r#"
            SELECT id, name, email, username, role, profile_image_url, bio, gender, 
                   date_of_birth, info, settings,
                   api_key, oauth_sub, last_active_at, updated_at, created_at
            FROM "user"
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(users)
    }

    // Group methods
    pub async fn get_group_by_id(&self, group_id: &str) -> Result<crate::models::group::Group, sqlx::Error> {
        let group: crate::models::group::Group = sqlx::query_as(
            r#"
            SELECT id, user_id, name, description, 
                   permissions, user_ids, meta, created_at, updated_at
            FROM "group" 
            WHERE id = $1
            "#
        )
        .bind(group_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(group)
    }

    pub async fn get_all_groups(&self) -> Result<Vec<crate::models::group::Group>, sqlx::Error> {
        let groups: Vec<crate::models::group::Group> = sqlx::query_as(
            r#"
            SELECT id, user_id, name, description, 
                   permissions, user_ids, meta, created_at, updated_at
            FROM "group"
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(groups)
    }

    // Model methods
    pub async fn get_model_by_id(&self, model_id: &str) -> Result<crate::models::model::Model, sqlx::Error> {
        let model: crate::models::model::Model = sqlx::query_as(
            r#"
            SELECT id, user_id, base_model_id, name, 
                   params, meta, access_control,
                   is_active, created_at, updated_at
            FROM model 
            WHERE id = $1
            "#
        )
        .bind(model_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(model)
    }

    pub async fn get_all_models(&self) -> Result<Vec<crate::models::model::Model>, sqlx::Error> {
        let models: Vec<crate::models::model::Model> = sqlx::query_as(
            r#"
            SELECT id, user_id, base_model_id, name, 
                   params, meta, access_control,
                   is_active, created_at, updated_at
            FROM model
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(models)
    }
}
