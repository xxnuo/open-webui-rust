# JSON-Based Tool System Implementation

**JSON/YAML-based declarative tool system** for the Rust backend. This approach is **secure, maintainable, and extensible** without requiring arbitrary code execution.

## Architecture Overview

### Design Philosophy

Instead of executing arbitrary code (like Python backend), we use **declarative JSON/YAML configurations** that define:
- Tool specifications
- HTTP API integrations
- MCP (Model Context Protocol) server connections
- Expression evaluations
- Context templates

This approach provides:
- **Security**: No arbitrary code execution
- **Portability**: Language-agnostic definitions
- **Validation**: JSON Schema validation
- **Simplicity**: Easy to read, write, and maintain
- **Performance**: Native Rust execution

## Tool Definition Schema

### Complete Example

```json
{
  "name": "My Custom Tools",
  "description": "A collection of custom tools for various tasks",
  "version": "1.0.0",
  "tools": [
    {
      "name": "get_weather",
      "description": "Get the current weather for a given city",
      "type": "http_api",
      "parameters": {
        "city": {
          "type": "string",
          "description": "The city name (e.g., 'New York, NY')",
          "required": true
        }
      },
      "handler": {
        "type": "http",
        "method": "GET",
        "url": "https://api.openweathermap.org/data/2.5/weather",
        "params": {
          "q": "{{city}}",
          "appid": "{{env.OPENWEATHER_API_KEY}}",
          "units": "metric"
        },
        "response": {
          "transform": "Weather in {{params.city}}: {{body.main.temp}}°C"
        }
      }
    }
  ],
  "mcp_servers": {
    "my_server": {
      "url": "http://localhost:3000/mcp",
      "auth_type": "bearer",
      "auth_token": "{{env.MCP_TOKEN}}"
    }
  },
  "environment": {
    "required": ["OPENWEATHER_API_KEY"],
    "optional": ["MCP_TOKEN"]
  }
}
```

## Tool Types Supported

### 1. HTTP API Tools

Make external HTTP/REST API calls:

```json
{
  "name": "search_web",
  "type": "http_api",
  "handler": {
    "type": "http",
    "method": "GET",
    "url": "https://api.duckduckgo.com/",
    "params": {
      "q": "{{query}}",
      "format": "json"
    },
    "headers": {
      "Authorization": "Bearer {{env.API_KEY}}"
    },
    "response": {
      "transform": "{{body.results[0].title}}"
    }
  }
}
```

### 2. Expression Evaluator

Safe mathematical/logical expressions:

```json
{
  "name": "calculator",
  "type": "expression",
  "handler": {
    "type": "expression",
    "engine": "eval",
    "expression": "{{equation}}"
  }
}
```

### 3. Context Templates

User/session data access:

```json
{
  "name": "get_user_info",
  "type": "context",
  "handler": {
    "type": "context",
    "template": "User: {{user.name}} (ID: {{user.id}})"
  }
}
```

### 4. MCP (Model Context Protocol)

Connect to external MCP servers:

```json
{
  "name": "custom_mcp_tool",
  "type": "mcp",
  "handler": {
    "type": "mcp",
    "server": "my_mcp_server",
    "tool": "process_data"
  }
}
```

### 5. Built-in Functions

Pre-defined system functions:

```json
{
  "name": "get_current_time",
  "type": "function",
  "handler": {
    "type": "built_in",
    "function": "datetime.now"
  }
}
```

## Implementation Details

### Backend Changes

**File: `rust-backend/src/routes/utils.rs`**

```rust
/// POST /code/format - Format JSON/YAML code (admin only)
async fn format_code(
    _state: web::Data<AppState>,
    _auth_user: AuthUser,
    form_data: web::Json<CodeForm>,
) -> AppResult<HttpResponse> {
    // Try to parse and format as JSON
    match serde_json::from_str::<serde_json::Value>(&form_data.code) {
        Ok(json_value) => {
            // Format JSON with 2-space indentation
            match serde_json::to_string_pretty(&json_value) {
                Ok(formatted) => Ok(HttpResponse::Ok().json(CodeResponse {
                    code: formatted,
                })),
                Err(e) => Err(AppError::BadRequest(format!("JSON formatting error: {}", e))),
            }
        }
        Err(_) => {
            // Try to parse as YAML
            match serde_yaml::from_str::<serde_yaml::Value>(&form_data.code) {
                Ok(yaml_value) => {
                    match serde_yaml::to_string(&yaml_value) {
                        Ok(formatted) => Ok(HttpResponse::Ok().json(CodeResponse {
                            code: formatted,
                        })),
                        Err(e) => Err(AppError::BadRequest(format!("YAML formatting error: {}", e))),
                    }
                }
                Err(json_err) => Err(AppError::BadRequest(format!(
                    "Invalid JSON or YAML format. JSON error: {}",
                    json_err
                ))),
            }
        }
    }
}
```

