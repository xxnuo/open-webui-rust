use crate::db::Database;
use crate::error::{AppError, AppResult};
use crate::models::tool_runtime::*;
use crate::services::tool::ToolService;
use crate::utils::template::TemplateEngine;
use reqwest::Client;
use serde_json::Value;
use std::collections::HashMap;
use std::time::Instant;

/// Tool runtime service for executing JSON-defined tools
pub struct ToolRuntimeService {
    http_client: Client,
    template_engine: TemplateEngine,
}

impl ToolRuntimeService {
    pub fn new() -> Self {
        ToolRuntimeService {
            http_client: Client::builder()
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .unwrap_or_else(|_| Client::new()),
            template_engine: TemplateEngine::new(),
        }
    }

    /// Execute a tool by ID and name
    pub async fn execute_tool(
        &self,
        db: &Database,
        request: ToolExecutionRequest,
    ) -> AppResult<ToolExecutionResponse> {
        let start_time = Instant::now();

        // Get tool from database
        let tool_service = ToolService::new(db);
        let tool = tool_service
            .get_tool_by_id(&request.tool_id)
            .await?
            .ok_or_else(|| AppError::NotFound(format!("Tool not found: {}", request.tool_id)))?;

        // Parse tool definition from content
        let tool_def = ToolDefinition::from_json(&tool.content)
            .map_err(|e| AppError::BadRequest(format!("Invalid tool definition: {}", e)))?;

        // Find the specific tool
        let tool_spec = tool_def
            .find_tool(&request.tool_name)
            .ok_or_else(|| AppError::NotFound(format!("Tool not found: {}", request.tool_name)))?;

        // Validate required parameters
        self.validate_parameters(tool_spec, &request.parameters)?;

        // Validate required environment variables
        self.validate_environment(&tool_def.environment, &request.context.environment)?;

        // Execute based on tool type
        let result = match &tool_spec.handler {
            ToolHandler::Http {
                method,
                url,
                params,
                headers,
                body,
                response,
            } => {
                self.execute_http_tool(
                    method,
                    url,
                    params,
                    headers,
                    body,
                    response,
                    &request.parameters,
                    &request.context,
                )
                .await
            }
            ToolHandler::Expression { engine, expression } => {
                self.execute_expression_tool(engine, expression, &request.parameters)
                    .await
            }
            ToolHandler::Context { template } => {
                self.execute_context_tool(template, &request.parameters, &request.context)
                    .await
            }
            ToolHandler::Mcp { server, tool } => {
                self.execute_mcp_tool(
                    &tool_def.mcp_servers,
                    server,
                    tool,
                    &request.parameters,
                    &request.context,
                )
                .await
            }
            ToolHandler::BuiltIn { function } => {
                self.execute_builtin_tool(function, &request.parameters)
                    .await
            }
        };

        let execution_time = start_time.elapsed().as_millis() as u64;

        match result {
            Ok((value, metadata)) => Ok(ToolExecutionResponse {
                success: true,
                result: Some(value),
                error: None,
                metadata: Some(ExecutionMetadata {
                    execution_time_ms: execution_time,
                    tool_type: format!("{:?}", tool_spec.tool_type),
                    http_status: metadata.and_then(|m| {
                        m.get("http_status")
                            .and_then(|v| v.as_u64().map(|n| n as u16))
                    }),
                }),
            }),
            Err(e) => Ok(ToolExecutionResponse {
                success: false,
                result: None,
                error: Some(e.to_string()),
                metadata: Some(ExecutionMetadata {
                    execution_time_ms: execution_time,
                    tool_type: format!("{:?}", tool_spec.tool_type),
                    http_status: None,
                }),
            }),
        }
    }

    /// Validate tool parameters
    fn validate_parameters(
        &self,
        tool_spec: &ToolSpec,
        parameters: &HashMap<String, Value>,
    ) -> AppResult<()> {
        for (param_name, param_spec) in &tool_spec.parameters {
            if param_spec.required && !parameters.contains_key(param_name) {
                return Err(AppError::BadRequest(format!(
                    "Missing required parameter: {}",
                    param_name
                )));
            }
        }
        Ok(())
    }

