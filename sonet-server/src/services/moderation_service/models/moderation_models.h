#pragma once

#include <string>
#include <vector>
#include <chrono>
#include <optional>
#include <nlohmann/json.hpp>

namespace sonet {
namespace moderation {

// Moderation action types
enum class ModerationActionType {
    FLAG = 0,
    WARN = 1,
    SHADOWBAN = 2,
    SUSPEND = 3,
    BAN = 4,
    DELETE_NOTE = 5,
    REMOVE_FLAG = 6
};

// Moderation action severity
enum class ModerationSeverity {
    LOW = 0,
    MEDIUM = 1,
    HIGH = 2,
    CRITICAL = 3
};

// Flag reason categories
enum class FlagReason {
    SPAM = 0,
    HARASSMENT = 1,
    INAPPROPRIATE_CONTENT = 2,
    FAKE_NEWS = 3,
    BOT_ACTIVITY = 4,
    VIOLENCE = 5,
    HATE_SPEECH = 6,
    COPYRIGHT_VIOLATION = 7,
    OTHER = 8
};

// Moderation action record
struct ModerationAction {
    std::string id;
    std::string target_user_id;
    std::string target_username;
    std::string moderator_id;  // Hidden from users, appears as "Sonet Moderation"
    std::string moderator_username;  // Hidden from users
    ModerationActionType action_type;
    ModerationSeverity severity;
    std::string reason;
    std::string details;
    std::string warning_message;
    std::chrono::system_clock::time_point created_at;
    std::chrono::system_clock::time_point expires_at;
    bool is_active;
    bool is_anonymous;  // Always true for founder actions
    std::string metadata; // JSON string for additional data

    // Default constructor
    ModerationAction() = default;

    // Constructor for founder actions
    ModerationAction(
        const std::string& target_user_id,
        const std::string& target_username,
        const std::string& moderator_id,
        ModerationActionType action_type,
        const std::string& reason,
        const std::string& warning_message = ""
    ) : target_user_id(target_user_id), target_username(target_username),
        moderator_id(moderator_id), action_type(action_type), reason(reason),
        warning_message(warning_message), created_at(std::chrono::system_clock::now()),
        is_active(true), is_anonymous(true) {}

    // JSON serialization
    nlohmann::json to_json() const;
    static ModerationAction from_json(const nlohmann::json& j);

    // Utility methods
    bool is_expired() const;
    bool needs_review() const;
    std::chrono::seconds get_remaining_time() const;
    std::string get_public_message() const;  // Message shown to users
    std::string get_action_description() const;
};

// Account flag record
struct AccountFlag {
    std::string id;
    std::string user_id;
    std::string username;
    std::string reason;
    std::string warning_message;
    std::chrono::system_clock::time_point flagged_at;
    std::chrono::system_clock::time_point expires_at;
    bool is_active;
    std::string metadata;

    // Default constructor
    AccountFlag() = default;

    // Constructor with required fields
    AccountFlag(
        const std::string& user_id,
        const std::string& username,
        const std::string& reason,
        const std::string& warning_message = ""
    ) : user_id(user_id), username(username), reason(reason),
        warning_message(warning_message), flagged_at(std::chrono::system_clock::now()),
        is_active(true) {
        // Set expiration to 60 days from now
        expires_at = flagged_at + std::chrono::hours(24 * 60);
    }

    // JSON serialization
    nlohmann::json to_json() const;
    static AccountFlag from_json(const nlohmann::json& j);

    // Utility methods
    bool is_expired() const;
    std::chrono::seconds get_remaining_time() const;
    std::string get_public_warning() const;
};

// Moderation queue item
struct ModerationQueueItem {
    std::string id;
    std::string user_id;
    std::string username;
    std::string content_type;  // "note", "profile", "user"
    std::string content_id;
    std::string content_preview;
    FlagReason flag_reason;
    std::string reporter_id;  // Hidden from users
    std::string reporter_username;  // Hidden from users
    std::chrono::system_clock::time_point reported_at;
    std::chrono::system_clock::time_point expires_at;
    bool is_reviewed;
    bool is_auto_expired;
    std::string metadata;

    // Default constructor
    ModerationQueueItem() = default;

    // JSON serialization
    nlohmann::json to_json() const;
    static ModerationQueueItem from_json(const nlohmann::json& j);

    // Utility methods
    bool is_expired() const;
    bool needs_immediate_review() const;
    std::string get_priority_level() const;
};

// Moderation statistics
struct ModerationStats {
    std::string id;
    std::chrono::system_clock::time_point period_start;
    std::chrono::system_clock::time_point period_end;
    int total_flags;
    int total_warnings;
    int total_shadowbans;
    int total_suspensions;
    int total_bans;
    int total_notes_deleted;
    int auto_expired_flags;
    int manual_reviews;
    std::string metadata;

    // Default constructor
    ModerationStats() = default;

    // JSON serialization
    nlohmann::json to_json() const;
    static ModerationStats from_json(const nlohmann::json& j);
};

} // namespace moderation
} // namespace sonet