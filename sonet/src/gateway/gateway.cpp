#include "gateway.h"
#include <iostream>
#include <nlohmann/json.hpp>
#include "middleware/logging_middleware.h"
#include "middleware/cors_middleware.h"
#include "middleware/auth_middleware.h"
#include "auth/jwt_handler.h"
#include "rate_limiting/rate_limiter.h"
#include "responses.h"

using nlohmann::json;

namespace sonet::gateway {

RestGateway::RestGateway(int port) : port_(port), app_(std::make_unique<crow::SimpleApp>()) {}

RestGateway::~RestGateway() {
	stop();
}

void RestGateway::register_routes() {
	// Health
	CROW_ROUTE((*app_), "/health").methods(crow::HTTPMethod::GET)([this]() {
		return crow::response{responses::ok({{"service", "gateway"}}).dump()};
	});

	// Basic rate limiter (global)
	static sonet::gateway::rate_limiting::RateLimiter limiter({60, 60, 60}); // 60 req/min
	CROW_ROUTE((*app_), "/api/v1/ping").methods(crow::HTTPMethod::GET)([](){
		if (!limiter.allow("global")) {
			auto err = responses::error("RATE_LIMITED", "Too many requests", 429);
			return crow::response{429, err.dump()};
		}
		return crow::response{responses::ok({{"pong", true}}).dump()};
	});

	// OPTIONS preflight for any path
	CROW_ROUTE((*app_), "/<path>").methods(crow::HTTPMethod::OPTIONS)([](const crow::request&, crow::response& res){
		res.code = 204;
		res.end();
	});

	// Placeholder Note endpoints
	CROW_ROUTE((*app_), "/api/v1/notes").methods(crow::HTTPMethod::POST)([](const crow::request& req){
		try {
			auto body = json::parse(req.body);
			auto resp = responses::ok({{"id", "note_123"}, {"text", body.value("text", "")}});
			return crow::response{201, resp.dump()};
		} catch(const std::exception& e) {
			auto err = responses::error("BAD_REQUEST", e.what(), 400);
			return crow::response{400, err.dump()};
		}
	});

	CROW_ROUTE((*app_), "/api/v1/notes/<string>").methods(crow::HTTPMethod::GET)([](const std::string& id){
		auto resp = responses::ok({{"id", id}, {"text", "Sample note"}});
		return crow::response{resp.dump()};
	});

	// Auth endpoints (stubs) ---------------------------------
	CROW_ROUTE((*app_), "/api/v1/auth/login").methods(crow::HTTPMethod::POST)([](const crow::request& req){
		if (!limiter.allow("auth_login")) {
			return crow::response{429, responses::error("RATE_LIMITED", "Too many login attempts", 429).dump()};
		}
		try {
			auto body = json::parse(req.body);
			std::string username = body.value("username", "user");
			// Placeholder token format (NOT secure)
			json token{{"sub", username}, {"scope", "read:profile write:note"}, {"sid", "sess123"}, {"exp", 9999999999}};
			return crow::response{responses::ok({{"access_token", token.dump()}, {"token_type", "bearer"}, {"expires_in", 3600}}).dump()};
		} catch(const std::exception& e) {
			return crow::response{400, responses::error("BAD_REQUEST", e.what(), 400).dump()};
		}
	});

	CROW_ROUTE((*app_), "/api/v1/auth/register").methods(crow::HTTPMethod::POST)([](const crow::request& req){
		if (!limiter.allow("auth_register")) {
			return crow::response{429, responses::error("RATE_LIMITED", "Too many registrations", 429).dump()};
		}
		try {
			auto body = json::parse(req.body);
			std::string username = body.value("username", "newuser");
			auto resp = responses::ok({{"user", { {"username", username}, {"id", "user_123"} }}});
			return crow::response{201, resp.dump()};
		} catch(const std::exception& e) {
			return crow::response{400, responses::error("BAD_REQUEST", e.what(), 400).dump()};
		}
	});

	// Timeline endpoint (stub)
	CROW_ROUTE((*app_), "/api/v1/timeline/home").methods(crow::HTTPMethod::GET)([](const crow::request& req){
		if (!limiter.allow("timeline_home")) {
			return crow::response{429, responses::error("RATE_LIMITED", "Too many timeline requests", 429).dump()};
		}
		json items = json::array();
		for (int i=0;i<5;i++) {
			items.push_back({{"id", "note_"+std::to_string(i)}, {"text", "Home timeline sample note #"+std::to_string(i)}, {"metrics", {{"likes", i*3},{"renotes", i}}}});
		}
		auto resp = responses::ok({{"items", items}, {"next_cursor", nullptr}});
		return crow::response{resp.dump()};
	});
}

bool RestGateway::start() {
	if (running_.load()) return true;
	register_routes();
	running_.store(true);
	server_thread_ = std::thread([this]{
		try {
			std::cout << "REST Gateway listening on :" << port_ << std::endl;
			app_->port(port_).multithreaded().run();
		} catch(const std::exception& e) {
			std::cerr << "Gateway error: " << e.what() << std::endl;
		}
	});
	return true;
}

void RestGateway::stop() {
	if (!running_.load()) return;
	running_.store(false);
	app_->stop();
	if (server_thread_.joinable()) server_thread_.join();
}

} // namespace sonet::gateway
