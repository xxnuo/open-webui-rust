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
        // First, ensure the database exists
        Self::ensure_database_exists(database_url).await?;

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

    async fn ensure_database_exists(database_url: &str) -> anyhow::Result<()> {
        // Parse the database URL to extract database name and connection info
        let parsed_url = url::Url::parse(database_url)?;
        let db_name = parsed_url.path().trim_start_matches('/');
        
        if db_name.is_empty() {
            return Err(anyhow::anyhow!("Database name not specified in DATABASE_URL"));
        }

        // Create connection URL to postgres database (default database)
        let mut default_url = parsed_url.clone();
        default_url.set_path("/postgres");
        
        tracing::info!("Checking if database '{}' exists...", db_name);
        
        // Connect to default postgres database
        let default_pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(default_url.as_str())
            .await?;

        // Check if database exists
        let row: (bool,) = sqlx::query_as(
            "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1)"
        )
        .bind(db_name)
        .fetch_one(&default_pool)
        .await?;

        if !row.0 {
            tracing::info!("Database '{}' does not exist, creating...", db_name);
            
            // Create database (cannot use parameterized query for CREATE DATABASE)
            let create_db_query = format!("CREATE DATABASE \"{}\"", db_name);
            sqlx::query(&create_db_query)
                .execute(&default_pool)
                .await?;
            
            tracing::info!("Database '{}' created successfully", db_name);
        } else {
            tracing::info!("Database '{}' already exists", db_name);
        }

        default_pool.close().await;
        Ok(())
    }

    pub async fn run_migrations(&self) -> anyhow::Result<()> {
        use sqlx::Executor;
        
        // Run PostgreSQL migrations in order
        let migrations = vec![
            ("001_initial.sql", include_str!("../migrations/postgres/001_initial.sql")),
            ("002_add_missing_columns.sql", include_str!("../migrations/postgres/002_add_missing_columns.sql")),
            ("003_add_config_table.sql", include_str!("../migrations/postgres/003_add_config_table.sql")),
            ("004_add_channel_messages.sql", include_str!("../migrations/postgres/004_add_channel_messages.sql")),
            ("005_add_note_feedback_tables.sql", include_str!("../migrations/postgres/005_add_note_feedback_tables.sql")),
            ("006_add_folder_data_column.sql", include_str!("../migrations/postgres/006_add_folder_data_column.sql")),
        ];
        
        for (name, migration_sql) in migrations.iter() {
            tracing::info!("Running migration: {}", name);
            
            // Use execute_many to handle multiple statements including DO $$ blocks
            // This properly handles procedural SQL blocks
            let mut stream = self.pool.execute_many(*migration_sql);
            
            let mut statement_count = 0;
            use futures::stream::StreamExt;
            
            while let Some(result) = stream.next().await {
                statement_count += 1;
                match result {
                    Ok(_) => {
                        tracing::debug!("Migration {} statement {} executed", name, statement_count);
                    },
                    Err(e) => {
                        // Log error but continue if it's a "already exists" error
                        if e.to_string().contains("already exists") || 
                           e.to_string().contains("duplicate") {
                            tracing::debug!("Skipping already existing object in migration {}: {}", name, e);
                        } else {
                            tracing::warn!("Error in migration {} statement {}: {}", name, statement_count, e);
                            // Continue with other statements
                        }
                    }
                }
            }
            
            tracing::info!("Migration {} completed ({} statements)", name, statement_count);
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