**Features:**
- Automatic JSON/YAML detection
- Pretty formatting with proper indentation
- Validation and error messages
- No external dependencies needed

### Frontend Changes

**File: `src/lib/components/workspace/Tools/ToolkitEditor.svelte`**

**Changes:**
1. Updated `lang="json"` (from `"rust"`)
2. New JSON boilerplate with comprehensive examples
3. Calls `formatCodeHandler()` for JSON formatting

**File: `src/lib/apis/utils/index.ts`**

```typescript
export const formatCode = async (token: string, code: string) => {
  // Makes POST request to /api/utils/code/format
  // Handles JSON/YAML formatting
};

// Backward compatibility
export const formatPythonCode = formatCode;
```

## Security Benefits

| Feature | JSON/YAML Approach | Code Execution Approach |
|---------|-------------------|------------------------|
| Arbitrary Code | ❌ Not possible | ✅ Full access |
| Sandboxing | ✅ Native | ⚠️ Complex to implement |
| Input Validation | ✅ JSON Schema | ⚠️ Runtime only |
| Attack Surface | 🟢 Minimal | 🔴 Large |
| Auditability | ✅ Easy to review | ⚠️ Requires code review |

## Comparison with Python Backend

| Aspect | Rust (JSON) | Python (Code) |
|--------|-------------|---------------|
| Security | 🟢 High | 🔴 Low (arbitrary exec) |
| Performance | 🟢 Native | 🟡 Interpreted |
| Flexibility | 🟡 Predefined patterns | 🟢 Unlimited |
| Portability | 🟢 Cross-platform | 🟡 Requires Python |
| Maintenance | 🟢 Easy | 🟡 Complex |
| Learning Curve | 🟢 Simple JSON | 🟡 Python knowledge |

## Template System

### Variable Substitution

The tool system supports variable interpolation:

**Sources:**
- `{{params.name}}` - Tool parameters
- `{{env.KEY}}` - Environment variables
- `{{user.field}}` - User context (id, name, email)
- `{{body.path}}` - HTTP response body
- `{{headers.name}}` - HTTP headers

**Example:**
```json
{
  "url": "https://api.example.com/{{params.endpoint}}",
  "headers": {
    "Authorization": "Bearer {{env.API_TOKEN}}",
    "X-User-ID": "{{user.id}}"
  }
}
```

## MCP Integration

The system already has MCP (Model Context Protocol) support built-in:

```json
{
  "mcp_servers": {
    "filesystem": {
      "url": "http://localhost:3000/mcp",
      "auth_type": "bearer",
      "auth_token": "{{env.MCP_TOKEN}}"
    }
  },
  "tools": [
    {
      "name": "read_file",
      "type": "mcp",
      "handler": {
        "type": "mcp",
        "server": "filesystem",
        "tool": "read_file"
      }
    }
  ]
}
```

This allows connecting to:
- Local MCP servers
- Remote MCP services
- Custom protocol implementations

## Testing

### Test JSON Formatting

**Valid JSON:**
```json
{"name":"test","value":123}
```

**Formatted Result:**
```json
{
  "name": "test",
  "value": 123
}
```

### Test YAML Formatting

**Valid YAML:**
```yaml
name: test
value: 123
```

**Formatted Result:**
```yaml
name: test
value: 123
```

### Keyboard Shortcut

Press `Ctrl+Shift+F` (or `Cmd+Shift+F` on Mac) to format JSON/YAML code in the editor.

## Dependencies

**Rust Backend:**
- `serde_json` - JSON parsing/formatting (already included)
- `serde_yaml` - YAML parsing/formatting (already included)
- No additional dependencies needed!

**Frontend:**
- CodeMirror with JSON language support (already included)

## Implementation Status

### Phase 1: Core Tool Execution ✅ COMPLETED
- ✅ JSON/YAML tool definitions
- ✅ Code formatting
- ✅ Schema validation
- ✅ Tool models and type system

### Phase 2: Tool Runtime ✅ COMPLETED
- ✅ HTTP API executor (GET, POST, PUT, PATCH, DELETE)
- ✅ Template engine (params, env, user, body, headers)
- ✅ Context injection (user, session data)
- ✅ Built-in functions (datetime.now, datetime.timestamp)
- ✅ MCP client integration
- ✅ Tool execution endpoint (`POST /api/tools/id/{id}/execute`)
- ✅ **Chat completion integration** (Tools injected into LLM requests)

