use moderation::api::routes::create_router;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
	tracing_subscriber::registry()
		.with(tracing_subscriber::EnvFilter::new(
			std::env::var("RUST_LOG").unwrap_or_else(|_| "moderation=info,tower_http=info".into()),
		))
		.with(tracing_subscriber::fmt::layer())
		.init();

	let app = create_router();

	let addr = std::net::SocketAddr::from(([0, 0, 0, 0], 8080));
	tracing::info!(%addr, "starting moderation service");
	let listener = tokio::net::TcpListener::bind(addr).await.expect("bind failed");
	axum::serve(listener, app).await.expect("server failed");
}