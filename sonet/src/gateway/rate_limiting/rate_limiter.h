#pragma once
#include "token_bucket.h"
#include <unordered_map>
#include <string>
#include <memory>
#include <mutex>

namespace sonet::gateway::rate_limiting {

class RateLimiter {
public:
	struct Limits { int capacity; int refill; int interval_seconds; };
	explicit RateLimiter(Limits default_limits) : default_limits_(default_limits) {}
	bool allow(const std::string& key) {
		std::lock_guard<std::mutex> lock(mutex_);
		auto& bucket_ptr = buckets_[key];
		if (!bucket_ptr) {
			bucket_ptr = std::make_unique<TokenBucket>(default_limits_.capacity, default_limits_.refill, std::chrono::seconds(default_limits_.interval_seconds));
		}
		return bucket_ptr->consume(1);
	}
private:
	Limits default_limits_;
	std::unordered_map<std::string, std::unique_ptr<TokenBucket>> buckets_;
	std::mutex mutex_;
};

}
#pragma once
#include "token_bucket.h"
#include <unordered_map>
#include <string>
#include <mutex>

namespace sonet::gateway::rate_limit {

struct LimitConfig { int capacity; int refill; int interval_ms; };

class RateLimiter {
public:
	explicit RateLimiter(LimitConfig cfg): cfg_(cfg) {}

	bool allow(const std::string& key) {
		std::lock_guard<std::mutex> lock(mu_);
		auto& bucket = buckets_[key];
		if (!bucket) {
			bucket = std::make_unique<TokenBucket>(cfg_.capacity, cfg_.refill, std::chrono::milliseconds(cfg_.interval_ms));
		}
		return bucket->consume();
	}

private:
	LimitConfig cfg_;
	std::unordered_map<std::string, std::unique_ptr<TokenBucket>> buckets_;
	std::mutex mu_;
};

} // namespace sonet::gateway::rate_limit
