/*
 * Copyright (c) 2025 Neo Qiss
 * All rights reserved.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

#pragma once

#include "follow.h"
#include <string>
#include <ctime>
#include <optional>
#include <vector>
#include <map>
#include <nlohmann/json.hpp>

namespace sonet::follow::models {

using json = nlohmann::json;

/**
 * @brief Relationship types between users
 */
enum class RelationshipType {
    NONE = 0,               // No relationship
    FOLLOWING = 1,          // User1 follows User2
    FOLLOWED_BY = 2,        // User1 is followed by User2
    MUTUAL = 3,             // Mutual follow relationship
    BLOCKED = 4,            // User1 has blocked User2
    BLOCKED_BY = 5,         // User1 is blocked by User2
    MUTED = 6,              // User1 has muted User2
    CLOSE_FRIENDS = 7,      // Close friends relationship
    PENDING_INCOMING = 8,   // User2 has requested to follow User1
    PENDING_OUTGOING = 9,   // User1 has requested to follow User2
    RESTRICTED = 10         // Restricted relationship (limited interactions)
};

/**
 * @brief Privacy levels for relationships
 */
enum class PrivacyLevel {
    PUBLIC = 0,             // Relationship is public
    FRIENDS_ONLY = 1,       // Only friends can see
    MUTUAL_ONLY = 2,        // Only mutual friends can see
    PRIVATE = 3             // Completely private
};

/**
 * @brief Interaction types between users
 */
enum class InteractionType {
    LIKE = 0,
    COMMENT = 1,
    RENOTE = 2,
    QUOTE = 3,
    MENTION = 4,
    DIRECT_MESSAGE = 5,
    PROFILE_VIEW = 6,
    STORY_VIEW = 7
};

/**
 * @brief Comprehensive Relationship model
 * 
 * Represents the complete relationship state between two users,
 * including follows, blocks, mutes, and interaction history.
 * Optimized for fast lookups and Twitter-scale operations.
 */
class Relationship {
public:
    // ========== CORE IDENTIFICATION ==========
    std::string relationship_id;     // Unique relationship identifier
    std::string user1_id;            // First user (typically the requesting user)
    std::string user2_id;            // Second user (typically the target user)
    
    // ========== RELATIONSHIP STATUS ==========
    RelationshipType type = RelationshipType::NONE;
    PrivacyLevel privacy_level = PrivacyLevel::PUBLIC;
    
    // Bidirectional relationship flags
    bool user1_follows_user2 = false;
    bool user2_follows_user1 = false;
    bool user1_blocks_user2 = false;
    bool user2_blocks_user1 = false;
    bool user1_mutes_user2 = false;
    bool user2_mutes_user1 = false;
    
    // Special relationship flags
    bool is_close_friends = false;
    bool is_family = false;
    bool is_verified_relationship = false;
    bool is_business_relationship = false;
    
    // ========== FOLLOW METADATA ==========
    std::optional<std::time_t> user1_followed_user2_at;
    std::optional<std::time_t> user2_followed_user1_at;
    std::optional<std::time_t> mutual_follow_established_at;
    
    // ========== BLOCKING METADATA ==========
    std::optional<std::time_t> user1_blocked_user2_at;
    std::optional<std::time_t> user2_blocked_user1_at;
    std::string block_reason;        // Reason for blocking (if provided)
    
    // ========== MUTING METADATA ==========
    std::optional<std::time_t> user1_muted_user2_at;
    std::optional<std::time_t> user2_muted_user1_at;
    bool mute_notifications = true;  // Mute notifications
    bool mute_content = true;        // Mute content from timeline
    
    // ========== INTERACTION HISTORY ==========
    int total_interactions = 0;
    int user1_to_user2_interactions = 0;
    int user2_to_user1_interactions = 0;
    std::time_t last_interaction_at;
    InteractionType last_interaction_type;
    
    // Interaction breakdown
    int total_likes = 0;
    int total_comments = 0;
    int total_renotes = 0;
    int total_mentions = 0;
    int total_direct_messages = 0;
    int total_profile_views = 0;
    
    // ========== RELATIONSHIP QUALITY METRICS ==========
    double relationship_strength = 0.0;    // Overall relationship strength (0.0 - 1.0)
    double engagement_rate = 0.0;           // Engagement rate between users
    double interaction_frequency = 0.0;     // How often they interact
    double mutual_connection_score = 0.0;   // Based on mutual friends/interests
    
    // ========== MUTUAL CONNECTIONS ==========
    int mutual_followers_count = 0;
    int mutual_following_count = 0;
    std::vector<std::string> mutual_friend_ids;  // Cached mutual friends (limited)
    
    // ========== TIMESTAMPS ==========
    std::time_t created_at;          // When relationship record was created
    std::time_t updated_at;          // Last update to any aspect of relationship
    std::time_t last_calculation_at; // Last time metrics were calculated
    
    // ========== PRIVACY AND SETTINGS ==========
    bool show_activity_status = true;       // Show when user is active
    bool allow_direct_messages = true;      // Allow DMs from this user
    bool allow_mentions = true;             // Allow mentions from this user
    bool allow_notifications = true;        // Allow notifications from this user
    
public:
    // ========== CONSTRUCTORS ==========
    Relationship() = default;
    Relationship(const std::string& user1_id, const std::string& user2_id);
    
    // ========== VALIDATION ==========
    bool is_valid() const;
    bool validate_user_ids() const;
    bool validate_timestamps() const;
    bool validate_metrics() const;
    
