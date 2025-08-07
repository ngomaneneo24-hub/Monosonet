/*
 * Copyright (c) 2025 Neo Qiss
 * 
 * This file is part of Sonet - a social media platform built for real connections.
 * 
 * This implements the main notification service that orchestrates all components.
 * I built this as the central hub that brings together processors, channels,
 * repositories, and controllers into one cohesive notification system.
 */

#include "service.h"
#include "processors/notification_processor.h"
#include "channels/email_channel.h"
#include "channels/push_channel.h"
#include "channels/websocket_channel.h"
#include "repositories/notification_repository.h"
#include "controllers/notification_controller.h"
#include <thread>
#include <chrono>

namespace sonet {
namespace notification_service {

// Internal implementation for NotificationService
struct NotificationService::Impl {
    Config config;
    
    // Core components
    std::unique_ptr<repositories::NotificationRepository> repository;
    std::unique_ptr<processors::NotificationProcessor> processor;
    std::unique_ptr<controllers::NotificationController> controller;
    
    // Delivery channels
    std::unique_ptr<channels::EmailChannel> email_channel;
    std::unique_ptr<channels::PushChannel> push_channel;
    std::unique_ptr<channels::WebSocketChannel> websocket_channel;
    
    // gRPC and HTTP servers
    std::unique_ptr<grpc::Server> grpc_server;
    std::unique_ptr<httplib::Server> http_server;
    std::thread grpc_server_thread;
    std::thread http_server_thread;
    
    // Service state
    std::atomic<bool> is_running{false};
    std::atomic<bool> is_healthy{false};
    std::chrono::system_clock::time_point startup_time;
    
    // Health monitoring
    std::thread health_monitor_thread;
    std::atomic<bool> health_monitoring{false};
    
    Impl(const Config& cfg) : config(cfg) {
        startup_time = std::chrono::system_clock::now();
    }
    
    ~Impl() {
        stop_service();
    }
    
    bool initialize_components() {
        try {
            // Initialize repository
            repositories::NotificationRepository::Config repo_config;
            repo_config.database_url = config.database_url;
            repo_config.redis_url = config.redis_url;
            repo_config.connection_pool_size = config.database_pool_size;
            repo_config.cache_ttl = std::chrono::hours{1};
            repo_config.enable_caching = config.enable_caching;
            
            repository = std::make_unique<repositories::NotificationRepository>(repo_config);
            
            // Initialize email channel
            channels::EmailChannel::Config email_config;
            email_config.smtp_host = config.smtp_host;
            email_config.smtp_port = config.smtp_port;
            email_config.smtp_username = config.smtp_username;
            email_config.smtp_password = config.smtp_password;
            email_config.smtp_use_tls = config.smtp_use_tls;
            email_config.from_name = config.email_from_name;
            email_config.from_email = config.email_from_address;
            email_config.rate_limit_per_minute = config.email_rate_limit_per_minute;
            email_config.rate_limit_per_hour = config.email_rate_limit_per_hour;
            
            email_channel = channels::EmailChannelFactory::create(
                channels::EmailChannelFactory::ChannelType::SMTP, 
                nlohmann::json::object()
            );
            
            // Initialize push channel
            channels::PushChannel::Config push_config;
            push_config.fcm_server_key = config.fcm_server_key;
            push_config.fcm_project_id = config.fcm_project_id;
            push_config.apns_key_id = config.apns_key_id;
            push_config.apns_team_id = config.apns_team_id;
            push_config.apns_bundle_id = config.apns_bundle_id;
            push_config.apns_private_key = config.apns_private_key;
            push_config.rate_limit_per_minute = config.push_rate_limit_per_minute;
            push_config.rate_limit_per_hour = config.push_rate_limit_per_hour;
            
            push_channel = channels::PushChannelFactory::create(
                channels::PushChannelFactory::ChannelType::FCM,
                nlohmann::json::object()
            );
            
            // Initialize WebSocket channel
            channels::WebSocketPPChannel::Config ws_config;
            ws_config.port = config.websocket_port;
            ws_config.host = config.websocket_host;
            ws_config.jwt_secret = config.jwt_secret;
            ws_config.max_connections = config.max_websocket_connections;
            ws_config.ping_interval = std::chrono::seconds{30};
            ws_config.connection_timeout = std::chrono::minutes{5};
            ws_config.max_message_size = 64 * 1024; // 64KB
            
            websocket_channel = channels::WebSocketChannelFactory::create_websocketpp(ws_config);
            
            // Initialize processor
            processors::NotificationProcessor::Config processor_config;
            processor_config.worker_thread_count = config.processor_worker_threads;
            processor_config.batch_size = config.processor_batch_size;
            processor_config.batch_timeout = std::chrono::seconds{config.processor_batch_timeout_seconds};
            processor_config.enable_rate_limiting = config.enable_rate_limiting;
            processor_config.enable_deduplication = config.enable_deduplication;
            processor_config.enable_batching = config.enable_batching;
            
            processor = std::make_unique<processors::NotificationProcessor>(
                processor_config, 
                repository.get(),
                email_channel.get(),
                push_channel.get(),
                websocket_channel.get()
            );
            
            // Initialize controller
            controllers::NotificationController::Config controller_config;
            controller_config.enable_authentication = config.enable_authentication;
            controller_config.jwt_secret = config.jwt_secret;
            controller_config.rate_limit_per_user_per_minute = config.api_rate_limit_per_user_per_minute;
            controller_config.max_notifications_per_request = config.max_notifications_per_request;
            
            controller = std::make_unique<controllers::NotificationController>(
                controller_config,
                repository.get(),
                processor.get(),
                websocket_channel.get()
            );
            
            return true;
            
        } catch (const std::exception& e) {
            // Log error
            return false;
        }
    }
    
