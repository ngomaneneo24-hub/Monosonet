#pragma once
#include <crow.h>

namespace sonet::gateway::middleware {

struct CORSMiddleware {
	struct context {};
	void before_handle(crow::request& /*req*/, crow::response& res, context& /*ctx*/) {
		res.add_header("Access-Control-Allow-Origin", "*");
		res.add_header("Access-Control-Allow-Headers", "Authorization,Content-Type,Idempotency-Key,X-Request-ID");
		res.add_header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
	}
	void after_handle(crow::request& /*req*/, crow::response& res, context& /*ctx*/) {
		if (res.code == 0) res.code = 200;
	}
};

}
