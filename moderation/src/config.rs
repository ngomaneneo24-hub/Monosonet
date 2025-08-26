use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct AppConfig {
	pub server_port: u16,
	pub grpc_port: u16,
	pub database_url: String,
	pub redis_url: String,
}

impl AppConfig {
	pub fn load() -> anyhow::Result<Self> {
		let mut cfg = config::Config::builder()
				.add_source(config::Environment::default().separator("__"))
				.build()?;
		cfg.try_deserialize().map_err(Into::into)
	}
}