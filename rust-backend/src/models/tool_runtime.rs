use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Tool definition structure from JSON content
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDefinition {
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub version: Option<String>,
    pub tools: Vec<ToolSpec>,
    #[serde(default)]
    pub mcp_servers: HashMap<String, McpServerConfig>,
    #[serde(default)]
    pub environment: EnvironmentConfig,
}

/// Individual tool specification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolSpec {
    pub name: String,
    pub description: String,
    #[serde(rename = "type")]
    pub tool_type: ToolType,
    #[serde(default)]
    pub parameters: HashMap<String, ParameterSpec>,
    pub handler: ToolHandler,
}

/// Tool types supported
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ToolType {
    HttpApi,
    Expression,
    Context,
    Mcp,
    #[serde(rename = "function")]
    BuiltIn,
}

/// Parameter specification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParameterSpec {
    #[serde(rename = "type")]
    pub param_type: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub required: bool,
    #[serde(default)]
    #[serde(rename = "enum")]
    pub enum_values: Option<Vec<String>>,
    #[serde(default)]
    pub default: Option<serde_json::Value>,
}

/// Tool handler configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ToolHandler {
    Http {
        method: HttpMethod,
        url: String,
        #[serde(default)]
        params: HashMap<String, String>,
        #[serde(default)]
        headers: HashMap<String, String>,
        #[serde(default)]
        body: Option<serde_json::Value>,
        #[serde(default)]
        response: ResponseTransform,
    },
    Expression {
        engine: String,
        expression: String,
    },
    Context {
        template: String,
    },
    Mcp {
        server: String,
        tool: String,
    },
    #[serde(rename = "built_in")]
    BuiltIn {
        function: String,
    },
}

/// HTTP methods
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "UPPERCASE")]
pub enum HttpMethod {
    Get,
    Post,
    Put,
    Patch,
    Delete,
}

/// Response transformation
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ResponseTransform {
    #[serde(default)]
    pub transform: Option<String>,
    #[serde(default)]
    pub extract: Option<String>,
}

/// MCP server configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServerConfig {
    pub url: String,
    #[serde(default)]
    pub auth_type: Option<String>,
    #[serde(default)]
    pub auth_token: Option<String>,
}

/// Environment configuration
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct EnvironmentConfig {
    #[serde(default)]
    pub required: Vec<String>,
    #[serde(default)]
    pub optional: Vec<String>,
}

/// Tool execution request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolExecutionRequest {
    pub tool_id: String,
    pub tool_name: String,
    pub parameters: HashMap<String, serde_json::Value>,
    #[serde(default)]
    pub context: ExecutionContext,
}

/// Execution context with user and environment data
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ExecutionContext {
    #[serde(default)]
    pub user: Option<UserContext>,
    #[serde(default)]
    pub environment: HashMap<String, String>,
    #[serde(default)]
    pub session: HashMap<String, serde_json::Value>,
}

/// User context for tool execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserContext {
    pub id: String,
    pub name: String,
    pub email: String,
    #[serde(default)]
    pub role: Option<String>,
}

/// Tool execution response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolExecutionResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<ExecutionMetadata>,
}

/// Execution metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionMetadata {
    pub execution_time_ms: u64,
    pub tool_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub http_status: Option<u16>,
}

impl ToolDefinition {
    /// Parse tool definition from JSON content
    pub fn from_json(content: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(content)
    }

    /// Find a tool by name
    pub fn find_tool(&self, name: &str) -> Option<&ToolSpec> {
        self.tools.iter().find(|t| t.name == name)
    }

    /// Convert to OpenAI function calling specs
    pub fn to_openai_specs(&self) -> Vec<serde_json::Value> {
        self.tools
            .iter()
            .map(|tool| {
                let mut properties = serde_json::Map::new();
                let mut required = Vec::new();

                for (param_name, param_spec) in &tool.parameters {
                    let mut prop = serde_json::Map::new();
                    prop.insert("type".to_string(), serde_json::json!(param_spec.param_type));

                    if let Some(desc) = &param_spec.description {
                        prop.insert("description".to_string(), serde_json::json!(desc));
                    }

                    if let Some(enum_vals) = &param_spec.enum_values {
                        prop.insert("enum".to_string(), serde_json::json!(enum_vals));
                    }

                    properties.insert(param_name.clone(), serde_json::Value::Object(prop));

                    if param_spec.required {
                        required.push(param_name.clone());
                    }
                }

                serde_json::json!({
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": {
                        "type": "object",
                        "properties": properties,
                        "required": required
                    }
                })
            })
            .collect()
    }
}
