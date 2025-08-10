#pragma once
#include <crow.h>
#include "gateway/auth/jwt_handler.h"
#include <memory>

namespace sonet::gateway::middleware {

class AuthMiddleware {
public:
	struct context { bool authenticated = false; std::string user_id; };
	explicit AuthMiddleware(std::shared_ptr<sonet::gateway::auth::JwtHandler> jwt) : jwt_(std::move(jwt)) {}
	void before_handle(crow::request& req, crow::response& /*res*/, context& ctx) {
		auto it = req.get_header_value("Authorization");
		if (it.rfind("Bearer ", 0) == 0) {
			auto token = it.substr(7);
			auto claims = jwt_->parse(token);
			if (claims) { ctx.authenticated = true; ctx.user_id = claims->subject; }
		}
	}
	void after_handle(crow::request&, crow::response&, context&) {}
private:
	std::shared_ptr<sonet::gateway::auth::JwtHandler> jwt_;
};

}
