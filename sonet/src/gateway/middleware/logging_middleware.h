#pragma once
#include <crow.h>
#include <chrono>

namespace sonet::gateway::middleware {

struct LoggingMiddleware {
	struct context { std::chrono::steady_clock::time_point start; };
	void before_handle(crow::request& req, crow::response& /*res*/, context& ctx) {
		ctx.start = std::chrono::steady_clock::now();
	}
	void after_handle(crow::request& req, crow::response& res, context& ctx) {
		using namespace std::chrono;
		auto dur = duration_cast<milliseconds>(steady_clock::now() - ctx.start).count();
		std::cout << req.method_name() << " " << req.url << " -> " << res.code << " (" << dur << "ms)" << std::endl;
	}
};

}