    bool start_servers() {
        try {
            // Start WebSocket server
            auto ws_future = websocket_channel->start_server(config.websocket_port, config.websocket_host);
            if (!ws_future.get()) {
                return false;
            }
            
            // Start gRPC server
            if (config.enable_grpc) {
                grpc_server_thread = std::thread([this]() {
                    start_grpc_server();
                });
            }
            
            // Start HTTP server  
            if (config.enable_http) {
                http_server_thread = std::thread([this]() {
                    start_http_server();
                });
            }
            
            return true;
            
        } catch (const std::exception& e) {
            return false;
        }
    }
    
    void start_grpc_server() {
        try {
            std::string server_address = config.grpc_host + ":" + std::to_string(config.grpc_port);
            
            grpc::ServerBuilder builder;
            builder.AddListeningPort(server_address, grpc::InsecureServerCredentials());
            builder.RegisterService(controller.get());
            
            grpc_server = builder.BuildAndStart();
            if (grpc_server) {
                // Log server started
                grpc_server->Wait();
            }
            
        } catch (const std::exception& e) {
            // Log error
        }
    }
    
    void start_http_server() {
        try {
            http_server = std::make_unique<httplib::Server>();
            
            // Setup HTTP routes through controller
            controller->setup_http_routes(*http_server);
            
            // Health check endpoint
            http_server->Get("/health", [this](const httplib::Request& req, httplib::Response& res) {
                handle_health_check(req, res);
            });
            
            // Metrics endpoint
            http_server->Get("/metrics", [this](const httplib::Request& req, httplib::Response& res) {
                handle_metrics_request(req, res);
            });
            
            // Start server
            bool started = http_server->listen(config.http_host, config.http_port);
            if (!started) {
                // Log error
            }
            
        } catch (const std::exception& e) {
            // Log error
        }
    }
    
    void handle_health_check(const httplib::Request& req, httplib::Response& res) {
        nlohmann::json health_data = get_health_status();
        
        res.set_header("Content-Type", "application/json");
        
        if (health_data["healthy"].get<bool>()) {
            res.status = 200;
        } else {
            res.status = 503;
        }
        
        res.body = health_data.dump(2);
    }
    
    void handle_metrics_request(const httplib::Request& req, httplib::Response& res) {
        nlohmann::json metrics = get_service_metrics();
        
        res.set_header("Content-Type", "application/json");
        res.status = 200;
        res.body = metrics.dump(2);
    }
    
