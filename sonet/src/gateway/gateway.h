// Minimal REST gateway facade using Crow (placeholder implementation)
#pragma once

#include <memory>
#include <thread>
#pragma once
#include <memory>
#include <atomic>
#include <thread>
#include <unordered_map>
#include <string>
#include <nlohmann/json.hpp>
#include <httplib.h>
#include "rate_limiting/rate_limiter.h"
#include "responses.h"

using json = nlohmann::json;

struct GatewayRateLimitConfig {
	int global_per_minute{60};
	int auth_login_per_minute{10};
	int auth_register_per_minute{5};
	int timeline_home_per_minute{30};
};

class RestGateway {
public:
	RestGateway(int port, GatewayRateLimitConfig rl = {});
	~RestGateway();
	bool start();
	void stop();
	bool is_running() const { return running_.load(); }
	int port() const { return port_; }
	void register_routes();
private:
	bool rate_allow(const std::string& key);
	void init_limiters();
	int port_;
	GatewayRateLimitConfig rl_cfg_;
	std::unique_ptr<httplib::Server> server_;
	std::atomic<bool> running_{false};
	std::thread server_thread_;
	std::unordered_map<std::string, std::shared_ptr<RateLimiter>> limiters_;
};
