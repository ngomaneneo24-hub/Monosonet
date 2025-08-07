/*
 * Copyright (c) 2025 Neo Qiss
 * 
 * This file is part of Sonet - a social media platform built for real connections.
 * 
 * Search controller for handling Twitter-scale search requests.
 * This orchestrates all search operations with intelligent routing,
 * caching, rate limiting, and real-time responses.
 */

#pragma once

#include "../engines/elasticsearch_engine.h"
#include "../indexers/note_indexer.h"
#include "../indexers/user_indexer.h"
#include "../models/search_query.h"
#include "../models/search_result.h"
#include <nlohmann/json.hpp>
#include <string>
#include <vector>
#include <memory>
#include <future>
#include <chrono>
#include <unordered_map>
#include <atomic>
#include <mutex>
#include <functional>

// Forward declarations for HTTP and gRPC frameworks
struct mg_connection;
namespace grpc { class ServerContext; }

namespace sonet {
namespace search_service {
namespace controllers {

/**
 * Search request context
 */
struct SearchRequestContext {
    // Request identification
    std::string request_id;
    std::string correlation_id;
    std::chrono::system_clock::time_point request_time;
    
    // Client information
    std::string client_ip;
    std::string user_agent;
    std::string client_version;
    std::string platform;  // web, ios, android, api
    
    // Authentication
    std::string user_id;
    std::string session_id;
    std::string auth_token;
    bool is_authenticated = false;
    bool is_verified = false;
    std::vector<std::string> user_roles;
    
    // Request metadata
    std::string accept_language = "en";
    std::string timezone = "UTC";
    std::unordered_map<std::string, std::string> headers;
    std::unordered_map<std::string, std::string> query_params;
    
    // Rate limiting
    int requests_per_minute = 0;
    int requests_per_hour = 0;
    std::chrono::system_clock::time_point rate_limit_reset;
    
    // Performance tracking
    std::chrono::system_clock::time_point start_time;
    std::chrono::milliseconds processing_time;
    bool from_cache = false;
    
    /**
     * Get request context as JSON
     */
    nlohmann::json to_json() const;
    
    /**
     * Check if request should be rate limited
     */
    bool should_rate_limit(int max_requests_per_minute, int max_requests_per_hour) const;
    
    /**
     * Generate cache key for this request
     */
    std::string generate_cache_key(const std::string& query_hash) const;
};

/**
 * Search response wrapper
 */
struct SearchResponse {
    // Response data
    models::SearchResult result;
    nlohmann::json metadata;
    
    // Status information
    int status_code = 200;
    std::string status_message = "OK";
    std::vector<std::string> warnings;
    std::vector<std::string> errors;
    
    // Performance metrics
    std::chrono::milliseconds total_time;
    std::chrono::milliseconds search_time;
    std::chrono::milliseconds cache_time;
    bool from_cache = false;
    
    // Pagination
    bool has_more = false;
    std::string next_cursor;
    std::string scroll_id;
    
    // Rate limiting headers
    int rate_limit_remaining = 0;
    std::chrono::system_clock::time_point rate_limit_reset;
    
    /**
     * Convert to JSON response
     */
    nlohmann::json to_json() const;
    
    /**
     * Convert to HTTP response
     */
    std::string to_http_response() const;
    
    /**
     * Add performance metadata
     */
    void add_performance_metadata(const SearchRequestContext& context);
    
    /**
     * Add rate limit headers
     */
    void add_rate_limit_headers(int remaining, std::chrono::system_clock::time_point reset_time);
};

/**
 * Search controller configuration
 */
struct SearchControllerConfig {
    // HTTP server settings
    int http_port = 8080;
    std::string bind_address = "0.0.0.0";
    int max_connections = 1000;
    int connection_timeout_seconds = 30;
    bool enable_cors = true;
    std::vector<std::string> cors_origins = {"*"};
    
    // gRPC server settings
    int grpc_port = 9090;
    std::string grpc_bind_address = "0.0.0.0";
    int grpc_max_connections = 500;
    bool enable_grpc_reflection = true;
    bool enable_grpc_health_check = true;
    
    // Rate limiting
    bool enable_rate_limiting = true;
    int default_rate_limit_per_minute = 60;
    int default_rate_limit_per_hour = 1000;
    int authenticated_rate_limit_per_minute = 300;
    int authenticated_rate_limit_per_hour = 5000;
    int verified_rate_limit_per_minute = 1000;
    int verified_rate_limit_per_hour = 20000;
    
