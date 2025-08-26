use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserReport {
	pub id: Uuid,
	pub reporter_id: Uuid,
	pub target_id: Uuid,
	pub reason: String,
}

impl UserReport {
	pub fn new(reporter_id: Uuid, target_id: Uuid, reason: String) -> Self {
		Self { id: Uuid::new_v4(), reporter_id, target_id, reason }
	}
}