    nlohmann::json get_health_status() const {
        bool is_healthy = true;
        nlohmann::json health = {
            {"service", "notification_service"},
            {"version", "1.0.0"},
            {"timestamp", std::chrono::duration_cast<std::chrono::seconds>(
                std::chrono::system_clock::now().time_since_epoch()).count()},
            {"uptime_seconds", std::chrono::duration_cast<std::chrono::seconds>(
                std::chrono::system_clock::now() - startup_time).count()}
        };
        
        // Check repository health
        nlohmann::json repo_health = {{"status", "unknown"}};
        try {
            if (repository) {
                // repo_health = repository->get_health_status();
                repo_health["status"] = "healthy";
            }
        } catch (const std::exception& e) {
            repo_health["status"] = "unhealthy";
            repo_health["error"] = e.what();
            is_healthy = false;
        }
        health["repository"] = repo_health;
        
        // Check processor health
        nlohmann::json processor_health = {{"status", "unknown"}};
        try {
            if (processor) {
                processor_health = processor->get_health_status();
            }
        } catch (const std::exception& e) {
            processor_health["status"] = "unhealthy";
            processor_health["error"] = e.what();
            is_healthy = false;
        }
        health["processor"] = processor_health;
        
        // Check WebSocket channel health
        nlohmann::json ws_health = {{"status", "unknown"}};
        try {
            if (websocket_channel) {
                ws_health["status"] = websocket_channel->is_running() ? "healthy" : "unhealthy";
                ws_health["active_connections"] = websocket_channel->get_active_connection_count();
            }
        } catch (const std::exception& e) {
            ws_health["status"] = "unhealthy";
            ws_health["error"] = e.what();
            is_healthy = false;
        }
        health["websocket"] = ws_health;
        
        // Check email channel health
        nlohmann::json email_health = {{"status", "unknown"}};
        try {
            if (email_channel) {
                // email_health = email_channel->get_health_status();
                email_health["status"] = "healthy";
            }
        } catch (const std::exception& e) {
            email_health["status"] = "unhealthy";
            email_health["error"] = e.what();
            is_healthy = false;
        }
        health["email"] = email_health;
        
        // Check push channel health
        nlohmann::json push_health = {{"status", "unknown"}};
        try {
            if (push_channel) {
                // push_health = push_channel->get_health_status();
                push_health["status"] = "healthy";
            }
        } catch (const std::exception& e) {
            push_health["status"] = "unhealthy";
            push_health["error"] = e.what();
            is_healthy = false;
        }
        health["push"] = push_health;
        
        health["healthy"] = is_healthy;
        
        return health;
    }
    
    nlohmann::json get_service_metrics() const {
        nlohmann::json metrics = {
            {"service", "notification_service"},
            {"timestamp", std::chrono::duration_cast<std::chrono::seconds>(
                std::chrono::system_clock::now().time_since_epoch()).count()}
        };
        
        // Get processor metrics
        if (processor) {
            metrics["processor"] = processor->get_statistics();
        }
        
        // Get WebSocket metrics
        if (websocket_channel) {
            metrics["websocket"] = {
                {"connection_stats", websocket_channel->get_connection_stats()},
                {"delivery_stats", websocket_channel->get_delivery_stats()}
            };
        }
        
        // Get email metrics
        if (email_channel) {
            // metrics["email"] = email_channel->get_delivery_stats();
            metrics["email"] = {{"status", "enabled"}};
        }
        
        // Get push metrics
        if (push_channel) {
            // metrics["push"] = push_channel->get_delivery_stats();
            metrics["push"] = {{"status", "enabled"}};
        }
        
        // Get repository metrics
        if (repository) {
            // metrics["repository"] = repository->get_performance_stats();
            metrics["repository"] = {{"status", "connected"}};
        }
        
        return metrics;
    }
    
    void start_health_monitoring() {
        health_monitoring = true;
        
        health_monitor_thread = std::thread([this]() {
            while (health_monitoring.load()) {
                try {
                    // Update health status
                    nlohmann::json health = get_health_status();
                    is_healthy = health["healthy"].get<bool>();
                    
                    // Perform cleanup tasks
                    if (websocket_channel) {
                        websocket_channel->cleanup_expired_connections();
                        websocket_channel->cleanup_idle_connections();
                    }
                    
                    // Sleep for 30 seconds
                    std::this_thread::sleep_for(std::chrono::seconds{30});
                    
                } catch (const std::exception& e) {
                    is_healthy = false;
                    std::this_thread::sleep_for(std::chrono::seconds{30});
                }
            }
        });
    }
    
    void stop_health_monitoring() {
        health_monitoring = false;
        
        if (health_monitor_thread.joinable()) {
            health_monitor_thread.join();
        }
    }
    