    // Caching
    bool enable_response_caching = true;
    std::chrono::minutes cache_ttl = std::chrono::minutes{5};
    int max_cache_size_mb = 500;
    bool cache_authenticated_requests = false;
    
    // Security
    bool enable_authentication = true;
    bool require_https = false;
    std::vector<std::string> api_keys;
    std::string jwt_secret;
    std::chrono::hours jwt_expiry = std::chrono::hours{24};
    
    // Performance
    std::chrono::milliseconds default_timeout = std::chrono::milliseconds{5000};
    std::chrono::milliseconds max_timeout = std::chrono::milliseconds{30000};
    int max_results_per_request = 100;
    int default_results_per_request = 20;
    bool enable_query_optimization = true;
    
    // Monitoring
    bool enable_request_logging = true;
    bool enable_slow_query_logging = true;
    std::chrono::milliseconds slow_query_threshold = std::chrono::milliseconds{1000};
    bool enable_metrics_collection = true;
    
    // Content filtering
    bool enable_content_filtering = true;
    bool filter_nsfw_by_default = true;
    bool filter_spam_content = true;
    std::vector<std::string> blocked_terms;
    
    /**
     * Get default production configuration
     */
    static SearchControllerConfig production_config();
    
    /**
     * Get development configuration
     */
    static SearchControllerConfig development_config();
    
    /**
     * Load from environment variables
     */
    static SearchControllerConfig from_environment();
    
    /**
     * Validate configuration
     */
    bool is_valid() const;
};

/**
 * Request metrics and statistics
 */
struct RequestMetrics {
    std::atomic<long> total_requests{0};
    std::atomic<long> successful_requests{0};
    std::atomic<long> failed_requests{0};
    std::atomic<long> rate_limited_requests{0};
    std::atomic<long> cached_requests{0};
    
    std::atomic<long> search_requests{0};
    std::atomic<long> suggestion_requests{0};
    std::atomic<long> trending_requests{0};
    std::atomic<long> autocomplete_requests{0};
    
    std::atomic<long> total_response_time_ms{0};
    std::atomic<long> total_search_time_ms{0};
    std::atomic<long> total_cache_time_ms{0};
    
    std::atomic<long> http_requests{0};
    std::atomic<long> grpc_requests{0};
    std::atomic<long> websocket_requests{0};
    
    std::chrono::system_clock::time_point last_reset;
    
    /**
     * Get metrics as JSON
     */
    nlohmann::json to_json() const;
    
    /**
     * Reset metrics
     */
    void reset();
    
    /**
     * Calculate average response time
     */
    double get_average_response_time_ms() const;
    
    /**
     * Calculate success rate
     */
    double get_success_rate() const;
    
    /**
     * Calculate cache hit rate
     */
    double get_cache_hit_rate() const;
    
    /**
     * Calculate requests per second
     */
    double get_requests_per_second() const;
};

/**
 * Rate limiter for controlling request frequency
 */
class RateLimiter {
public:
    /**
     * Constructor
     */
    explicit RateLimiter(const SearchControllerConfig& config);
    
    /**
     * Check if request should be allowed
     */
    bool is_allowed(const SearchRequestContext& context);
    
    /**
     * Get remaining requests for client
     */
    int get_remaining_requests(const std::string& client_id, std::chrono::minutes window);
    
    /**
     * Get rate limit reset time
     */
    std::chrono::system_clock::time_point get_reset_time(const std::string& client_id);
    
    /**
     * Clear rate limit data for client
     */
    void clear_client_data(const std::string& client_id);
    
    /**
     * Get rate limit statistics
     */
    nlohmann::json get_statistics() const;

private:
    struct Impl;
    std::unique_ptr<Impl> pimpl_;
};

/**
 * Response cache for improved performance
 */
class ResponseCache {
public:
    /**
     * Constructor
     */
    explicit ResponseCache(const SearchControllerConfig& config);
    
    /**
     * Get cached response
     */
    std::optional<SearchResponse> get(const std::string& cache_key);
    
    /**
     * Store response in cache
     */
    void put(const std::string& cache_key, const SearchResponse& response);
    
    /**
     * Remove response from cache
     */
    void remove(const std::string& cache_key);
    
