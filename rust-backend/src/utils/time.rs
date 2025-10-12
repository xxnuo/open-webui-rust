use chrono::Utc;

pub fn current_timestamp() -> i64 {
    Utc::now().timestamp()
}

#[allow(dead_code)]
pub fn current_timestamp_millis() -> i64 {
    Utc::now().timestamp_millis()
}

pub fn current_timestamp_nanos() -> i64 {
    Utc::now().timestamp_nanos_opt().unwrap_or(0)
}
