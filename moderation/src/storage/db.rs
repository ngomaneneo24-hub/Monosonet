use anyhow::Result;
use std::time::Duration;
use sqlx::{postgres::PgPoolOptions, PgPool};
use deadpool_redis::{Config as RedisConfig, Pool as RedisPool, Runtime};

pub struct Datastores {
	pub pg: PgPool,
	pub redis: RedisPool,
}

impl Datastores {
	pub async fn connect(pg_url: &str, redis_url: &str) -> Result<Self> {
		let pg = PgPoolOptions::new()
			.max_connections(32)
			.acquire_timeout(Duration::from_secs(2))
			.max_lifetime(Duration::from_secs(600))
			.idle_timeout(Duration::from_secs(60))
			.connect(pg_url)
			.await?;

		let mut cfg = RedisConfig::default();
		cfg.url = Some(redis_url.to_string());
		let redis = cfg.create_pool(Some(Runtime::Tokio1))?;

		Ok(Self { pg, redis })
	}

	pub async fn readiness(&self) -> bool {
		let pg_ok = sqlx::query_scalar::<_, i32>("SELECT 1").fetch_one(&self.pg).await.is_ok();
		let mut conn_ok = false;
		if let Ok(mut conn) = self.redis.get().await {
			use deadpool_redis::redis::AsyncCommands;
			conn_ok = conn.ping().await.is_ok();
		}
		pg_ok && conn_ok
	}
}