    /**
     * Clear all cached responses
     */
    void clear();
    
    /**
     * Get cache statistics
     */
    nlohmann::json get_statistics() const;
    
    /**
     * Cleanup expired entries
     */
    void cleanup_expired();

private:
    struct Impl;
    std::unique_ptr<Impl> pimpl_;
};

/**
 * Authentication and authorization handler
 */
class AuthenticationHandler {
public:
    /**
     * Constructor
     */
    explicit AuthenticationHandler(const SearchControllerConfig& config);
    
    /**
     * Authenticate request using JWT token
     */
    bool authenticate_jwt(SearchRequestContext& context, const std::string& token);
    
    /**
     * Authenticate request using API key
     */
    bool authenticate_api_key(SearchRequestContext& context, const std::string& api_key);
    
    /**
     * Check if user has required permissions
     */
    bool has_permission(const SearchRequestContext& context, const std::string& permission);
    
    /**
     * Generate JWT token for user
     */
    std::string generate_jwt_token(const std::string& user_id, const std::vector<std::string>& roles);
    
    /**
     * Validate and parse JWT token
     */
    std::optional<nlohmann::json> validate_jwt_token(const std::string& token);

private:
    struct Impl;
    std::unique_ptr<Impl> pimpl_;
};

/**
 * Main search controller class
 * 
 * This handles all incoming search requests via HTTP/gRPC and coordinates
 * with the search engine and indexers to provide Twitter-scale search capabilities.
 */
class SearchController {
public:
    /**
     * Constructor
     */
    explicit SearchController(
        std::shared_ptr<engines::ElasticsearchEngine> engine,
        std::shared_ptr<indexers::NoteIndexer> note_indexer,
        std::shared_ptr<indexers::UserIndexer> user_indexer,
        const SearchControllerConfig& config = SearchControllerConfig::production_config()
    );
    
    /**
     * Destructor - ensures clean shutdown
     */
    ~SearchController();
    
    // Non-copyable and non-movable
    SearchController(const SearchController&) = delete;
    SearchController& operator=(const SearchController&) = delete;
    SearchController(SearchController&&) = delete;
    SearchController& operator=(SearchController&&) = delete;
    
    /**
     * Start the controller (HTTP and gRPC servers)
     */
    std::future<bool> start();
    
    /**
     * Stop the controller gracefully
     */
    void stop();
    
    /**
     * Check if controller is running
     */
    bool is_running() const;
    
    /**
     * SEARCH ENDPOINTS
     */
    
    /**
     * Main search endpoint
     */
    std::future<SearchResponse> search(
        const std::string& query,
        const SearchRequestContext& context
    );
    
    /**
     * Advanced search with complex filters
     */
    std::future<SearchResponse> advanced_search(
        const models::SearchQuery& search_query,
        const SearchRequestContext& context
    );
    
    /**
     * Search notes only
     */
    std::future<SearchResponse> search_notes(
        const std::string& query,
        const SearchRequestContext& context,
        const std::unordered_map<std::string, std::string>& filters = {}
    );
    
    /**
     * Search users only
     */
    std::future<SearchResponse> search_users(
        const std::string& query,
        const SearchRequestContext& context,
        const std::unordered_map<std::string, std::string>& filters = {}
    );
    
    /**
     * Search hashtags only
     */
    std::future<SearchResponse> search_hashtags(
        const std::string& query,
        const SearchRequestContext& context
    );
    
    /**
     * REAL-TIME AND TRENDING
     */
    
    /**
     * Get trending hashtags
     */
    std::future<SearchResponse> get_trending_hashtags(
        const SearchRequestContext& context,
        std::chrono::hours time_window = std::chrono::hours{24}
    );
    
    /**
     * Get trending notes
     */
    std::future<SearchResponse> get_trending_notes(
        const SearchRequestContext& context,
        std::chrono::hours time_window = std::chrono::hours{6}
    );
    
    /**
     * Get trending users
     */
    std::future<SearchResponse> get_trending_users(
        const SearchRequestContext& context,
        std::chrono::hours time_window = std::chrono::hours{24}
    );
    
    /**
     * Real-time search (live updates)
     */
    std::future<SearchResponse> real_time_search(
        const std::string& query,
        const SearchRequestContext& context,
        std::chrono::seconds max_age = std::chrono::seconds{60}
    );
    