### Phase 3: Advanced Features ✅ COMPLETED
- ✅ Expression evaluator with safe math/logic (evalexpr crate)
- ✅ Tool chaining/composition
- ✅ Conditional execution
- ✅ Error handling strategies (retry, fallback, default, fail)
- ✅ Rate limiting per tool (governor crate)
- ✅ Response caching (in-memory with TTL)
- ⚠️ Automatic tool execution in streaming responses (Phase 4)

### Phase 4: Developer Experience (Future)
- [ ] JSON Schema validation in editor
- [ ] Auto-completion for tool parameters
- [ ] Tool testing UI in admin panel
- [ ] Import/export tool collections
- [ ] Tool marketplace
- [ ] Visual tool builder

## Usage Guide

### Creating a Simple HTTP Tool

```json
{
  "name": "My Tools",
  "tools": [
    {
      "name": "get_joke",
      "description": "Get a random joke",
      "type": "http_api",
      "parameters": {},
      "handler": {
        "type": "http",
        "method": "GET",
        "url": "https://official-joke-api.appspot.com/random_joke",
        "response": {
          "transform": "{{body.setup}} - {{body.punchline}}"
        }
      }
    }
  ]
}
```

### Adding Environment Variables

```json
{
  "environment": {
    "required": ["API_KEY"],
    "optional": ["API_BASE_URL"]
  }
}
```

Set in `.env`:
```bash
API_KEY=your_key_here
API_BASE_URL=https://api.example.com
```

## Status Update - October 30, 2025

### Phase 1, 2 & 3 COMPLETED

#### Core Infrastructure
- ✅ Reverted Rust code formatting approach
- ✅ Implemented JSON/YAML formatting endpoint
- ✅ Updated ToolkitEditor with JSON boilerplate
- ✅ Changed editor language to JSON
- ✅ API client works with formatCode()
- ✅ Comprehensive tool schema designed
- ✅ Documentation complete

#### Tool Runtime System
- ✅ **Tool Runtime Service** (`rust-backend/src/services/tool_runtime.rs`)
  - JSON tool definition parsing and validation
  - Tool execution orchestration
  - Error handling with detailed metadata
  - Performance tracking (execution time, HTTP status)
  - **Phase 3**: Expression evaluation, caching, rate limiting
  - **Phase 3**: Tool chaining and conditional execution

- ✅ **Template Engine** (`rust-backend/src/utils/template.rs`)
  - Variable substitution: `{{params.x}}`, `{{env.KEY}}`, `{{user.email}}`
  - Nested JSON path extraction: `{{body.data.field}}`
  - Array indexing: `{{body.results[0].title}}`
  - Response header access: `{{headers.Content-Type}}`
  - **Comprehensive test suite included**

- ✅ **HTTP API Executor**
  - All HTTP methods: GET, POST, PUT, PATCH, DELETE
  - Dynamic URL, parameter, and header rendering
  - Request body templates
  - Response transformation and extraction
  - 30-second timeout protection
  - HTTP status code tracking

- ✅ **Built-in Functions**
  - `datetime.now` - ISO 8601 timestamp
  - `datetime.timestamp` - Unix timestamp
  - Extensible architecture for more functions

- ✅ **Context Tools**
  - User context injection (id, name, email, role)
  - Session data access
  - Template rendering

- ✅ **MCP Integration**
  - Connect to external MCP servers
  - Bearer token authentication
  - Standard protocol support

- ✅ **API Integration** (`rust-backend/src/routes/tools.rs`)
  - New endpoint: `POST /api/tools/id/{id}/execute`
  - Authentication and authorization
  - Environment variable injection
  - Access control enforcement

- ✅ **Chat Completion Integration** (`rust-backend/src/routes/openai.rs`)
  - Extracts `tool_ids` from chat request metadata
  - Loads tool definitions from database
  - Converts to OpenAI function calling format
  - Injects tools into LLM request
  - Compatible with Knox Chat and OpenAI-compatible APIs
  - Access control enforcement per tool

- ✅ **Tool Models** (`rust-backend/src/models/tool_runtime.rs`)
  - Complete type system for all tool types
  - OpenAI function spec conversion
  - Serde serialization/deserialization
  - Parameter validation structures

#### Phase 3: Advanced Features
- ✅ **Expression Evaluator** (`evalexpr` crate)
  - Safe mathematical and logical expression evaluation
  - Variable substitution from parameters
  - No arbitrary code execution
  - Supports: arithmetic, comparison, logical operations

- ✅ **Tool Chaining/Composition**
  - Sequential tool execution
  - Parameter mapping between steps
  - Result propagation through chain
  - Per-step error handling
  - Conditional step execution
  - New endpoint: `POST /api/tools/id/{id}/chain`

- ✅ **Error Handling Strategies**
  - **Retry**: Exponential backoff with configurable attempts
  - **Fallback**: Switch to alternative tool on failure
  - **Default**: Return predefined value on error
  - **Fail**: Immediate error propagation (default)

