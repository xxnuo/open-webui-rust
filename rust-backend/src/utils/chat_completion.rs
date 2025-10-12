// TODO: Implement chat completion streaming utilities for actix-web
// This will handle SSE streaming for chat completions
use crate::error::AppError;

pub type ChatCompletionResult = Result<(), AppError>;
