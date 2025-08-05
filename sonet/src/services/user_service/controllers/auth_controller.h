/*
 * Copyright (c) 2025 Neo Qiss
 * All rights reserved.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

#pragma once

#include "user_service_impl.h"
#include <grpcpp/server_context.h>
#include <memory>
#include <string>

namespace sonet::user::controllers {

/**
 * Authentication controller handling REST API endpoints for user authentication.
 * This provides HTTP/REST interface on top of the gRPC service.
 */
class AuthController {
public:
    explicit AuthController(std::shared_ptr<UserServiceImpl> user_service);
    ~AuthController() = default;

    // REST endpoint handlers
    struct RegisterRequest {
        std::string username;
        std::string email;
        std::string password;
        std::string full_name;
        std::string bio;
        std::string device_fingerprint;
        int device_type;
    };

    struct LoginRequest {
        std::string username;  // Can be username or email
        std::string password;
        std::string device_fingerprint;
        int device_type;
    };

    struct RefreshTokenRequest {
        std::string refresh_token;
    };

    struct LogoutRequest {
        std::string access_token;
        std::string refresh_token;
    };

    struct VerifyEmailRequest {
        std::string verification_token;
    };

    struct ForgotPasswordRequest {
        std::string email;
    };

    struct ResetPasswordRequest {
        std::string reset_token;
        std::string new_password;
    };

    // Response structures
    struct AuthResponse {
        bool success;
        std::string message;
        std::string access_token;
        std::string refresh_token;
        std::string user_id;
        int64_t access_token_expires_at;
        int64_t refresh_token_expires_at;
        nlohmann::json user_data;
    };

    struct StandardResponse {
        bool success;
        std::string message;
        nlohmann::json data;
    };

    // HTTP endpoint handlers
    nlohmann::json handle_register(const RegisterRequest& request);
    nlohmann::json handle_login(const LoginRequest& request);
    nlohmann::json handle_refresh_token(const RefreshTokenRequest& request);
    nlohmann::json handle_logout(const LogoutRequest& request);
    nlohmann::json handle_verify_email(const VerifyEmailRequest& request);
    nlohmann::json handle_forgot_password(const ForgotPasswordRequest& request);
    nlohmann::json handle_reset_password(const ResetPasswordRequest& request);
    nlohmann::json handle_check_username(const std::string& username);
    nlohmann::json handle_check_email(const std::string& email);

    // Utility methods for request validation
    bool validate_register_request(const RegisterRequest& request);
    bool validate_login_request(const LoginRequest& request);
    std::string extract_bearer_token(const std::string& authorization_header);

private:
    std::shared_ptr<UserServiceImpl> user_service_;
    
    // Helper methods to convert between REST and gRPC
    RegisterUserRequest to_grpc_register_request(const RegisterRequest& request);
    AuthenticateUserRequest to_grpc_auth_request(const LoginRequest& request);
    RefreshTokenRequest to_grpc_refresh_request(const RefreshTokenRequest& request);
    LogoutUserRequest to_grpc_logout_request(const LogoutRequest& request);
    
    nlohmann::json grpc_response_to_json(const RegisterUserResponse& response);
    nlohmann::json grpc_response_to_json(const AuthenticateUserResponse& response);
    nlohmann::json grpc_response_to_json(const RefreshTokenResponse& response);
    nlohmann::json create_error_response(const std::string& message);
    nlohmann::json create_success_response(const std::string& message, const nlohmann::json& data = nlohmann::json{});
};

} // namespace sonet::user::controllers