    // ========== RELATIONSHIP QUERIES ==========
    bool is_mutual_follow() const;
    bool is_any_follow() const;
    bool is_any_block() const;
    bool is_any_mute() const;
    bool can_interact() const;              // Check if users can interact
    bool can_see_content() const;           // Check if user1 can see user2's content
    bool can_send_messages() const;         // Check if users can send DMs
    
    // ========== RELATIONSHIP TYPE HELPERS ==========
    RelationshipType get_primary_relationship_type() const;
    std::vector<RelationshipType> get_all_relationship_types() const;
    bool has_relationship_type(RelationshipType type) const;
    
    // ========== FOLLOW OPERATIONS ==========
    void establish_follow(const std::string& follower_id, const std::string& following_id);
    void remove_follow(const std::string& follower_id, const std::string& following_id);
    void establish_mutual_follow();
    void break_mutual_follow(const std::string& unfollower_id);
    
    // ========== BLOCK OPERATIONS ==========
    void establish_block(const std::string& blocker_id, const std::string& blocked_id, const std::string& reason = "");
    void remove_block(const std::string& blocker_id, const std::string& blocked_id);
    bool is_blocked_by(const std::string& user_id) const;
    bool has_blocked(const std::string& user_id) const;
    
    // ========== MUTE OPERATIONS ==========
    void establish_mute(const std::string& muter_id, const std::string& muted_id);
    void remove_mute(const std::string& muter_id, const std::string& muted_id);
    bool is_muted_by(const std::string& user_id) const;
    bool has_muted(const std::string& user_id) const;
    
    // ========== INTERACTION TRACKING ==========
    void record_interaction(const std::string& actor_id, InteractionType type);
    void increment_interaction_count(InteractionType type);
    void update_last_interaction(InteractionType type);
    void calculate_engagement_metrics();
    
    // ========== METRICS CALCULATION ==========
    void calculate_relationship_strength();
    void calculate_interaction_frequency();
    void calculate_mutual_connection_score();
    void update_all_metrics();
    double get_interaction_ratio() const;    // Ratio of interactions between users
    
    // ========== MUTUAL CONNECTIONS ==========
    void update_mutual_counts(int followers, int following);
    void cache_mutual_friends(const std::vector<std::string>& friend_ids);
    bool has_mutual_connections() const;
    
    // ========== PRIVACY CONTROLS ==========
    void update_privacy_settings(const json& settings);
    json get_privacy_settings() const;
    bool allows_action(const std::string& actor_id, const std::string& action) const;
    
    // ========== ANALYTICS ==========
    json get_interaction_analytics() const;
    json get_engagement_analytics() const;
    json get_relationship_timeline() const;  // Timeline of relationship changes
    json get_mutual_connection_analytics() const;
    
    // ========== SERIALIZATION ==========
    json to_json() const;
    json to_public_json(const std::string& requesting_user_id) const;  // Privacy-filtered
    json to_analytics_json() const;
    json to_summary_json() const;           // Lightweight summary
    static Relationship from_json(const json& j);
    
    // ========== COMPARISON OPERATORS ==========
    bool operator==(const Relationship& other) const;
    bool operator<(const Relationship& other) const;
    
    // ========== UTILITIES ==========
    std::string get_relationship_description() const;
    std::string get_relationship_duration_string() const;
    bool is_recent_relationship(int hours = 24) const;
    bool is_stable_relationship(int days = 30) const;
    
    // ========== CONSTANTS ==========
    static constexpr double MIN_RELATIONSHIP_STRENGTH = 0.0;
    static constexpr double MAX_RELATIONSHIP_STRENGTH = 1.0;
    static constexpr double DEFAULT_RELATIONSHIP_STRENGTH = 0.1;
    static constexpr int MAX_CACHED_MUTUAL_FRIENDS = 50;
    static constexpr int STABLE_RELATIONSHIP_DAYS = 30;
    static constexpr int RECENT_RELATIONSHIP_HOURS = 24;
    
private:
    // ========== INTERNAL HELPERS ==========
    void update_relationship_type();
    void update_timestamps();
    void validate_and_fix_consistency();
    std::string generate_relationship_id() const;
    void initialize_default_values();
    
    // Metric calculation helpers
    double calculate_follow_strength() const;
    double calculate_interaction_strength() const;
    double calculate_mutual_strength() const;
    double calculate_time_factor() const;
};

/**
 * @brief Relationship summary for bulk operations
 */
struct RelationshipSummary {
    std::string user_id;
    RelationshipType relationship_type;
    bool following;
    bool followed_by;
    bool blocked;
    bool muted;
    bool close_friend;
    double relationship_strength;
    
    json to_json() const;
};

/**
 * @brief Relationship change event for real-time updates
 */
struct RelationshipEvent {
    std::string event_id;
    std::string user1_id;
    std::string user2_id;
    std::string action;              // follow, unfollow, block, unblock, mute, unmute
    RelationshipType old_type;
    RelationshipType new_type;
    std::time_t timestamp;
    json metadata;                   // Additional event data
    
    json to_json() const;
};

/**
 * @brief Bulk relationship query result
 */
struct BulkRelationshipResult {
    std::string requesting_user_id;
    std::map<std::string, RelationshipSummary> relationships;
    std::vector<std::string> not_found;
    std::vector<std::string> privacy_restricted;
    
    json to_json() const;
};

} // namespace sonet::follow::models