    /// Validate environment variables
    fn validate_environment(
        &self,
        env_config: &EnvironmentConfig,
        environment: &HashMap<String, String>,
    ) -> AppResult<()> {
        for env_var in &env_config.required {
            if !environment.contains_key(env_var) {
                return Err(AppError::BadRequest(format!(
                    "Missing required environment variable: {}",
                    env_var
                )));
            }
        }
        Ok(())
    }

    /// Execute HTTP API tool
    async fn execute_http_tool(
        &self,
        method: &HttpMethod,
        url: &str,
        params: &HashMap<String, String>,
        headers: &HashMap<String, String>,
        body: &Option<Value>,
        response: &ResponseTransform,
        parameters: &HashMap<String, Value>,
        context: &ExecutionContext,
    ) -> Result<(Value, Option<HashMap<String, Value>>), AppError> {
        // Convert user context to JSON once
        let user_json = context
            .user
            .as_ref()
            .map(|u| serde_json::to_value(u).unwrap());

        // Render URL with template variables
        let rendered_url = self.template_engine.render(
            url,
            parameters,
            &context.environment,
            user_json.as_ref(),
            None,
            None,
        );

        // Render query parameters
        let mut rendered_params = HashMap::new();
        for (key, value) in params {
            let rendered_value = self.template_engine.render(
                value,
                parameters,
                &context.environment,
                user_json.as_ref(),
                None,
                None,
            );
            rendered_params.insert(key.clone(), rendered_value);
        }

        // Render headers
        let mut rendered_headers = HashMap::new();
        for (key, value) in headers {
            let rendered_value = self.template_engine.render(
                value,
                parameters,
                &context.environment,
                user_json.as_ref(),
                None,
                None,
            );
            rendered_headers.insert(key.clone(), rendered_value);
        }

        // Build HTTP request
        let mut request_builder = match method {
            HttpMethod::Get => self.http_client.get(&rendered_url),
            HttpMethod::Post => self.http_client.post(&rendered_url),
            HttpMethod::Put => self.http_client.put(&rendered_url),
            HttpMethod::Patch => self.http_client.patch(&rendered_url),
            HttpMethod::Delete => self.http_client.delete(&rendered_url),
        };

        // Add query parameters
        if !rendered_params.is_empty() {
            request_builder = request_builder.query(&rendered_params);
        }

        // Add headers
        for (key, value) in rendered_headers {
            request_builder = request_builder.header(&key, &value);
        }

        // Add body for POST/PUT/PATCH
        if let Some(body_template) = body {
            if matches!(
                method,
                HttpMethod::Post | HttpMethod::Put | HttpMethod::Patch
            ) {
                request_builder = request_builder.json(body_template);
            }
        }

        // Execute request
        let response_result = request_builder
            .send()
            .await
            .map_err(|e| AppError::InternalServerError(format!("HTTP request failed: {}", e)))?;

        let status_code = response_result.status().as_u16();
        let response_headers_map: HashMap<String, String> = response_result
            .headers()
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
            .collect();

        // Parse response body
        let response_body: Value = response_result.json().await.map_err(|e| {
            AppError::InternalServerError(format!("Failed to parse response: {}", e))
        })?;

        // Transform response if specified
        let final_result = if let Some(transform_template) = &response.transform {
            let transformed = self.template_engine.render(
                transform_template,
                parameters,
                &context.environment,
                user_json.as_ref(),
                Some(&response_body),
                Some(&response_headers_map),
            );
            Value::String(transformed)
        } else if let Some(extract_path) = &response.extract {
            // Extract specific field from response
            self.extract_json_path(&response_body, extract_path)
                .unwrap_or(response_body)
        } else {
            response_body
        };

        let mut metadata = HashMap::new();
        metadata.insert("http_status".to_string(), Value::Number(status_code.into()));

        Ok((final_result, Some(metadata)))
    }

