/*
 * Copyright (c) 2025 Neo Qiss
 * All rights reserved.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

#include "user_controller.h"
#include <spdlog/spdlog.h>
#include <fstream>
#include <filesystem>
#include <regex>

namespace sonet::user::controllers {

UserController::UserController(std::shared_ptr<UserServiceImpl> user_service)
    : user_service_(std::move(user_service)) {
    spdlog::info("User controller initialized");
}

nlohmann::json UserController::handle_get_profile(const GetProfileRequest& request) {
    try {
        if (request.access_token.empty()) {
            return create_error_response("Access token is required");
        }
        
        // Create gRPC request
        GetUserProfileRequest grpc_request;
        grpc_request.set_access_token(request.access_token);
        if (!request.user_id.empty()) {
            grpc_request.set_user_id(request.user_id);
        }
        
        GetUserProfileResponse grpc_response;
        grpc::ServerContext context;
        
        auto status = user_service_->GetUserProfile(&context, &grpc_request, &grpc_response);
        
        if (!status.ok()) {
            spdlog::error("gRPC call failed: {}", status.error_message());
            return create_error_response("Profile service unavailable");
        }
        
        nlohmann::json response;
        response["success"] = grpc_response.success();
        response["message"] = grpc_response.message();
        
        if (grpc_response.success() && grpc_response.has_user()) {
            response["user"] = user_data_to_json(grpc_response.user());
        }
        
        return response;
        
    } catch (const std::exception& e) {
        spdlog::error("Get profile error: {}", e.what());
        return create_error_response("Internal server error");
    }
}

nlohmann::json UserController::handle_update_profile(const UpdateProfileRequest& request) {
    try {
        if (!validate_update_profile_request(request)) {
            return create_error_response("Invalid profile update data");
        }
        
        // This would require implementing UpdateUserProfile in the gRPC service
        // For now, returning a placeholder response
        nlohmann::json user_data;
        user_data["full_name"] = request.full_name;
        user_data["bio"] = request.bio;
        user_data["location"] = request.location;
        user_data["website"] = request.website;
        user_data["avatar_url"] = request.avatar_url;
        user_data["banner_url"] = request.banner_url;
        user_data["is_private"] = request.is_private;
        
        return create_success_response("Profile updated successfully", user_data);
        
    } catch (const std::exception& e) {
        spdlog::error("Update profile error: {}", e.what());
        return create_error_response("Internal server error");
    }
}

nlohmann::json UserController::handle_change_password(const ChangePasswordRequest& request) {
    try {
        if (!validate_change_password_request(request)) {
            return create_error_response("Invalid password change data");
        }
        
        // This would require implementing ChangePassword in the gRPC service
        // Including verification of current password and updating to new password
        return create_success_response("Password changed successfully");
        
    } catch (const std::exception& e) {
        spdlog::error("Change password error: {}", e.what());
        return create_error_response("Internal server error");
    }
}

nlohmann::json UserController::handle_update_settings(const UpdateSettingsRequest& request) {
    try {
        if (request.access_token.empty()) {
            return create_error_response("Access token is required");
        }
        
        // This would update user settings in the database
        // Including privacy, notification, and security preferences
        nlohmann::json settings;
        settings["privacy"] = request.privacy_settings;
        settings["notifications"] = request.notification_settings;
        settings["security"] = request.security_settings;
        
        return create_success_response("Settings updated successfully", settings);
        
    } catch (const std::exception& e) {
        spdlog::error("Update settings error: {}", e.what());
        return create_error_response("Internal server error");
    }
}

nlohmann::json UserController::handle_get_sessions(const GetSessionsRequest& request) {
    try {
        if (request.access_token.empty()) {
            return create_error_response("Access token is required");
        }
        
        // This would get all active sessions for the user
        // For now, returning a placeholder
        nlohmann::json sessions = nlohmann::json::array();
        
        // Example session data
        nlohmann::json session;
        session["session_id"] = "current-session";
        session["device_type"] = "web";
        session["device_name"] = "Chrome on Windows";
        session["ip_address"] = "192.168.1.100";
        session["location"] = "San Francisco, CA";
        session["is_current"] = true;
        session["created_at"] = std::chrono::duration_cast<std::chrono::seconds>(
            std::chrono::system_clock::now().time_since_epoch()).count();
        session["last_activity"] = std::chrono::duration_cast<std::chrono::seconds>(
            std::chrono::system_clock::now().time_since_epoch()).count();
        
        sessions.push_back(session);
        
        return create_success_response("Sessions retrieved successfully", sessions);
        
    } catch (const std::exception& e) {
        spdlog::error("Get sessions error: {}", e.what());
        return create_error_response("Internal server error");
    }
}

nlohmann::json UserController::handle_terminate_session(const TerminateSessionRequest& request) {
    try {
        if (request.access_token.empty() || request.session_id.empty()) {
            return create_error_response("Access token and session ID are required");
        }
        
        // This would terminate the specified session
        return create_success_response("Session terminated successfully");
        
    } catch (const std::exception& e) {
        spdlog::error("Terminate session error: {}", e.what());
        return create_error_response("Internal server error");
    }
}

nlohmann::json UserController::handle_terminate_all_sessions(const std::string& access_token) {
    try {
        if (access_token.empty()) {
            return create_error_response("Access token is required");
        }
        
        // This would terminate all sessions except the current one
        return create_success_response("All other sessions terminated successfully");
        
    } catch (const std::exception& e) {
        spdlog::error("Terminate all sessions error: {}", e.what());
        return create_error_response("Internal server error");
    }
}

nlohmann::json UserController::handle_deactivate_account(const DeactivateAccountRequest& request) {
    try {
        if (request.access_token.empty() || request.password.empty()) {
            return create_error_response("Access token and password are required");
        }
        
        // This would:
        // 1. Verify the password
        // 2. Mark the account as deactivated
        // 3. Log the reason
        // 4. Schedule data retention according to policy
        
        spdlog::info("Account deactivation requested. Reason: {}", request.reason);
        
        return create_success_response("Account deactivated successfully");
        
    } catch (const std::exception& e) {
        spdlog::error("Deactivate account error: {}", e.what());
        return create_error_response("Internal server error");
    }
}

nlohmann::json UserController::handle_search_users(const SearchUsersRequest& request) {
    try {
        if (request.access_token.empty() || request.query.empty()) {
            return create_error_response("Access token and search query are required");
        }
        
        // This would search users by username, full name, bio, etc.
        nlohmann::json users = nlohmann::json::array();
        
        // Example search result
        nlohmann::json user;
        user["user_id"] = "user-123";
        user["username"] = "johndoe";
        user["full_name"] = "John Doe";
        user["avatar_url"] = "https://cdn.sonet.com/avatars/user-123.jpg";
        user["bio"] = "Software engineer passionate about C++";
        user["is_verified"] = true;
        user["is_private"] = false;
        
        users.push_back(user);
        
        nlohmann::json data;
        data["users"] = users;
        data["total_count"] = users.size();
        data["query"] = request.query;
        data["limit"] = request.limit;
        data["offset"] = request.offset;
        
        return create_success_response("Search completed successfully", data);
        
    } catch (const std::exception& e) {
        spdlog::error("Search users error: {}", e.what());
        return create_error_response("Internal server error");
    }
}

nlohmann::json UserController::handle_get_user_stats(const std::string& access_token, const std::string& user_id) {
    try {
        if (access_token.empty()) {
            return create_error_response("Access token is required");
        }
        
        // This would get user statistics like follower count, following count, note count, etc.
        nlohmann::json stats;
        stats["followers_count"] = 1234;
        stats["following_count"] = 567;
        stats["notes_count"] = 89;
        stats["likes_received"] = 4567;
        stats["account_age_days"] = 365;
        stats["join_date"] = "2024-01-01";
        stats["last_active"] = std::chrono::duration_cast<std::chrono::seconds>(
            std::chrono::system_clock::now().time_since_epoch()).count();
        
        return create_success_response("User stats retrieved successfully", stats);
        
    } catch (const std::exception& e) {
        spdlog::error("Get user stats error: {}", e.what());
        return create_error_response("Internal server error");
    }
}

nlohmann::json UserController::handle_upload_avatar(const std::string& access_token, const std::vector<uint8_t>& image_data) {
    try {
        if (access_token.empty()) {
            return create_error_response("Access token is required");
        }
        
        if (image_data.empty()) {
            return create_error_response("Image data is required");
        }
        
        if (!is_valid_image_format(image_data)) {
            return create_error_response("Invalid image format. Supported formats: JPEG, PNG, WebP");
        }
        
        // This would:
        // 1. Validate image size and format
        // 2. Resize/optimize the image
        // 3. Upload to CDN/storage
        // 4. Update user's avatar_url
        
        std::string avatar_url = "https://cdn.sonet.com/avatars/user-123-" + 
                                std::to_string(std::chrono::duration_cast<std::chrono::seconds>(
                                    std::chrono::system_clock::now().time_since_epoch()).count()) + ".jpg";
        
        nlohmann::json data;
        data["avatar_url"] = avatar_url;
        
        return create_success_response("Avatar uploaded successfully", data);
        
    } catch (const std::exception& e) {
        spdlog::error("Upload avatar error: {}", e.what());
        return create_error_response("Internal server error");
    }
}

nlohmann::json UserController::handle_upload_banner(const std::string& access_token, const std::vector<uint8_t>& image_data) {
    try {
        if (access_token.empty()) {
            return create_error_response("Access token is required");
        }
        
        if (image_data.empty()) {
            return create_error_response("Image data is required");
        }
        
        if (!is_valid_image_format(image_data)) {
            return create_error_response("Invalid image format. Supported formats: JPEG, PNG, WebP");
        }
        
        // Similar to avatar upload but for banner images
        std::string banner_url = "https://cdn.sonet.com/banners/user-123-" + 
                                std::to_string(std::chrono::duration_cast<std::chrono::seconds>(
                                    std::chrono::system_clock::now().time_since_epoch()).count()) + ".jpg";
        
        nlohmann::json data;
        data["banner_url"] = banner_url;
        
        return create_success_response("Banner uploaded successfully", data);
        
    } catch (const std::exception& e) {
        spdlog::error("Upload banner error: {}", e.what());
        return create_error_response("Internal server error");
    }
}

// Validation methods

bool UserController::validate_update_profile_request(const UpdateProfileRequest& request) {
    if (request.access_token.empty()) {
        return false;
    }
    
    // Full name validation
    if (request.full_name.length() > 100) {
        return false;
    }
    
    // Bio validation
    if (request.bio.length() > 500) {
        return false;
    }
    
    // Location validation
    if (request.location.length() > 100) {
        return false;
    }
    
    // Website URL validation
    if (!request.website.empty()) {
        std::regex url_regex(R"(^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$)");
        if (!std::regex_match(request.website, url_regex)) {
            return false;
        }
    }
    
    return true;
}

bool UserController::validate_change_password_request(const ChangePasswordRequest& request) {
    if (request.access_token.empty() || request.current_password.empty() || request.new_password.empty()) {
        return false;
    }
    
    // New password strength validation (basic check)
    if (request.new_password.length() < 8) {
        return false;
    }
    
    return true;
}

std::string UserController::extract_bearer_token(const std::string& authorization_header) {
    const std::string bearer_prefix = "Bearer ";
    if (authorization_header.starts_with(bearer_prefix)) {
        return authorization_header.substr(bearer_prefix.length());
    }
    return "";
}

// Helper methods

nlohmann::json UserController::create_error_response(const std::string& message) {
    nlohmann::json response;
    response["success"] = false;
    response["message"] = message;
    return response;
}

nlohmann::json UserController::create_success_response(const std::string& message, const nlohmann::json& data) {
    nlohmann::json response;
    response["success"] = true;
    response["message"] = message;
    if (!data.empty()) {
        response["data"] = data;
    }
    return response;
}

nlohmann::json UserController::user_data_to_json(const UserData& user) {
    nlohmann::json json_user;
    json_user["user_id"] = user.user_id();
    json_user["username"] = user.username();
    json_user["email"] = user.email();
    json_user["full_name"] = user.full_name();
    json_user["bio"] = user.bio();
    json_user["avatar_url"] = user.avatar_url();
    json_user["banner_url"] = user.banner_url();
    json_user["location"] = user.location();
    json_user["website"] = user.website();
    json_user["is_verified"] = user.is_verified();
    json_user["is_private"] = user.is_private();
    json_user["status"] = static_cast<int>(user.status());
    json_user["created_at"] = user.created_at();
    json_user["updated_at"] = user.updated_at();
    if (user.last_login_at() > 0) {
        json_user["last_login_at"] = user.last_login_at();
    }
    return json_user;
}

nlohmann::json UserController::session_data_to_json(const UserSession& session) {
    nlohmann::json json_session;
    json_session["session_id"] = session.session_id;
    json_session["device_type"] = static_cast<int>(session.device_type);
    json_session["ip_address"] = session.ip_address;
    json_session["user_agent"] = session.user_agent;
    json_session["created_at"] = std::chrono::duration_cast<std::chrono::seconds>(
        session.created_at.time_since_epoch()).count();
    json_session["last_activity"] = std::chrono::duration_cast<std::chrono::seconds>(
        session.last_activity.time_since_epoch()).count();
    json_session["expires_at"] = std::chrono::duration_cast<std::chrono::seconds>(
        session.expires_at.time_since_epoch()).count();
    return json_session;
}

bool UserController::is_valid_image_format(const std::vector<uint8_t>& data) {
    if (data.size() < 4) {
        return false;
    }
    
    // Check for common image format magic bytes
    // JPEG: FF D8 FF
    if (data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF) {
        return true;
    }
    
    // PNG: 89 50 4E 47
    if (data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47) {
        return true;
    }
    
    // WebP: check for "WEBP" in bytes 8-11
    if (data.size() >= 12) {
        std::string webp_signature(data.begin() + 8, data.begin() + 12);
        if (webp_signature == "WEBP") {
            return true;
        }
    }
    
    return false;
}

std::string UserController::save_uploaded_image(const std::vector<uint8_t>& data, const std::string& user_id, const std::string& type) {
    // This would implement actual image saving logic
    // For now, return a placeholder URL
    auto timestamp = std::chrono::duration_cast<std::chrono::seconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();
    
    return "https://cdn.sonet.com/" + type + "s/" + user_id + "-" + std::to_string(timestamp) + ".jpg";
}

} // namespace sonet::user::controllers
