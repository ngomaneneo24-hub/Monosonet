/*
 * Copyright (c) 2025 Neo Qiss
 * All rights reserved.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

#include "user_service.h"
#include <spdlog/spdlog.h>
#include <grpcpp/grpcpp.h>

namespace sonet::user {

UserServiceImpl::UserServiceImpl() {
    // Initialize all our security components
    password_manager_ = std::make_shared<PasswordManager>();
    jwt_manager_ = std::make_shared<JWTManager>("your-super-secret-key-change-in-production", "sonet");
    session_manager_ = std::make_shared<SessionManager>();
    rate_limiter_ = std::make_shared<RateLimiter>();
    
    // Wire everything together through the auth manager
    auth_manager_ = std::make_shared<AuthManager>(
        password_manager_, jwt_manager_, session_manager_, rate_limiter_
    );
    
    spdlog::info("User service initialized - ready to handle authentication like a boss");
}

grpc::Status UserServiceImpl::RegisterUser(
    grpc::ServerContext* context,
    const sonet::user::RegisterUserRequest* request,
    sonet::user::RegisterUserResponse* response) {
    
    spdlog::info("Registration attempt for email: {}", request->email());
    
    // Convert gRPC request to our internal types
    RegistrationRequest reg_request;
    reg_request.username = request->username();
    reg_request.email = request->email();
    reg_request.password = request->password();
    reg_request.display_name = request->display_name();
    reg_request.client_info = extract_client_info(context);
    reg_request.ip_address = extract_ip_address(context);
    reg_request.accept_terms = request->accept_terms();
    reg_request.accept_privacy = request->accept_privacy();
    
    // Let the auth manager handle the heavy lifting
    User new_user;
    AuthResult result = auth_manager_->register_user(reg_request, new_user);
    
    // Build the response
    auto status = response->mutable_status();
    status->set_success(result == AuthResult::SUCCESS);
    
    if (result == AuthResult::SUCCESS) {
        // Fill in the user details
        auto user_proto = response->mutable_user();
        user_proto->set_user_id(new_user.user_id);
        user_proto->set_username(new_user.username);
        user_proto->set_email(new_user.email);
        user_proto->set_display_name(new_user.display_name);
        user_proto->set_is_verified(new_user.is_verified);
        
        status->set_message("Registration successful");
        spdlog::info("User registered successfully: {}", new_user.user_id);
    } else {
        status->set_message(get_auth_result_message(result));
        spdlog::warn("Registration failed for {}: {}", request->email(), status->message());
    }
    
    return grpc::Status::OK;
}

grpc::Status UserServiceImpl::LoginUser(
    grpc::ServerContext* context,
    const sonet::user::LoginUserRequest* request,
    sonet::user::LoginUserResponse* response) {
    
    spdlog::info("Login attempt for email: {}", request->credentials().email());
    
    // Convert gRPC credentials to our internal format
    AuthCredentials credentials;
    credentials.email = request->credentials().email();
    credentials.password = request->credentials().password();
    credentials.client_info = extract_client_info(context);
    credentials.ip_address = extract_ip_address(context);
    
    if (request->credentials().has_two_factor_code()) {
        credentials.two_factor_code = request->credentials().two_factor_code();
    }
    
    // Authenticate through our auth manager
    UserSession session;
    AuthResult result = auth_manager_->authenticate_user(credentials, session);
    
    // Build response
    auto status = response->mutable_status();
    status->set_success(result == AuthResult::SUCCESS);
    
    if (result == AuthResult::SUCCESS) {
        // Generate tokens for successful login
        User user = get_user_by_email(credentials.email); // This would come from repository
        
        std::string access_token = jwt_manager_->generate_access_token(user, session);
        std::string refresh_token = jwt_manager_->generate_refresh_token(user.user_id, session.session_id);
        
        response->set_access_token(access_token);
        response->set_refresh_token(refresh_token);
        response->set_expires_in(3600); // 1 hour
        
        // Fill session info
        auto session_proto = response->mutable_session();
        session_proto->set_session_id(session.session_id);
        session_proto->set_device_name(session.device_name);
        session_proto->set_ip_address(session.ip_address);
        
        status->set_message("Login successful");
        spdlog::info("User logged in successfully: {}", user.user_id);
    } else {
        status->set_message(get_auth_result_message(result));
        spdlog::warn("Login failed for {}: {}", credentials.email, status->message());
    }
    
    return grpc::Status::OK;
}

grpc::Status UserServiceImpl::VerifyToken(
    grpc::ServerContext* context,
    const sonet::user::VerifyTokenRequest* request,
    sonet::user::VerifyTokenResponse* response) {
    
    // This is called frequently, so I keep logging minimal
    std::optional<User> user = auth_manager_->authenticate_token(request->token());
    
    auto status = response->mutable_status();
    status->set_success(user.has_value());
    
    if (user) {
        // Token is valid, return user info
        auto user_proto = response->mutable_user();
        user_proto->set_user_id(user->user_id);
        user_proto->set_username(user->username);
        user_proto->set_email(user->email);
        user_proto->set_display_name(user->display_name);
        user_proto->set_is_verified(user->is_verified);
        
        status->set_message("Token valid");
    } else {
        status->set_message("Invalid or expired token");
    }
    
    return grpc::Status::OK;
}

grpc::Status UserServiceImpl::RefreshToken(
    grpc::ServerContext* context,
    const sonet::user::RefreshTokenRequest* request,
    sonet::user::RefreshTokenResponse* response) {
    
    std::string new_access_token;
    bool success = auth_manager_->refresh_authentication(request->refresh_token(), new_access_token);
    
    auto status = response->mutable_status();
    status->set_success(success);
    
    if (success) {
        response->set_access_token(new_access_token);
        response->set_expires_in(3600);
        status->set_message("Token refreshed");
    } else {
        status->set_message("Invalid refresh token");
    }
    
    return grpc::Status::OK;
}

grpc::Status UserServiceImpl::LogoutUser(
    grpc::ServerContext* context,
    const sonet::user::LogoutRequest* request,
    sonet::user::LogoutResponse* response) {
    
    bool success = auth_manager_->terminate_session(request->session_id());
    
    auto status = response->mutable_status();
    status->set_success(success);
    status->set_message(success ? "Logged out successfully" : "Session not found");
    
    if (success) {
        spdlog::info("User logged out: session {}", request->session_id());
    }
    
    return grpc::Status::OK;
}

grpc::Status UserServiceImpl::ChangePassword(
    grpc::ServerContext* context,
    const sonet::user::ChangePasswordRequest* request,
    sonet::user::ChangePasswordResponse* response) {
    
    // Extract user ID from token (this would be done by middleware in production)
    std::string user_id = extract_user_id_from_context(context);
    
    bool success = auth_manager_->change_password(
        user_id, 
        request->old_password(), 
        request->new_password()
    );
    
    auto status = response->mutable_status();
    status->set_success(success);
    status->set_message(success ? "Password changed successfully" : "Failed to change password");
    
    if (success) {
        spdlog::info("Password changed for user: {}", user_id);
    }
    
    return grpc::Status::OK;
}

// Helper methods

std::string UserServiceImpl::extract_client_info(grpc::ServerContext* context) {
    // Extract user agent and other client info from gRPC metadata
    auto metadata = context->client_metadata();
    auto user_agent_it = metadata.find("user-agent");
    
    if (user_agent_it != metadata.end()) {
        return std::string(user_agent_it->second.data(), user_agent_it->second.size());
    }
    
    return "unknown";
}

std::string UserServiceImpl::extract_ip_address(grpc::ServerContext* context) {
    // Extract IP address from peer information
    std::string peer = context->peer();
    
    // Parse IP from peer string (format: "ipv4:127.0.0.1:12345")
    size_t colon_pos = peer.find(':');
    if (colon_pos != std::string::npos) {
        size_t second_colon = peer.find(':', colon_pos + 1);
        if (second_colon != std::string::npos) {
            return peer.substr(colon_pos + 1, second_colon - colon_pos - 1);
        }
    }
    
    return "unknown";
}

std::string UserServiceImpl::extract_user_id_from_context(grpc::ServerContext* context) {
    // In production, this would extract user ID from validated JWT token
    // For now, return placeholder
    return "user_id_from_jwt";
}

std::string UserServiceImpl::get_auth_result_message(AuthResult result) {
    switch (result) {
        case AuthResult::SUCCESS:
            return "Success";
        case AuthResult::INVALID_CREDENTIALS:
            return "Invalid email or password";
        case AuthResult::ACCOUNT_LOCKED:
            return "Account is locked due to too many failed attempts";
        case AuthResult::ACCOUNT_SUSPENDED:
            return "Account is suspended";
        case AuthResult::EMAIL_NOT_VERIFIED:
            return "Please verify your email address";
        case AuthResult::TOO_MANY_ATTEMPTS:
            return "Too many attempts, please try again later";
        case AuthResult::INTERNAL_ERROR:
        default:
            return "Internal server error";
    }
}

User UserServiceImpl::get_user_by_email(const std::string& email) {
    // This would query the database through the repository
    // For now, return a mock user
    User user;
    user.user_id = "mock_user_id";
    user.email = email;
    user.username = "mock_username";
    user.display_name = "Mock User";
    user.status = UserStatus::ACTIVE;
    user.is_verified = true;
    user.is_private = false;
    user.created_at = std::chrono::system_clock::now();
    user.last_login = std::chrono::system_clock::now();
    
    return user;
}

} // namespace sonet::user