    /**
     * SUGGESTIONS AND AUTOCOMPLETE
     */
    
    /**
     * Get search suggestions/autocomplete
     */
    std::future<SearchResponse> get_suggestions(
        const std::string& partial_query,
        const SearchRequestContext& context,
        int max_suggestions = 10
    );
    
    /**
     * Get hashtag suggestions
     */
    std::future<SearchResponse> get_hashtag_suggestions(
        const std::string& partial_hashtag,
        const SearchRequestContext& context,
        int max_suggestions = 10
    );
    
    /**
     * Get user suggestions
     */
    std::future<SearchResponse> get_user_suggestions(
        const std::string& partial_username,
        const SearchRequestContext& context,
        int max_suggestions = 10
    );
    
    /**
     * ANALYTICS AND INSIGHTS
     */
    
    /**
     * Get search analytics
     */
    std::future<SearchResponse> get_search_analytics(
        const SearchRequestContext& context,
        std::chrono::hours time_window = std::chrono::hours{24}
    );
    
    /**
     * Get popular searches
     */
    std::future<SearchResponse> get_popular_searches(
        const SearchRequestContext& context,
        std::chrono::hours time_window = std::chrono::hours{24}
    );
    
    /**
     * Get search suggestions based on user history
     */
    std::future<SearchResponse> get_personalized_suggestions(
        const SearchRequestContext& context,
        int max_suggestions = 10
    );
    
    /**
     * SCROLLING AND PAGINATION
     */
    
    /**
     * Continue scroll search
     */
    std::future<SearchResponse> scroll_search(
        const std::string& scroll_id,
        const SearchRequestContext& context,
        std::chrono::minutes keep_alive = std::chrono::minutes{5}
    );
    
    /**
     * Get next page of results
     */
    std::future<SearchResponse> get_next_page(
        const std::string& cursor,
        const SearchRequestContext& context
    );
    
    /**
     * INDEXING OPERATIONS (Administrative)
     */
    
    /**
     * Index note (for real-time updates)
     */
    std::future<SearchResponse> index_note(
        const nlohmann::json& note_data,
        const SearchRequestContext& context
    );
    
    /**
     * Index user (for real-time updates)
     */
    std::future<SearchResponse> index_user(
        const nlohmann::json& user_data,
        const SearchRequestContext& context
    );
    
    /**
     * Delete note from index
     */
    std::future<SearchResponse> delete_note(
        const std::string& note_id,
        const SearchRequestContext& context
    );
    
    /**
     * Delete user from index
     */
    std::future<SearchResponse> delete_user(
        const std::string& user_id,
        const SearchRequestContext& context
    );
    
    /**
     * Refresh indices
     */
    std::future<SearchResponse> refresh_indices(
        const SearchRequestContext& context
    );
    
    /**
     * HEALTH AND STATUS
     */
    
    /**
     * Health check endpoint
     */
    std::future<SearchResponse> health_check(
        const SearchRequestContext& context
    );
    
    /**
     * Get detailed status
     */
    std::future<SearchResponse> get_status(
        const SearchRequestContext& context
    );
    
    /**
     * Get performance metrics
     */
    std::future<SearchResponse> get_metrics(
        const SearchRequestContext& context
    );
    
    /**
     * CONFIGURATION AND MONITORING
     */
    
    /**
     * Get current configuration
     */
    SearchControllerConfig get_config() const;
    
    /**
     * Update configuration (may require restart)
     */
    void update_config(const SearchControllerConfig& new_config);
    
    /**
     * Get request metrics
     */
    RequestMetrics get_request_metrics() const;
    
    /**
     * Enable/disable debug mode
     */
    void set_debug_mode(bool enabled);
    
    /**
     * Register custom search handler
     */
    void register_custom_handler(
        const std::string& endpoint,
        std::function<std::future<SearchResponse>(const SearchRequestContext&)> handler
    );

private:
    struct Impl;
    std::unique_ptr<Impl> pimpl_;
    
    /**
     * HTTP request handlers
     */
    void handle_http_request(mg_connection* conn, const std::string& uri, const std::string& method, const std::string& body);
    void handle_search_http(mg_connection* conn, const nlohmann::json& request_body);
    void handle_suggestions_http(mg_connection* conn, const nlohmann::json& request_body);
    void handle_trending_http(mg_connection* conn, const nlohmann::json& request_body);
    void handle_health_http(mg_connection* conn);
    
