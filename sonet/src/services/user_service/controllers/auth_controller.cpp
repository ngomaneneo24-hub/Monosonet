/*
 * Copyright (c) 2025 Neo Qiss
 * All rights reserved.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

#include "auth_controller.h"
#include <spdlog/spdlog.h>
#include <nlohmann/json.hpp>
#include <regex>

namespace sonet::user::controllers {

AuthController::AuthController(std::shared_ptr<UserServiceImpl> user_service)
    : user_service_(std::move(user_service)) {
    spdlog::info("Authentication controller initialized");
}

nlohmann::json AuthController::handle_register(const RegisterRequest& request) {
    try {
        // Validate request
        if (!validate_register_request(request)) {
            return create_error_response("Invalid registration data");
        }
        
        // Convert to gRPC request
        auto grpc_request = to_grpc_register_request(request);
        RegisterUserResponse grpc_response;
        
        // Call gRPC service
        grpc::ServerContext context;
        auto status = user_service_->RegisterUser(&context, &grpc_request, &grpc_response);
        
        if (!status.ok()) {
            spdlog::error("gRPC call failed: {}", status.error_message());
            return create_error_response("Registration service unavailable");
        }
        
        return grpc_response_to_json(grpc_response);
        
    } catch (const std::exception& e) {
        spdlog::error("Registration error: {}", e.what());
        return create_error_response("Internal server error");
    }
}

nlohmann::json AuthController::handle_login(const LoginRequest& request) {
    try {
        // Validate request
        if (!validate_login_request(request)) {
            return create_error_response("Invalid login data");
        }
        
        // Convert to gRPC request
        auto grpc_request = to_grpc_auth_request(request);
        AuthenticateUserResponse grpc_response;
        
        // Call gRPC service
        grpc::ServerContext context;
        auto status = user_service_->AuthenticateUser(&context, &grpc_request, &grpc_response);
        
        if (!status.ok()) {
            spdlog::error("gRPC call failed: {}", status.error_message());
            return create_error_response("Authentication service unavailable");
        }
        
        return grpc_response_to_json(grpc_response);
        
    } catch (const std::exception& e) {
        spdlog::error("Login error: {}", e.what());
        return create_error_response("Internal server error");
    }
}

nlohmann::json AuthController::handle_refresh_token(const RefreshTokenRequest& request) {
    try {
        if (request.refresh_token.empty()) {
            return create_error_response("Refresh token is required");
        }
        
        // Convert to gRPC request
        auto grpc_request = to_grpc_refresh_request(request);
        RefreshTokenResponse grpc_response;
        
        // Call gRPC service
        grpc::ServerContext context;
        auto status = user_service_->RefreshToken(&context, &grpc_request, &grpc_response);
        
        if (!status.ok()) {
            spdlog::error("gRPC call failed: {}", status.error_message());
            return create_error_response("Token refresh service unavailable");
        }
        
        return grpc_response_to_json(grpc_response);
        
    } catch (const std::exception& e) {
        spdlog::error("Token refresh error: {}", e.what());
        return create_error_response("Internal server error");
    }
}

nlohmann::json AuthController::handle_logout(const LogoutRequest& request) {
    try {
        if (request.access_token.empty()) {
            return create_error_response("Access token is required");
        }
        
        // Convert to gRPC request
        auto grpc_request = to_grpc_logout_request(request);
        LogoutUserResponse grpc_response;
        
        // Call gRPC service
        grpc::ServerContext context;
        auto status = user_service_->LogoutUser(&context, &grpc_request, &grpc_response);
        
        if (!status.ok()) {
            spdlog::error("gRPC call failed: {}", status.error_message());
            return create_error_response("Logout service unavailable");
        }
        
        nlohmann::json response;
        response["success"] = grpc_response.success();
        response["message"] = grpc_response.message();
        
        return response;
        
    } catch (const std::exception& e) {
        spdlog::error("Logout error: {}", e.what());
        return create_error_response("Internal server error");
    }
}

nlohmann::json AuthController::handle_verify_email(const VerifyEmailRequest& request) {
    try {
        if (request.verification_token.empty()) {
            return create_error_response("Verification token is required");
        }
        
        // For now, we'll implement email verification through the JWT manager
        // In a full implementation, this would involve a separate verification service
        
        // This is a placeholder - would need to implement VerifyEmail in the gRPC service
        return create_success_response("Email verification feature coming soon");
        
    } catch (const std::exception& e) {
        spdlog::error("Email verification error: {}", e.what());
        return create_error_response("Internal server error");
    }
}

nlohmann::json AuthController::handle_forgot_password(const ForgotPasswordRequest& request) {
    try {
        if (request.email.empty()) {
            return create_error_response("Email is required");
        }
        
        // Email validation
        std::regex email_regex(R"([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})");
        if (!std::regex_match(request.email, email_regex)) {
            return create_error_response("Invalid email format");
        }
        
        // This would trigger password reset email
        // For now, returning success (in production, always return success for security)
        return create_success_response("If the email exists, a password reset link has been sent");
        
    } catch (const std::exception& e) {
        spdlog::error("Forgot password error: {}", e.what());
        return create_error_response("Internal server error");
    }
}

nlohmann::json AuthController::handle_reset_password(const ResetPasswordRequest& request) {
    try {
        if (request.reset_token.empty() || request.new_password.empty()) {
            return create_error_response("Reset token and new password are required");
        }
        
        // This would implement password reset logic
        return create_success_response("Password reset feature coming soon");
        
    } catch (const std::exception& e) {
        spdlog::error("Reset password error: {}", e.what());
        return create_error_response("Internal server error");
    }
}

nlohmann::json AuthController::handle_check_username(const std::string& username) {
    try {
        if (username.empty()) {
            return create_error_response("Username is required");
        }
        
        // This would check username availability through the repository
        // For now, this is a placeholder
        nlohmann::json response;
        response["available"] = true;  // Placeholder
        response["username"] = username;
        
        return create_success_response("Username availability checked", response);
        
    } catch (const std::exception& e) {
        spdlog::error("Username check error: {}", e.what());
        return create_error_response("Internal server error");
    }
}

nlohmann::json AuthController::handle_check_email(const std::string& email) {
    try {
        if (email.empty()) {
            return create_error_response("Email is required");
        }
        
        // This would check email availability through the repository
        nlohmann::json response;
        response["available"] = true;  // Placeholder
        response["email"] = email;
        
        return create_success_response("Email availability checked", response);
        
    } catch (const std::exception& e) {
        spdlog::error("Email check error: {}", e.what());
        return create_error_response("Internal server error");
    }
}

// Validation methods

bool AuthController::validate_register_request(const RegisterRequest& request) {
    // Username validation
    if (request.username.empty() || request.username.length() < 3 || request.username.length() > 30) {
        return false;
    }
    
    // Username format (alphanumeric and underscores only)
    std::regex username_regex("^[a-zA-Z0-9_]+$");
    if (!std::regex_match(request.username, username_regex)) {
        return false;
    }
    
    // Email validation
    std::regex email_regex(R"([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})");
    if (!std::regex_match(request.email, email_regex)) {
        return false;
    }
    
    // Password validation (basic check - detailed validation in SecurityUtils)
    if (request.password.empty() || request.password.length() < 8) {
        return false;
    }
    
    return true;
}

bool AuthController::validate_login_request(const LoginRequest& request) {
    return !request.username.empty() && !request.password.empty();
}

std::string AuthController::extract_bearer_token(const std::string& authorization_header) {
    const std::string bearer_prefix = "Bearer ";
    if (authorization_header.starts_with(bearer_prefix)) {
        return authorization_header.substr(bearer_prefix.length());
    }
    return "";
}

// Conversion methods

RegisterUserRequest AuthController::to_grpc_register_request(const RegisterRequest& request) {
    RegisterUserRequest grpc_request;
    grpc_request.set_username(request.username);
    grpc_request.set_email(request.email);
    grpc_request.set_password(request.password);
    grpc_request.set_full_name(request.full_name);
    grpc_request.set_bio(request.bio);
    grpc_request.set_device_fingerprint(request.device_fingerprint);
    grpc_request.set_device_type(static_cast<sonet::user::DeviceType>(request.device_type));
    return grpc_request;
}

AuthenticateUserRequest AuthController::to_grpc_auth_request(const LoginRequest& request) {
    AuthenticateUserRequest grpc_request;
    grpc_request.set_username(request.username);
    grpc_request.set_password(request.password);
    grpc_request.set_device_fingerprint(request.device_fingerprint);
    grpc_request.set_device_type(static_cast<sonet::user::DeviceType>(request.device_type));
    return grpc_request;
}

RefreshTokenRequest AuthController::to_grpc_refresh_request(const RefreshTokenRequest& request) {
    RefreshTokenRequest grpc_request;
    grpc_request.set_refresh_token(request.refresh_token);
    return grpc_request;
}

LogoutUserRequest AuthController::to_grpc_logout_request(const LogoutRequest& request) {
    LogoutUserRequest grpc_request;
    grpc_request.set_access_token(request.access_token);
    grpc_request.set_refresh_token(request.refresh_token);
    return grpc_request;
}

// Response conversion methods

nlohmann::json AuthController::grpc_response_to_json(const RegisterUserResponse& response) {
    nlohmann::json json_response;
    json_response["success"] = response.success();
    json_response["message"] = response.message();
    
    if (response.success()) {
        json_response["user_id"] = response.user_id();
        json_response["verification_token"] = response.verification_token();
        
        // Convert user data
        if (response.has_user()) {
            nlohmann::json user_data;
            const auto& user = response.user();
            user_data["user_id"] = user.user_id();
            user_data["username"] = user.username();
            user_data["email"] = user.email();
            user_data["full_name"] = user.full_name();
            user_data["bio"] = user.bio();
            user_data["avatar_url"] = user.avatar_url();
            user_data["banner_url"] = user.banner_url();
            user_data["location"] = user.location();
            user_data["website"] = user.website();
            user_data["is_verified"] = user.is_verified();
            user_data["is_private"] = user.is_private();
            user_data["status"] = static_cast<int>(user.status());
            user_data["created_at"] = user.created_at();
            user_data["updated_at"] = user.updated_at();
            if (user.last_login_at() > 0) {
                user_data["last_login_at"] = user.last_login_at();
            }
            
            json_response["user"] = user_data;
        }
    }
    
    return json_response;
}

nlohmann::json AuthController::grpc_response_to_json(const AuthenticateUserResponse& response) {
    nlohmann::json json_response;
    json_response["success"] = response.success();
    json_response["message"] = response.message();
    
    if (response.success()) {
        json_response["access_token"] = response.access_token();
        json_response["refresh_token"] = response.refresh_token();
        json_response["session_id"] = response.session_id();
        json_response["access_token_expires_at"] = response.access_token_expires_at();
        json_response["refresh_token_expires_at"] = response.refresh_token_expires_at();
        
        // Convert user data (same as register response)
        if (response.has_user()) {
            nlohmann::json user_data;
            const auto& user = response.user();
            user_data["user_id"] = user.user_id();
            user_data["username"] = user.username();
            user_data["email"] = user.email();
            user_data["full_name"] = user.full_name();
            user_data["bio"] = user.bio();
            user_data["avatar_url"] = user.avatar_url();
            user_data["banner_url"] = user.banner_url();
            user_data["location"] = user.location();
            user_data["website"] = user.website();
            user_data["is_verified"] = user.is_verified();
            user_data["is_private"] = user.is_private();
            user_data["status"] = static_cast<int>(user.status());
            user_data["created_at"] = user.created_at();
            user_data["updated_at"] = user.updated_at();
            if (user.last_login_at() > 0) {
                user_data["last_login_at"] = user.last_login_at();
            }
            
            json_response["user"] = user_data;
        }
    }
    
    return json_response;
}

nlohmann::json AuthController::grpc_response_to_json(const RefreshTokenResponse& response) {
    nlohmann::json json_response;
    json_response["success"] = response.success();
    json_response["message"] = response.message();
    
    if (response.success()) {
        json_response["access_token"] = response.access_token();
        json_response["refresh_token"] = response.refresh_token();
        json_response["access_token_expires_at"] = response.access_token_expires_at();
        json_response["refresh_token_expires_at"] = response.refresh_token_expires_at();
    }
    
    return json_response;
}

nlohmann::json AuthController::create_error_response(const std::string& message) {
    nlohmann::json response;
    response["success"] = false;
    response["message"] = message;
    return response;
}

nlohmann::json AuthController::create_success_response(const std::string& message, const nlohmann::json& data) {
    nlohmann::json response;
    response["success"] = true;
    response["message"] = message;
    if (!data.empty()) {
        response["data"] = data;
    }
    return response;
}

} // namespace sonet::user::controllers