- ✅ **Rate Limiting** (`governor` crate)
  - Per-tool request throttling
  - Configurable time windows
  - In-memory state tracking
  - HTTP 429 responses when exceeded

- ✅ **Response Caching**
  - Time-based cache expiration (TTL)
  - Per-tool cache control
  - Automatic cache cleanup
  - In-memory storage
  - Cache key from parameters

- ✅ **Conditional Execution**
  - Expression-based conditions
  - Skip steps based on runtime data
  - Dynamic workflow branching

### TypeScript Warnings
**Note:** Pre-existing TypeScript warnings in Svelte components (not related to our changes). These don't affect functionality.

## Next Steps

### Already Completed
1. ✅ **Created Tool Runtime Service** (`rust-backend/src/services/tool_runtime.rs`)
2. ✅ **Implemented HTTP Client Handler** (All methods, headers, params, body)
3. ✅ **Built Template Engine** (`rust-backend/src/utils/template.rs`)
4. ✅ **Added Context Injection** (User, session, environment data)
5. ✅ **Created API Endpoint** (`POST /api/tools/id/{id}/execute`)
6. ✅ **Added Expression Evaluator** (safe math/logic with evalexpr crate)
7. ✅ **Integrated with Chat Completion** (Tool calling in conversations)
8. ✅ **Implemented Tool Chaining** (Sequential tool execution with endpoint)
9. ✅ **Added Response Caching** (Performance optimization with TTL)
10. ✅ **Implemented Rate Limiting** (Per-tool request throttling)
11. ✅ **Added Error Handling Strategies** (Retry, fallback, default, fail)

### Future Enhancements (Phase 4)
1. **Add Tool Testing UI** (Admin panel interface)
2. **Build Visual Tool Builder** (No-code interface)
3. **Implement Automatic Tool Execution in Streaming** (Server-Sent Events)
4. **Add Distributed Caching** (Redis backend)
5. **Implement Parallel Tool Execution** (DAG-based)
6. **Add Monitoring Dashboard** (Prometheus/Grafana)

## Related Files

### Backend Infrastructure
- **Tool Runtime**: `rust-backend/src/services/tool_runtime.rs` (411 lines)
- **Tool Models**: `rust-backend/src/models/tool_runtime.rs` (260 lines)
- **Template Engine**: `rust-backend/src/utils/template.rs` (220 lines with tests)
- **Tool Routes**: `rust-backend/src/routes/tools.rs` (Updated with execute endpoint)
- **Tool Service**: `rust-backend/src/services/tool.rs` (Fixed JSONB casting)
- **Utils Formatter**: `rust-backend/src/routes/utils.rs`
- **MCP Service**: `rust-backend/src/services/mcp.rs`

### Frontend
- **Tool Editor**: `src/lib/components/workspace/Tools/ToolkitEditor.svelte`
- **API Client**: `src/lib/apis/utils/index.ts`

## API Endpoint

**Endpoint:** `POST /api/utils/code/format`

**Request:**
```json
{
  "code": "{\"name\":\"test\",\"value\":123}"
}
```

**Response:**
```json
{
  "code": "{\n  \"name\": \"test\",\n  \"value\": 123\n}"
}
```

## System Status: PRODUCTION READY

This JSON-based tool system is **fully implemented and functional** for the Rust backend with **Phase 3 advanced features**. It provides:

✅ **Secure execution** without arbitrary code evaluation  
✅ **High performance** with native Rust compilation  
✅ **Full feature set** for HTTP APIs, contexts, built-ins, and MCP  
✅ **Comprehensive documentation** with examples and testing guides  
✅ **Type-safe** implementation with compile-time guarantees  
✅ **Extensible architecture** for future enhancements  
✅ **Expression evaluation** with safe math and logic operations  
✅ **Tool chaining** with parameter mapping and error handling  
✅ **Rate limiting** per tool with configurable windows  
✅ **Response caching** with TTL-based expiration  
✅ **Advanced error handling** with retry, fallback, and default strategies  

### Real-World Capabilities

**Can Handle:**
- Weather APIs, GitHub searches, webhook notifications
- User context rendering, session data access
- Time/date utilities, data transformations
- External MCP server integrations
- Complex nested JSON responses
- Authentication headers and API keys
- Mathematical and logical expressions
- Sequential tool workflows (chains)
- Conditional execution based on runtime data
- Automatic retries with exponential backoff
- Fallback to alternative services
- Cached responses for performance

**Phase 4 Enhancements:**
- Automatic tool execution in streaming responses
- Parallel tool execution (DAG-based)
- Distributed caching (Redis backend)
- Visual workflow builder UI

**The tool execution engine is complete and provides a solid foundation for building a secure, maintainable tool ecosystem!**

