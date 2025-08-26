use moderation::api::routes::create_router;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;
use axum::Router;
use tower_http::compression::CompressionLayer;
use tower_http::decompression::DecompressionLayer;
use tower_http::trace::TraceLayer;
use tower::limit::ConcurrencyLimitLayer;
use tower::timeout::TimeoutLayer;
use moderation::config::AppConfig;
use moderation::storage::db::Datastores;
use axum_prometheus::PrometheusMetricLayer;

async fn shutdown_signal() {
	let ctrl_c = async {
		tokio::signal::ctrl_c().await.expect("install Ctrl+C handler");
	};
	#[cfg(unix)]
	let terminate = async {
		use tokio::signal::unix::{signal, SignalKind};
		let mut term = signal(SignalKind::terminate()).expect("install signal handler");
		term.recv().await;
	};
	#[cfg(not(unix))]
	let terminate = std::future::pending::<()>();

	tokio::select! {
		_ = ctrl_c => {},
		_ = terminate => {},
	}
}

#[tokio::main]
async fn main() {
	tracing_subscriber::registry()
		.with(tracing_subscriber::EnvFilter::new(
			std::env::var("RUST_LOG").unwrap_or_else(|_| "moderation=info,tower_http=info".into()),
		))
		.with(tracing_subscriber::fmt::layer())
		.init();

	let cfg = AppConfig::load().expect("config load failed");
	let datastores = Datastores::connect(&cfg.database_url, &cfg.redis_url).await.expect("datastores connect failed");
	let state = Arc::new(datastores);

	let (prom_layer, metric_handle) = PrometheusMetricLayer::pair();
	let base: Router = create_router();
	let app = base
		.layer(CompressionLayer::new())
		.layer(DecompressionLayer::new())
		.layer(TimeoutLayer::new(Duration::from_millis(250)))
		.layer(ConcurrencyLimitLayer::new(8192))
		.layer(TraceLayer::new_for_http())
		.layer(prom_layer)
		.route("/metrics", axum::routing::get(move || async move { metric_handle.render() }))
		.with_state(state);

	let addr = SocketAddr::from(([0, 0, 0, 0], cfg.server_port));
	tracing::info!(%addr, "starting moderation service");
	let listener = tokio::net::TcpListener::bind(addr).await.expect("bind failed");
	axum::serve(listener, app)
		.with_graceful_shutdown(shutdown_signal())
		.await
		.expect("server failed");
}