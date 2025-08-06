/*
 * Copyright (c) 2025 Neo Qiss
 * All rights reserved.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

#pragma once

#include <string>
#include <ctime>
#include <optional>
#include <nlohmann/json.hpp>

namespace sonet::follow::models {

using json = nlohmann::json;

/**
 * @brief Follow relationship types
 */
enum class FollowType {
    STANDARD = 0,        // Regular follow
    CLOSE_FRIEND = 1,    // Close friend designation
    MUTUAL = 2,          // Mutual follow (both users follow each other)
    PENDING = 3,         // Pending approval (for private accounts)
    REQUESTED = 4        // Follow request sent but not approved
};

/**
 * @brief Follow status
 */
enum class FollowStatus {
    ACTIVE = 0,          // Active follow relationship
    INACTIVE = 1,        // Temporarily inactive
    PENDING = 2,         // Waiting for approval
    REJECTED = 3,        // Follow request rejected
    CANCELLED = 4        // Follow request cancelled
};

/**
 * @brief Follow notification preferences
 */
enum class FollowNotificationLevel {
    ALL = 0,             // Notify for all activities
    IMPORTANT = 1,       // Only important activities
    MENTIONS = 2,        // Only when mentioned
    OFF = 3              // No notifications
};

/**
 * @brief Core Follow model representing a follower-following relationship
 * 
 * Optimized for Twitter-scale operations:
 * - Fast relationship lookups
 * - Efficient bulk operations
 * - Real-time updates
 * - Privacy controls
 */
class Follow {
public:
    // ========== CORE IDENTIFICATION ==========
    std::string follow_id;           // Unique follow relationship ID
    std::string follower_id;         // User who follows
    std::string following_id;        // User being followed
    
    // ========== RELATIONSHIP METADATA ==========
    FollowType type = FollowType::STANDARD;
    FollowStatus status = FollowStatus::ACTIVE;
    FollowNotificationLevel notification_level = FollowNotificationLevel::ALL;
    
    // ========== TIMESTAMPS ==========
    std::time_t created_at;          // When the follow relationship was created
    std::time_t updated_at;          // Last update to the relationship
    std::optional<std::time_t> approved_at;    // When follow request was approved
    std::optional<std::time_t> unfollowed_at;  // When unfollowed (for soft deletes)
    
    // ========== ENGAGEMENT TRACKING ==========
    int interaction_count = 0;       // Number of interactions (likes, comments, etc.)
    std::time_t last_interaction_at;  // Last time follower interacted with following's content
    double engagement_score = 0.0;   // Calculated engagement score (0.0 - 1.0)
    
    // ========== PRIVACY AND SETTINGS ==========
    bool is_muted = false;           // Follower has muted this user
    bool show_retweets = true;       // Show renotes/retweets from this user
    bool show_replies = true;        // Show replies from this user
    bool is_close_friend = false;    // Designated as close friend
    
    // ========== ANALYTICS METADATA ==========
    std::string follow_source;       // How the follow originated (search, recommendation, etc.)
    std::string device_type;         // Device used for follow action
    std::string client_app;          // App used for follow action
    std::string referrer;            // Referrer that led to follow
    
    // ========== RELATIONSHIP QUALITY ==========
    double relationship_strength = 0.0;  // AI-calculated relationship strength
    int mutual_friends_count = 0;        // Number of mutual friends
    bool is_verified_relationship = false;  // Verified authentic relationship
    
    // ========== NOTIFICATION METADATA ==========
    bool notifications_enabled = true;    // Global notifications for this relationship
    bool email_notifications = false;     // Email notifications enabled
    bool push_notifications = true;       // Push notifications enabled
    bool sms_notifications = false;       // SMS notifications enabled
    
    // ========== LOCATION AND CONTEXT ==========
    std::optional<double> follow_latitude;   // Location where follow occurred
    std::optional<double> follow_longitude;  // Location where follow occurred
    std::string follow_country;             // Country where follow occurred
    std::string follow_city;                // City where follow occurred
    
public:
    // ========== CONSTRUCTORS ==========
    Follow() = default;
    Follow(const std::string& follower_id, const std::string& following_id);
    Follow(const std::string& follower_id, const std::string& following_id, FollowType type);
    
    // ========== VALIDATION ==========
    bool is_valid() const;
    bool validate_user_ids() const;
    bool validate_timestamps() const;
    bool validate_engagement_data() const;
    
