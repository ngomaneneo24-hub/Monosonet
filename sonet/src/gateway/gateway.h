// Minimal REST gateway facade using Crow (placeholder implementation)
#pragma once

#include <memory>
#include <thread>
#include <atomic>
#include <crow.h>

namespace sonet::gateway {

class RestGateway {
public:
	explicit RestGateway(int port = 8080);
	~RestGateway();

	bool start();
	void stop();

	int port() const { return port_; }

private:
	void register_routes();

	int port_;
	std::unique_ptr<crow::SimpleApp> app_;
	std::thread server_thread_;
	std::atomic<bool> running_{false};
};

} // namespace sonet::gateway
