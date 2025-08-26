use std::sync::Arc;

use crate::storage::db::Datastores;

#[derive(Clone)]
pub struct AppState {
	pub datastores: Arc<Datastores>,
}