    // ========== RELATIONSHIP QUERIES ==========
    bool is_active() const;
    bool is_pending() const;
    bool is_mutual() const;
    bool is_close_friend_relationship() const;
    bool allows_notifications() const;
    bool shows_content() const;
    
    // ========== ENGAGEMENT OPERATIONS ==========
    void record_interaction();
    void update_engagement_score(double score);
    void increment_interaction_count();
    void update_last_interaction();
    double calculate_engagement_rate() const;
    
    // ========== RELATIONSHIP MANAGEMENT ==========
    void approve_follow_request();
    void reject_follow_request();
    void cancel_follow_request();
    void mark_as_close_friend(bool is_close = true);
    void mute_relationship(bool muted = true);
    void set_notification_level(FollowNotificationLevel level);
    
    // ========== PRIVACY CONTROLS ==========
    void enable_notifications(bool enabled = true);
    void set_show_retweets(bool show = true);
    void set_show_replies(bool show = true);
    void update_privacy_settings(const json& settings);
    
    // ========== ANALYTICS ==========
    json get_engagement_metrics() const;
    json get_relationship_analytics() const;
    double get_relationship_strength() const;
    void update_relationship_strength();
    
    // ========== SERIALIZATION ==========
    json to_json() const;
    json to_public_json() const;                    // Public-facing JSON (privacy-filtered)
    json to_analytics_json() const;                 // Analytics-focused JSON
    static Follow from_json(const json& j);
    
    // ========== UTILITIES ==========
    std::string get_follow_duration_string() const;  // Human-readable follow duration
    bool is_recent_follow(int hours = 24) const;     // Check if follow is recent
    bool is_long_term_follow(int days = 365) const;  // Check if long-term follow
    
    // ========== COMPARISON OPERATORS ==========
    bool operator==(const Follow& other) const;
    bool operator<(const Follow& other) const;       // For sorting by creation time
    
    // ========== CONSTANTS ==========
    static constexpr double MIN_ENGAGEMENT_SCORE = 0.0;
    static constexpr double MAX_ENGAGEMENT_SCORE = 1.0;
    static constexpr double DEFAULT_ENGAGEMENT_SCORE = 0.1;
    static constexpr int MAX_INTERACTION_COUNT = 1000000;
    static constexpr int RECENT_FOLLOW_HOURS = 24;
    static constexpr int LONG_TERM_FOLLOW_DAYS = 365;
    
private:
    // ========== INTERNAL HELPERS ==========
    void calculate_relationship_strength();
    void update_mutual_friends_count();
    void validate_location_data();
    std::string generate_follow_id() const;
    void set_default_values();
};

/**
 * @brief Follow request model for pending relationships
 */
class FollowRequest {
public:
    std::string request_id;
    std::string requester_id;        // User requesting to follow
    std::string target_id;           // User being requested to follow
    std::time_t requested_at;
    std::optional<std::time_t> responded_at;
    FollowStatus status = FollowStatus::PENDING;
    
    std::string message;             // Optional message with request
    std::string request_source;      // How request was initiated
    
    // Methods
    bool is_pending() const { return status == FollowStatus::PENDING; }
    bool is_expired(int hours = 720) const;  // 30 days default expiry
    void approve();
    void reject();
    void cancel();
    
    json to_json() const;
    static FollowRequest from_json(const json& j);
};

/**
 * @brief Batch follow operation result
 */
struct BatchFollowResult {
    std::vector<std::string> successful_follows;
    std::vector<std::string> failed_follows;
    std::vector<std::string> already_following;
    std::vector<std::string> blocked_users;
    std::vector<std::string> private_users_pending;
    
    int total_requested = 0;
    int total_successful = 0;
    int total_failed = 0;
    
    json to_json() const;
};

/**
 * @brief Follow analytics summary
 */
struct FollowAnalytics {
    int total_followers = 0;
    int total_following = 0;
    int mutual_follows = 0;
    int pending_requests = 0;
    int close_friends = 0;
    
    // Growth metrics
    int followers_gained_today = 0;
    int followers_lost_today = 0;
    int followers_gained_week = 0;
    int followers_lost_week = 0;
    int followers_gained_month = 0;
    int followers_lost_month = 0;
    
    // Engagement metrics
    double average_engagement_score = 0.0;
    double relationship_quality_score = 0.0;
    
    // Geographic distribution
    std::map<std::string, int> followers_by_country;
    std::map<std::string, int> followers_by_city;
    
    json to_json() const;
};

} // namespace sonet::follow::models
