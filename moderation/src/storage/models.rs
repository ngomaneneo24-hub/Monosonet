use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlaggedContent {
	pub id: Uuid,
	pub user_id: Uuid,
	pub content_id: Uuid,
	pub label: String,
	pub confidence: f32,
	pub created_at: DateTime<Utc>,
}