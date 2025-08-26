use anyhow::Result;
use sqlx::{postgres::PgPoolOptions, PgPool};
use redis::aio::Connection;

pub struct Datastores {
	pub pg: PgPool,
	pub redis: Connection,
}

impl Datastores {
	pub async fn connect(pg_url: &str, redis_url: &str) -> Result<Self> {
		let pg = PgPoolOptions::new().max_connections(5).connect(pg_url).await?;
		let client = redis::Client::open(redis_url)?;
		let redis = client.get_tokio_connection().await?;
		Ok(Self { pg, redis })
	}
}