    /**
     * gRPC request handlers
     */
    std::future<SearchResponse> handle_search_grpc(const nlohmann::json& request, grpc::ServerContext* context);
    std::future<SearchResponse> handle_suggestions_grpc(const nlohmann::json& request, grpc::ServerContext* context);
    std::future<SearchResponse> handle_trending_grpc(const nlohmann::json& request, grpc::ServerContext* context);
    
    /**
     * Request processing pipeline
     */
    SearchRequestContext create_request_context(const std::string& client_ip, const std::unordered_map<std::string, std::string>& headers);
    bool validate_request(const SearchRequestContext& context, SearchResponse& response);
    bool authenticate_request(SearchRequestContext& context, SearchResponse& response);
    bool check_rate_limit(const SearchRequestContext& context, SearchResponse& response);
    std::string generate_cache_key(const std::string& query, const SearchRequestContext& context);
    
    /**
     * Response processing
     */
    void add_response_headers(SearchResponse& response, const SearchRequestContext& context);
    void log_request(const SearchRequestContext& context, const SearchResponse& response);
    void update_request_metrics(const SearchRequestContext& context, const SearchResponse& response);
    
    /**
     * Error handling
     */
    SearchResponse create_error_response(int status_code, const std::string& message, const std::vector<std::string>& errors = {});
    SearchResponse create_rate_limit_response(const SearchRequestContext& context);
    SearchResponse create_authentication_error_response();
    
    /**
     * Utility methods
     */
    models::SearchQuery parse_search_query(const std::string& query, const std::unordered_map<std::string, std::string>& params);
    std::unordered_map<std::string, std::string> parse_query_parameters(const std::string& query_string);
    std::string extract_auth_token(const std::unordered_map<std::string, std::string>& headers);
};

/**
 * Search controller factory
 */
class SearchControllerFactory {
public:
    /**
     * Create production controller
     */
    static std::unique_ptr<SearchController> create_production(
        std::shared_ptr<engines::ElasticsearchEngine> engine,
        std::shared_ptr<indexers::NoteIndexer> note_indexer,
        std::shared_ptr<indexers::UserIndexer> user_indexer
    );
    
    /**
     * Create development controller
     */
    static std::unique_ptr<SearchController> create_development(
        std::shared_ptr<engines::ElasticsearchEngine> engine,
        std::shared_ptr<indexers::NoteIndexer> note_indexer,
        std::shared_ptr<indexers::UserIndexer> user_indexer
    );
    
    /**
     * Create testing controller
     */
    static std::unique_ptr<SearchController> create_testing();
    
    /**
     * Create controller from configuration
     */
    static std::unique_ptr<SearchController> create_from_config(
        std::shared_ptr<engines::ElasticsearchEngine> engine,
        std::shared_ptr<indexers::NoteIndexer> note_indexer,
        std::shared_ptr<indexers::UserIndexer> user_indexer,
        const SearchControllerConfig& config
    );
};

/**
 * Controller utilities
 */
namespace controller_utils {
    /**
     * Parse HTTP headers
     */
    std::unordered_map<std::string, std::string> parse_http_headers(const std::string& headers_string);
    
    /**
     * Generate request ID
     */
    std::string generate_request_id();
    
    /**
     * Generate correlation ID
     */
    std::string generate_correlation_id();
    
    /**
     * Extract client IP from headers
     */
    std::string extract_client_ip(const std::unordered_map<std::string, std::string>& headers, const std::string& remote_addr);
    
    /**
     * Parse user agent
     */
    std::unordered_map<std::string, std::string> parse_user_agent(const std::string& user_agent);
    
    /**
     * Build CORS headers
     */
    std::unordered_map<std::string, std::string> build_cors_headers(const SearchControllerConfig& config);
    
    /**
     * Validate search query syntax
     */
    bool validate_search_query(const std::string& query, std::string& error_message);
    
    /**
     * Sanitize search query
     */
    std::string sanitize_search_query(const std::string& query);
    
    /**
     * Convert search result to different formats
     */
    std::string convert_to_xml(const models::SearchResult& result);
    std::string convert_to_csv(const models::SearchResult& result);
    std::vector<uint8_t> convert_to_protobuf(const models::SearchResult& result);
}

} // namespace controllers
} // namespace search_service
} // namespace sonet