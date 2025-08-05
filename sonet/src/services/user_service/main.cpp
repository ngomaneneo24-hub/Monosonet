/*
 * Copyright (c) 2025 Neo Qiss
 * All rights reserved.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

#include "user_service_impl.h"
#include "user_repository.h"
#include "password_manager.h"
#include "jwt_manager.h"
#include "session_manager.h"
#include "security_utils.h"
#include <grpcpp/server.h>
#include <grpcpp/server_builder.h>
#include <grpcpp/security/server_credentials.h>
#include <spdlog/spdlog.h>
#include <spdlog/sinks/stdout_color_sinks.h>
#include <pqxx/pqxx>
#include <nlohmann/json.hpp>
#include <fstream>
#include <memory>
#include <signal.h>

namespace sonet::user {

/**
 * Configuration structure for the User Service server
 */
struct ServerConfig {
    std::string server_address = "0.0.0.0:50051";
    std::string database_host = "localhost";
    int database_port = 5432;
    std::string database_name = "sonet_users";
    std::string database_user = "sonet";
    std::string database_password = "sonet123";
    int database_pool_size = 10;
    std::string jwt_secret = "";
    std::string jwt_issuer = "sonet-user-service";
    std::string redis_host = "localhost";
    int redis_port = 6379;
    std::string log_level = "info";
    
    static ServerConfig load_from_file(const std::string& config_file) {
        ServerConfig config;
        
        try {
            std::ifstream file(config_file);
            if (!file.is_open()) {
                spdlog::warn("Config file not found: {}, using defaults", config_file);
                return config;
            }
            
            nlohmann::json json_config;
            file >> json_config;
            
            // Parse configuration
            if (json_config.contains("server")) {
                auto server_config = json_config["server"];
                config.server_address = server_config.value("address", config.server_address);
            }
            
            if (json_config.contains("database")) {
                auto db_config = json_config["database"];
                config.database_host = db_config.value("host", config.database_host);
                config.database_port = db_config.value("port", config.database_port);
                config.database_name = db_config.value("database", config.database_name);
                config.database_user = db_config.value("user", config.database_user);
                config.database_password = db_config.value("password", config.database_password);
                config.database_pool_size = db_config.value("pool_size", config.database_pool_size);
            }
            
            if (json_config.contains("jwt")) {
                auto jwt_config = json_config["jwt"];
                config.jwt_secret = jwt_config.value("secret", config.jwt_secret);
                config.jwt_issuer = jwt_config.value("issuer", config.jwt_issuer);
            }
            
            if (json_config.contains("redis")) {
                auto redis_config = json_config["redis"];
                config.redis_host = redis_config.value("host", config.redis_host);
                config.redis_port = redis_config.value("port", config.redis_port);
            }
            
            if (json_config.contains("logging")) {
                auto log_config = json_config["logging"];
                config.log_level = log_config.value("level", config.log_level);
            }
            
            spdlog::info("Configuration loaded from: {}", config_file);
            
        } catch (const std::exception& e) {
            spdlog::error("Failed to load config file {}: {}", config_file, e.what());
            spdlog::info("Using default configuration");
        }
        
        return config;
    }
};

/**
 * User Service Server implementation
 */
class UserServiceServer {
public:
    explicit UserServiceServer(const ServerConfig& config) : config_(config) {
        setup_logging();
        setup_database();
        setup_security_components();
        setup_grpc_service();
    }
    
    void run() {
        spdlog::info("Starting User Service server on {}", config_.server_address);
        
        // Build the server
        grpc::ServerBuilder builder;
        builder.AddListeningPort(config_.server_address, grpc::InsecureServerCredentials());
        builder.RegisterService(user_service_.get());
        
        // Configure server parameters
        builder.SetMaxReceiveMessageSize(4 * 1024 * 1024);  // 4MB
        builder.SetMaxSendMessageSize(4 * 1024 * 1024);     // 4MB
        builder.SetOption(grpc::MakeChannelArgumentOption(GRPC_ARG_KEEPALIVE_TIME_MS, 30000));
        builder.SetOption(grpc::MakeChannelArgumentOption(GRPC_ARG_KEEPALIVE_TIMEOUT_MS, 5000));
        builder.SetOption(grpc::MakeChannelArgumentOption(GRPC_ARG_HTTP2_MAX_PINGS_WITHOUT_DATA, 0));
        builder.SetOption(grpc::MakeChannelArgumentOption(GRPC_ARG_HTTP2_MIN_PING_INTERVAL_WITHOUT_DATA_MS, 300000));
        builder.SetOption(grpc::MakeChannelArgumentOption(GRPC_ARG_HTTP2_MIN_RECV_PING_INTERVAL_WITHOUT_DATA_MS, 300000));
        
        server_ = builder.BuildAndStart();
        
        if (!server_) {
            spdlog::error("Failed to start server");
            return;
        }
        
        spdlog::info("User Service server started successfully");
        spdlog::info("Server listening on {}", config_.server_address);
        
        // Setup signal handling for graceful shutdown
        setup_signal_handling();
        
        // Wait for the server to shutdown
        server_->Wait();
    }
    
