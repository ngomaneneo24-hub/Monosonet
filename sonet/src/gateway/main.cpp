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
	try {
		std::ifstream in(config_path);
		if (in.good()) {
			auto j = nlohmann::json::parse(in);
			port = j.value("port", port);
		}
	} catch(const std::exception& e) {
		std::cerr << "Gateway config load failed: " << e.what() << std::endl;
	}
	g_gateway = std::make_unique<RestGateway>(port);
	std::signal(SIGINT, signal_handler);
	std::signal(SIGTERM, signal_handler);
	g_gateway->start();
	// Block forever
	while (true) { std::this_thread::sleep_for(std::chrono::seconds(60)); }
	return 0;
}
