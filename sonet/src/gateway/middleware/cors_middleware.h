#pragma once
#include "../../../nlohmann/httplib.h"

namespace sonet::gateway::middleware {

struct CORSHelper {
	static void apply(httplib::Response& res) {
		res.set_header("Access-Control-Allow-Origin", "*");
		res.set_header("Access-Control-Allow-Headers", "Authorization,Content-Type,Idempotency-Key,X-Request-ID");
		res.set_header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
	}
};

}
