/*
 * Copyright (c) 2025 Neo Qiss
 * All rights reserved.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

#include "user_service_impl.h"
#include "security_utils.h"
#include <spdlog/spdlog.h>
#include <chrono>

namespace sonet::user {

UserServiceImpl::UserServiceImpl(
    std::shared_ptr<UserRepository> repository,
    std::shared_ptr<PasswordManager> password_manager,
    std::shared_ptr<JWTManager> jwt_manager,
    std::shared_ptr<SessionManager> session_manager)
    : repository_(std::move(repository))
    , password_manager_(std::move(password_manager))
    , jwt_manager_(std::move(jwt_manager))
    , session_manager_(std::move(session_manager)) {
    
    spdlog::info("User service implementation initialized");
}

// User registration with comprehensive validation and security
grpc::Status UserServiceImpl::RegisterUser(
    grpc::ServerContext* context,
    const RegisterUserRequest* request,
    RegisterUserResponse* response) {
    
    spdlog::info("User registration attempt for: {}", request->username());
    
    try {
        // Input validation
        if (request->username().empty() || request->email().empty() || request->password().empty()) {
            response->set_success(false);
            response->set_message("Username, email, and password are required");
            return grpc::Status::OK;
        }
        
        // Validate email format
        if (!SecurityUtils::is_valid_email(request->email())) {
            response->set_success(false);
            response->set_message("Invalid email format");
            return grpc::Status::OK;
        }
        
        // Validate password strength
        if (!SecurityUtils::is_strong_password(request->password())) {
            response->set_success(false);
            response->set_message("Password must be at least 8 characters with uppercase, lowercase, number, and special character");
            return grpc::Status::OK;
        }
        
        // Check if username already exists
        auto existing_user = repository_->get_user_by_username(request->username());
        if (existing_user) {
            response->set_success(false);
            response->set_message("Username already exists");
            return grpc::Status::OK;
        }
        
        // Check if email already exists
        existing_user = repository_->get_user_by_email(request->email());
        if (existing_user) {
            response->set_success(false);
            response->set_message("Email already registered");
            return grpc::Status::OK;
        }
        
        // Create new user
        User new_user;
        new_user.username = request->username();
        new_user.email = request->email();
        new_user.password_hash = password_manager_->hash_password(request->password());
        new_user.full_name = request->full_name();
        new_user.bio = request->bio();
        new_user.is_verified = false;
        new_user.is_private = false;
        new_user.status = UserStatus::ACTIVE;
        new_user.failed_login_attempts = 0;
        
        auto created_user = repository_->create_user(new_user);
        if (!created_user) {
            response->set_success(false);
            response->set_message("Failed to create user account");
            return grpc::Status::OK;
        }
        
        // Generate email verification token
        std::string verification_token = jwt_manager_->generate_email_verification_token(created_user->user_id);
        
        // Populate response
        response->set_success(true);
        response->set_message("User registered successfully");
        response->set_user_id(created_user->user_id);
        response->set_verification_token(verification_token);
        
        // Populate user data
        auto* user_data = response->mutable_user();
        populate_user_proto(*created_user, user_data);
        
        spdlog::info("User registered successfully: {} ({})", created_user->username, created_user->user_id);
        
        return grpc::Status::OK;
        
    } catch (const std::exception& e) {
        spdlog::error("User registration failed: {}", e.what());
        response->set_success(false);
        response->set_message("Internal server error");
        return grpc::Status(grpc::StatusCode::INTERNAL, "Registration failed");
    }
}

// Secure user authentication with rate limiting and session management
grpc::Status UserServiceImpl::AuthenticateUser(
    grpc::ServerContext* context,
    const AuthenticateUserRequest* request,
    AuthenticateUserResponse* response) {
    
    spdlog::info("Authentication attempt for: {}", request->username());
    
    try {
        // Input validation
        if (request->username().empty() || request->password().empty()) {
            response->set_success(false);
            response->set_message("Username and password are required");
            return grpc::Status::OK;
        }
        
        // Get user by username or email
        auto user = repository_->get_user_by_username(request->username());
        if (!user) {
            user = repository_->get_user_by_email(request->username());
        }
        
        if (!user) {
            spdlog::warn("Authentication failed - user not found: {}", request->username());
            response->set_success(false);
            response->set_message("Invalid credentials");
            return grpc::Status::OK;
        }
        
        // Check if account is locked
        if (repository_->is_user_locked(user->user_id)) {
            spdlog::warn("Authentication failed - account locked: {}", user->username);
            response->set_success(false);
            response->set_message("Account temporarily locked due to multiple failed attempts");
            return grpc::Status::OK;
        }
        
        // Check user status
        if (user->status != UserStatus::ACTIVE) {
            response->set_success(false);
            response->set_message("Account is not active");
            return grpc::Status::OK;
        }
        
        // Verify password
        bool password_valid = password_manager_->verify_password(request->password(), user->password_hash);
        
        if (!password_valid) {
            // Increment failed login attempts
            repository_->increment_failed_login_attempts(user->user_id);
            
            spdlog::warn("Authentication failed - invalid password for user: {}", user->username);
            response->set_success(false);
            response->set_message("Invalid credentials");
            return grpc::Status::OK;
        }
        
        // Reset failed login attempts on successful authentication
        repository_->reset_failed_login_attempts(user->user_id);
        
        // Update last login timestamp
        repository_->update_last_login(user->user_id);
        
        // Create session
        UserSession session;
        session.user_id = user->user_id;
        session.device_id = request->device_fingerprint();
        session.device_type = static_cast<DeviceType>(request->device_type());
        session.ip_address = get_client_ip(context);
        session.user_agent = get_user_agent(context);
        session.type = SessionType::WEB;
        session.expires_at = std::chrono::system_clock::now() + std::chrono::hours(24);
        
        auto created_session = session_manager_->create_session(session);
        if (!created_session) {
            response->set_success(false);
            response->set_message("Failed to create session");
            return grpc::Status::OK;
        }
        
        // Generate tokens
        std::string access_token = jwt_manager_->generate_access_token(*user, *created_session);
        std::string refresh_token = jwt_manager_->generate_refresh_token(user->user_id, created_session->session_id);
        
        // Populate response
        response->set_success(true);
        response->set_message("Authentication successful");
        response->set_access_token(access_token);
        response->set_refresh_token(refresh_token);
        response->set_session_id(created_session->session_id);
        
        // Set token expiration times
        auto access_expires = std::chrono::system_clock::now() + std::chrono::minutes(15);
        auto refresh_expires = std::chrono::system_clock::now() + std::chrono::hours(168); // 7 days
        
        response->set_access_token_expires_at(
            std::chrono::duration_cast<std::chrono::seconds>(access_expires.time_since_epoch()).count()
        );
        response->set_refresh_token_expires_at(
            std::chrono::duration_cast<std::chrono::seconds>(refresh_expires.time_since_epoch()).count()
        );
        
        // Populate user data
        auto* user_data = response->mutable_user();
        populate_user_proto(*user, user_data);
        
        spdlog::info("User authenticated successfully: {} ({})", user->username, user->user_id);
        
        return grpc::Status::OK;
        
    } catch (const std::exception& e) {
        spdlog::error("Authentication failed: {}", e.what());
        response->set_success(false);
        response->set_message("Internal server error");
        return grpc::Status(grpc::StatusCode::INTERNAL, "Authentication failed");
    }
}

// Token refresh with security validation
grpc::Status UserServiceImpl::RefreshToken(
    grpc::ServerContext* context,
    const RefreshTokenRequest* request,
    RefreshTokenResponse* response) {
    
    try {
        // Verify refresh token
        auto claims = jwt_manager_->verify_token(request->refresh_token());
        if (!claims) {
            response->set_success(false);
            response->set_message("Invalid refresh token");
            return grpc::Status::OK;
        }
        
        // Check if token has refresh role
        bool has_refresh_role = std::find(claims->roles.begin(), claims->roles.end(), "refresh") != claims->roles.end();
        if (!has_refresh_role) {
            response->set_success(false);
            response->set_message("Token is not a refresh token");
            return grpc::Status::OK;
        }
        
        // Get user and session
        auto user = repository_->get_user_by_id(claims->user_id);
        if (!user || user->status != UserStatus::ACTIVE) {
            response->set_success(false);
            response->set_message("User account not found or inactive");
            return grpc::Status::OK;
        }
        
        auto session = session_manager_->get_session(claims->session_id);
        if (!session || session_manager_->is_session_expired(*session)) {
            response->set_success(false);
            response->set_message("Session expired or not found");
            return grpc::Status::OK;
        }
        
        // Generate new tokens
        std::string access_token = jwt_manager_->generate_access_token(*user, *session);
        std::string new_refresh_token = jwt_manager_->generate_refresh_token(user->user_id, session->session_id);
        
        // Blacklist the old refresh token
        jwt_manager_->blacklist_token(request->refresh_token());
        
        // Update session activity
        session_manager_->update_session_activity(session->session_id);
        
        // Populate response
        response->set_success(true);
        response->set_message("Token refreshed successfully");
        response->set_access_token(access_token);
        response->set_refresh_token(new_refresh_token);
        
        // Set token expiration times
        auto access_expires = std::chrono::system_clock::now() + std::chrono::minutes(15);
        auto refresh_expires = std::chrono::system_clock::now() + std::chrono::hours(168);
        
        response->set_access_token_expires_at(
            std::chrono::duration_cast<std::chrono::seconds>(access_expires.time_since_epoch()).count()
        );
        response->set_refresh_token_expires_at(
            std::chrono::duration_cast<std::chrono::seconds>(refresh_expires.time_since_epoch()).count()
        );
        
        spdlog::info("Token refreshed successfully for user: {}", user->user_id);
        
        return grpc::Status::OK;
        
    } catch (const std::exception& e) {
        spdlog::error("Token refresh failed: {}", e.what());
        response->set_success(false);
        response->set_message("Internal server error");
        return grpc::Status(grpc::StatusCode::INTERNAL, "Token refresh failed");
    }
}

// User logout with session cleanup
grpc::Status UserServiceImpl::LogoutUser(
    grpc::ServerContext* context,
    const LogoutUserRequest* request,
    LogoutUserResponse* response) {
    
    try {
        // Verify the access token
        auto claims = jwt_manager_->verify_token(request->access_token());
        if (!claims) {
            response->set_success(false);
            response->set_message("Invalid access token");
            return grpc::Status::OK;
        }
        
        // Blacklist the tokens
        jwt_manager_->blacklist_token(request->access_token());
        if (!request->refresh_token().empty()) {
            jwt_manager_->blacklist_token(request->refresh_token());
        }
        
        // Delete the session
        if (!claims->session_id.empty()) {
            session_manager_->delete_session(claims->session_id);
        }
        
        response->set_success(true);
        response->set_message("Logged out successfully");
        
        spdlog::info("User logged out: {}", claims->user_id);
        
        return grpc::Status::OK;
        
    } catch (const std::exception& e) {
        spdlog::error("Logout failed: {}", e.what());
        response->set_success(false);
        response->set_message("Internal server error");
        return grpc::Status(grpc::StatusCode::INTERNAL, "Logout failed");
    }
}

// Get current user profile
grpc::Status UserServiceImpl::GetUserProfile(
    grpc::ServerContext* context,
    const GetUserProfileRequest* request,
    GetUserProfileResponse* response) {
    
    try {
        // Verify access token
        auto claims = jwt_manager_->verify_token(request->access_token());
        if (!claims) {
            response->set_success(false);
            response->set_message("Invalid access token");
            return grpc::Status::OK;
        }
        
        // Get user data
        auto user = repository_->get_user_by_id(claims->user_id);
        if (!user) {
            response->set_success(false);
            response->set_message("User not found");
            return grpc::Status::OK;
        }
        
        response->set_success(true);
        response->set_message("User profile retrieved successfully");
        
        // Populate user data
        auto* user_data = response->mutable_user();
        populate_user_proto(*user, user_data);
        
        return grpc::Status::OK;
        
    } catch (const std::exception& e) {
        spdlog::error("Get user profile failed: {}", e.what());
        response->set_success(false);
        response->set_message("Internal server error");
        return grpc::Status(grpc::StatusCode::INTERNAL, "Failed to get user profile");
    }
}

// Helper methods

void UserServiceImpl::populate_user_proto(const User& user, UserData* proto_user) {
    proto_user->set_user_id(user.user_id);
    proto_user->set_username(user.username);
    proto_user->set_email(user.email);
    proto_user->set_full_name(user.full_name);
    proto_user->set_bio(user.bio);
    proto_user->set_avatar_url(user.avatar_url);
    proto_user->set_banner_url(user.banner_url);
    proto_user->set_location(user.location);
    proto_user->set_website(user.website);
    proto_user->set_is_verified(user.is_verified);
    proto_user->set_is_private(user.is_private);
    proto_user->set_status(static_cast<sonet::user::UserStatus>(user.status));
    
    proto_user->set_created_at(
        std::chrono::duration_cast<std::chrono::seconds>(user.created_at.time_since_epoch()).count()
    );
    proto_user->set_updated_at(
        std::chrono::duration_cast<std::chrono::seconds>(user.updated_at.time_since_epoch()).count()
    );
    
    if (user.last_login_at.has_value()) {
        proto_user->set_last_login_at(
            std::chrono::duration_cast<std::chrono::seconds>(user.last_login_at->time_since_epoch()).count()
        );
    }
}

std::string UserServiceImpl::get_client_ip(grpc::ServerContext* context) {
    auto peer = context->peer();
    // Extract IP from peer string (format: "ipv4:192.168.1.1:12345")
    if (peer.starts_with("ipv4:")) {
        auto colon_pos = peer.find(':', 5);
        if (colon_pos != std::string::npos) {
            return peer.substr(5, colon_pos - 5);
        }
    } else if (peer.starts_with("ipv6:")) {
        // Handle IPv6 addresses
        auto bracket_pos = peer.find(']');
        if (bracket_pos != std::string::npos) {
            return peer.substr(6, bracket_pos - 6);
        }
    }
    return "unknown";
}

std::string UserServiceImpl::get_user_agent(grpc::ServerContext* context) {
    auto metadata = context->client_metadata();
    auto user_agent_it = metadata.find("user-agent");
    if (user_agent_it != metadata.end()) {
        return std::string(user_agent_it->second.data(), user_agent_it->second.size());
    }
    return "unknown";
}

} // namespace sonet::user
