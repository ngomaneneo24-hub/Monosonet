use axum::{routing::get, extract::State, Json, Router};
use serde::Serialize;
use std::sync::Arc;

use crate::storage::db::Datastores;

#[derive(Serialize)]
struct Health { status: &'static str }

#[derive(Serialize)]
struct Readiness { ready: bool }

pub fn create_router() -> Router {
	Router::new().route("/health", get(health)).route("/ready", get(ready))
}

async fn health() -> Json<Health> {
	Json(Health { status: "ok" })
}

async fn ready(State(state): State<Arc<Datastores>>) -> Json<Readiness> {
	let ok = state.readiness().await;
	Json(Readiness { ready: ok })
}