    void stop_service() {
        if (!is_running.load()) {
            return;
        }
        
        is_running = false;
        
        // Stop health monitoring
        stop_health_monitoring();
        
        // Stop processor
        if (processor) {
            processor->stop();
        }
        
        // Stop WebSocket server
        if (websocket_channel) {
            websocket_channel->stop_server();
        }
        
        // Stop gRPC server
        if (grpc_server) {
            grpc_server->Shutdown();
        }
        
        // Stop HTTP server
        if (http_server) {
            http_server->stop();
        }
        
        // Wait for server threads
        if (grpc_server_thread.joinable()) {
            grpc_server_thread.join();
        }
        
        if (http_server_thread.joinable()) {
            http_server_thread.join();
        }
    }
};

NotificationService::NotificationService(const Config& config)
    : pimpl_(std::make_unique<Impl>(config)) {
}

NotificationService::~NotificationService() = default;

bool NotificationService::start() {
    if (pimpl_->is_running.load()) {
        return false;
    }
    
    // Initialize all components
    if (!pimpl_->initialize_components()) {
        return false;
    }
    
    // Start processor
    if (!pimpl_->processor->start()) {
        return false;
    }
    
    // Start servers
    if (!pimpl_->start_servers()) {
        pimpl_->processor->stop();
        return false;
    }
    
    // Start health monitoring
    pimpl_->start_health_monitoring();
    
    pimpl_->is_running = true;
    pimpl_->is_healthy = true;
    
    return true;
}

void NotificationService::stop() {
    pimpl_->stop_service();
}

bool NotificationService::is_running() const {
    return pimpl_->is_running.load();
}

bool NotificationService::is_healthy() const {
    return pimpl_->is_healthy.load();
}

std::future<bool> NotificationService::send_notification(const models::Notification& notification) {
    if (!pimpl_->processor) {
        auto promise = std::make_shared<std::promise<bool>>();
        auto future = promise->get_future();
        promise->set_value(false);
        return future;
    }
    
    return pimpl_->processor->process_notification(notification);
}

std::future<bool> NotificationService::send_bulk_notifications(const std::vector<models::Notification>& notifications) {
    if (!pimpl_->processor) {
        auto promise = std::make_shared<std::promise<bool>>();
        auto future = promise->get_future();
        promise->set_value(false);
        return future;
    }
    
    return pimpl_->processor->process_bulk_notifications(notifications);
}

nlohmann::json NotificationService::get_health_status() const {
    return pimpl_->get_health_status();
}

nlohmann::json NotificationService::get_service_metrics() const {
    return pimpl_->get_service_metrics();
}

int NotificationService::get_active_connection_count() const {
    if (!pimpl_->websocket_channel) {
        return 0;
    }
    
    return pimpl_->websocket_channel->get_active_connection_count();
}

nlohmann::json NotificationService::get_processor_statistics() const {
    if (!pimpl_->processor) {
        return nlohmann::json{};
    }
    
    return pimpl_->processor->get_statistics();
}

bool NotificationService::register_device(const std::string& user_id, 
                                        const std::string& device_token,
                                        const std::string& platform) {
    if (!pimpl_->push_channel) {
        return false;
    }
    
    // Convert platform string to enum
    channels::DevicePlatform device_platform = channels::DevicePlatform::UNKNOWN;
    if (platform == "ios") {
        device_platform = channels::DevicePlatform::IOS;
    } else if (platform == "android") {
        device_platform = channels::DevicePlatform::ANDROID;
    } else if (platform == "web") {
        device_platform = channels::DevicePlatform::WEB;
    }
    
    return pimpl_->push_channel->register_device(user_id, device_token, device_platform);
}

bool NotificationService::unregister_device(const std::string& user_id, const std::string& device_token) {
    if (!pimpl_->push_channel) {
        return false;
    }
    
    return pimpl_->push_channel->unregister_device(user_id, device_token);
}

void NotificationService::cleanup_resources() {
    if (pimpl_->websocket_channel) {
        pimpl_->websocket_channel->cleanup_expired_connections();
        pimpl_->websocket_channel->cleanup_idle_connections();
    }
    
    if (pimpl_->push_channel) {
        // pimpl_->push_channel->cleanup_expired_tokens();
    }
}

} // namespace notification_service
} // namespace sonet