    void shutdown() {
        spdlog::info("Shutting down User Service server...");
        
        if (server_) {
            server_->Shutdown();
        }
        
        // Cleanup components
        if (session_manager_) {
            session_manager_->cleanup_expired_sessions();
        }
        
        spdlog::info("User Service server shut down gracefully");
    }

private:
    ServerConfig config_;
    std::unique_ptr<grpc::Server> server_;
    std::shared_ptr<pqxx::connection_pool> db_pool_;
    std::shared_ptr<UserRepository> repository_;
    std::shared_ptr<PasswordManager> password_manager_;
    std::shared_ptr<JWTManager> jwt_manager_;
    std::shared_ptr<SessionManager> session_manager_;
    std::unique_ptr<UserServiceImpl> user_service_;
    
    void setup_logging() {
        // Set log level
        if (config_.log_level == "debug") {
            spdlog::set_level(spdlog::level::debug);
        } else if (config_.log_level == "info") {
            spdlog::set_level(spdlog::level::info);
        } else if (config_.log_level == "warn") {
            spdlog::set_level(spdlog::level::warn);
        } else if (config_.log_level == "error") {
            spdlog::set_level(spdlog::level::err);
        }
        
        // Create a color console logger
        auto console = spdlog::stdout_color_mt("console");
        spdlog::set_default_logger(console);
        spdlog::set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%l] [%t] %v");
        
        spdlog::info("Logging initialized with level: {}", config_.log_level);
    }
    
    void setup_database() {
        try {
            // Build connection string
            std::string connection_string = fmt::format(
                "host={} port={} dbname={} user={} password={}",
                config_.database_host,
                config_.database_port,
                config_.database_name,
                config_.database_user,
                config_.database_password
            );
            
            // Create connection pool
            db_pool_ = std::make_shared<pqxx::connection_pool>(
                connection_string,
                config_.database_pool_size
            );
            
            // Test connection
            {
                auto conn = db_pool_->acquire();
                pqxx::work txn{*conn, "test_connection"};
                auto result = txn.exec("SELECT 1");
                txn.commit();
            }
            
            // Create repository
            repository_ = std::make_shared<UserRepository>(db_pool_);
            
            spdlog::info("Database connection established successfully");
            spdlog::info("Database pool size: {}", config_.database_pool_size);
            
        } catch (const std::exception& e) {
            spdlog::error("Failed to setup database: {}", e.what());
            throw;
        }
    }
    
    void setup_security_components() {
        try {
            // Generate JWT secret if not provided
            std::string jwt_secret = config_.jwt_secret;
            if (jwt_secret.empty()) {
                jwt_secret = SecurityUtils::generate_random_string(64);
                spdlog::warn("JWT secret not configured, generated random secret");
            }
            
            // Create security components
            password_manager_ = std::make_shared<PasswordManager>();
            jwt_manager_ = std::make_shared<JWTManager>(jwt_secret, config_.jwt_issuer);
            session_manager_ = std::make_shared<SessionManager>(repository_);
            
            // Configure token lifetimes
            jwt_manager_->set_access_token_lifetime(std::chrono::minutes(15));
            jwt_manager_->set_refresh_token_lifetime(std::chrono::hours(168)); // 7 days
            
            spdlog::info("Security components initialized successfully");
            
        } catch (const std::exception& e) {
            spdlog::error("Failed to setup security components: {}", e.what());
            throw;
        }
    }
    
    void setup_grpc_service() {
        try {
            user_service_ = std::make_unique<UserServiceImpl>(
                repository_,
                password_manager_,
                jwt_manager_,
                session_manager_
            );
            
            spdlog::info("gRPC service implementation created successfully");
            
        } catch (const std::exception& e) {
            spdlog::error("Failed to setup gRPC service: {}", e.what());
            throw;
        }
    }
    
    void setup_signal_handling() {
        // Set up signal handling for graceful shutdown
        static UserServiceServer* server_instance = this;
        
        signal(SIGINT, [](int signal) {
            spdlog::info("Received signal {}, initiating graceful shutdown", signal);
            if (server_instance) {
                server_instance->shutdown();
            }
        });
        
        signal(SIGTERM, [](int signal) {
            spdlog::info("Received signal {}, initiating graceful shutdown", signal);
            if (server_instance) {
                server_instance->shutdown();
            }
        });
    }
};

} // namespace sonet::user

int main(int argc, char** argv) {
    try {
        // Load configuration
        std::string config_file = "config/development/services.json";
        if (argc > 1) {
            config_file = argv[1];
        }
        
        auto config = sonet::user::ServerConfig::load_from_file(config_file);
        
        // Create and run server
        sonet::user::UserServiceServer server(config);
        server.run();
        
        return 0;
        
    } catch (const std::exception& e) {
        spdlog::error("Server startup failed: {}", e.what());
        return 1;
    }
}
