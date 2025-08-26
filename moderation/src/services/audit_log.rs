use tracing::info;

pub async fn record(event: &str) {
	info!("audit_event={}", event);
}