#include "gateway.h"
#include <csignal>
#include <iostream>
#include <memory>
#include <fstream>
#include <nlohmann/json.hpp>

using sonet::gateway::RestGateway;

static std::unique_ptr<RestGateway> g_gateway;

void signal_handler(int sig) {
	std::cout << "Signal " << sig << " received, shutting down REST gateway..." << std::endl;
	if (g_gateway) {
		g_gateway->stop();
		g_gateway.reset();
	}
	std::exit(0);
}

int main(int argc, char* argv[]) {
	int port = 8080;
	std::string config_path = "config/development/gateway.json";
	if (argc > 1) {
		config_path = argv[1];
	}
	// Load config if present
	GatewayRateLimitConfig rl_cfg;
	try {
		std::ifstream in(config_path);
		if (in.good()) {
			auto j = nlohmann::json::parse(in);
			port = j.value("port", port);
			if (j.contains("rate_limits")) {
				auto rl = j["rate_limits"];
				rl_cfg.global_per_min = rl.value("global_per_min", rl_cfg.global_per_min);
				rl_cfg.login_per_min = rl.value("login_per_min", rl_cfg.login_per_min);
				rl_cfg.register_per_min = rl.value("register_per_min", rl_cfg.register_per_min);
				rl_cfg.timeline_per_min = rl.value("timeline_per_min", rl_cfg.timeline_per_min);
				rl_cfg.notes_create_per_min = rl.value("notes_create_per_min", rl_cfg.notes_create_per_min);
			}
		}
	} catch(const std::exception& e) {
		std::cerr << "Gateway config load failed: " << e.what() << std::endl;
	}
	g_gateway = std::make_unique<RestGateway>(port, rl_cfg);
	std::signal(SIGINT, signal_handler);
	std::signal(SIGTERM, signal_handler);
	g_gateway->start();
	// Block forever
	while (true) { std::this_thread::sleep_for(std::chrono::seconds(60)); }
	return 0;
}