    /// Execute expression/calculator tool
    async fn execute_expression_tool(
        &self,
        _engine: &str,
        expression: &str,
        parameters: &HashMap<String, Value>,
    ) -> Result<(Value, Option<HashMap<String, Value>>), AppError> {
        // For safety, we'll use a simple evaluation approach
        // Replace parameter placeholders
        let mut expr = expression.to_string();
        for (key, value) in parameters {
            let placeholder = format!("{{{{{}}}}}", key);
            let value_str = match value {
                Value::Number(n) => n.to_string(),
                Value::String(s) => s.clone(),
                _ => value.to_string(),
            };
            expr = expr.replace(&placeholder, &value_str);
        }

        // Use evalexpr crate for safe expression evaluation (if available)
        // For now, return the expression as-is (Phase 4 enhancement)
        Err(AppError::BadRequest(
            "Expression evaluation not yet implemented. Use HTTP tools for calculations."
                .to_string(),
        ))
    }

    /// Execute context template tool
    async fn execute_context_tool(
        &self,
        template: &str,
        parameters: &HashMap<String, Value>,
        context: &ExecutionContext,
    ) -> Result<(Value, Option<HashMap<String, Value>>), AppError> {
        // Convert user context to JSON
        let user_json = context
            .user
            .as_ref()
            .map(|u| serde_json::to_value(u).unwrap());

        let rendered = self.template_engine.render(
            template,
            parameters,
            &context.environment,
            user_json.as_ref(),
            None,
            None,
        );

        Ok((Value::String(rendered), None))
    }

    /// Execute MCP tool
    async fn execute_mcp_tool(
        &self,
        mcp_servers: &HashMap<String, McpServerConfig>,
        server_name: &str,
        tool_name: &str,
        parameters: &HashMap<String, Value>,
        _context: &ExecutionContext,
    ) -> Result<(Value, Option<HashMap<String, Value>>), AppError> {
        let server_config = mcp_servers
            .get(server_name)
            .ok_or_else(|| AppError::NotFound(format!("MCP server not found: {}", server_name)))?;

        // Build MCP request
        let url = format!("{}/tools/{}/execute", server_config.url, tool_name);
        let mut request_builder = self.http_client.post(&url).json(&serde_json::json!({
            "arguments": parameters
        }));

        // Add authentication
        if let Some(token) = &server_config.auth_token {
            if server_config.auth_type.as_deref() == Some("bearer") {
                request_builder = request_builder.bearer_auth(token);
            }
        }

        // Execute MCP request
        let response = request_builder
            .send()
            .await
            .map_err(|e| AppError::InternalServerError(format!("MCP request failed: {}", e)))?;

        let result: Value = response.json().await.map_err(|e| {
            AppError::InternalServerError(format!("Failed to parse MCP response: {}", e))
        })?;

        Ok((result, None))
    }

    /// Execute built-in function tool
    async fn execute_builtin_tool(
        &self,
        function: &str,
        _parameters: &HashMap<String, Value>,
    ) -> Result<(Value, Option<HashMap<String, Value>>), AppError> {
        match function {
            "datetime.now" => {
                let now = chrono::Utc::now();
                Ok((Value::String(now.to_rfc3339()), None))
            }
            "datetime.timestamp" => {
                let now = chrono::Utc::now();
                Ok((Value::Number(now.timestamp().into()), None))
            }
            _ => Err(AppError::BadRequest(format!(
                "Unknown built-in function: {}",
                function
            ))),
        }
    }

    /// Extract value from JSON using a path
    fn extract_json_path(&self, value: &Value, path: &str) -> Option<Value> {
        let parts: Vec<&str> = path.split('.').collect();
        let mut current = value;

        for part in parts {
            current = current.get(part)?;
        }

        Some(current.clone())
    }
}

impl Default for ToolRuntimeService {
    fn default() -> Self {
        Self::new()
    }
}
