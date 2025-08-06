/*
 * Copyright (c) 2025 Neo Qiss
 * All rights reserved.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

#pragma once

#include "models/follow.h"
#include "models/relationship.h"
#include "graph/social_graph.h"
#include "repositories/follow_repository.h"
#include <nlohmann/json.hpp>
#include <memory>
#include <string>
#include <vector>
#include <unordered_set>

namespace sonet::follow {

using json = nlohmann::json;
using namespace sonet::follow::models;
using namespace sonet::follow::graph;
using namespace sonet::follow::repositories;

/**
 * @brief Twitter-Scale Follow Service
 * 
 * Handles all social graph operations including:
 * - Following/unfollowing users
 * - Blocking/unblocking users
 * - Muting/unmuting users
 * - Friend recommendations
 * - Social graph analytics
 * - Privacy controls and settings
 * - Real-time relationship updates
 * 
 * Performance Targets:
 * - Sub-1ms follow/unfollow operations
 * - Sub-2ms relationship checks
 * - Sub-5ms follower/following lists
 * - Sub-10ms friend recommendations
 * - Handle 10M+ relationships per user
 * - Support 100M+ total relationships
 */
class FollowService {
public:
    // Constructor
    FollowService(
        std::shared_ptr<FollowRepository> follow_repository,
        std::shared_ptr<SocialGraph> social_graph
    );
    
    // ========== CORE RELATIONSHIP OPERATIONS ==========
    
    /**
     * @brief Follow a user
     * @param follower_id User who wants to follow
     * @param following_id User to be followed
     * @return Operation result with relationship details
     */
    json follow_user(const std::string& follower_id, const std::string& following_id);
    
    /**
     * @brief Unfollow a user
     * @param follower_id User who wants to unfollow
     * @param following_id User to be unfollowed
     * @return Operation result
     */
    json unfollow_user(const std::string& follower_id, const std::string& following_id);
    
    /**
     * @brief Block a user
     * @param blocker_id User who wants to block
     * @param blocked_id User to be blocked
     * @return Operation result
     */
    json block_user(const std::string& blocker_id, const std::string& blocked_id);
    
    /**
     * @brief Unblock a user
     * @param blocker_id User who wants to unblock
     * @param blocked_id User to be unblocked
     * @return Operation result
     */
    json unblock_user(const std::string& blocker_id, const std::string& blocked_id);
    
    /**
     * @brief Mute a user
     * @param muter_id User who wants to mute
     * @param muted_id User to be muted
     * @return Operation result
     */
    json mute_user(const std::string& muter_id, const std::string& muted_id);
    
    /**
     * @brief Unmute a user
     * @param muter_id User who wants to unmute
     * @param muted_id User to be unmuted
     * @return Operation result
     */
    json unmute_user(const std::string& muter_id, const std::string& muted_id);
    
    // ========== RELATIONSHIP QUERIES ==========
    
    /**
     * @brief Check relationship status between two users
     * @param user1_id First user
     * @param user2_id Second user
     * @return Detailed relationship information
     */
    json get_relationship(const std::string& user1_id, const std::string& user2_id);
    
    /**
     * @brief Check if user1 follows user2
     * @param follower_id Potential follower
     * @param following_id Potential following
     * @return True if user1 follows user2
     */
    bool is_following(const std::string& follower_id, const std::string& following_id);
    
    /**
     * @brief Check if user1 is blocked by user2
     * @param user_id User to check
     * @param blocker_id Potential blocker
     * @return True if user is blocked
     */
    bool is_blocked(const std::string& user_id, const std::string& blocker_id);
    
    /**
     * @brief Check if user1 is muted by user2
     * @param user_id User to check
     * @param muter_id Potential muter
     * @return True if user is muted
     */
    bool is_muted(const std::string& user_id, const std::string& muter_id);
    
    /**
     * @brief Check if users are mutual friends (follow each other)
     * @param user1_id First user
     * @param user2_id Second user
     * @return True if they follow each other
     */
    bool are_mutual_friends(const std::string& user1_id, const std::string& user2_id);
    
    // ========== FOLLOWER/FOLLOWING LISTS ==========
    
    /**
     * @brief Get user's followers with pagination
     * @param user_id Target user
     * @param limit Number of results (max 200)
     * @param cursor Pagination cursor
     * @param requesting_user_id User making the request (for privacy)
     * @return List of followers with metadata
     */
    json get_followers(const std::string& user_id, int limit = 50, const std::string& cursor = "", const std::string& requesting_user_id = "");
    
    /**
     * @brief Get users that a user is following with pagination
     * @param user_id Target user
     * @param limit Number of results (max 200)
     * @param cursor Pagination cursor
     * @param requesting_user_id User making the request (for privacy)
     * @return List of following with metadata
     */
    json get_following(const std::string& user_id, int limit = 50, const std::string& cursor = "", const std::string& requesting_user_id = "");
    
    /**
     * @brief Get mutual friends between two users
     * @param user1_id First user
     * @param user2_id Second user
     * @param limit Number of results (max 100)
     * @return List of mutual friends
     */
    json get_mutual_friends(const std::string& user1_id, const std::string& user2_id, int limit = 20);
    
    /**
     * @brief Get users blocked by a user
     * @param user_id User whose blocked list to retrieve
     * @param limit Number of results
     * @param cursor Pagination cursor
     * @return List of blocked users (only for the user themselves)
     */
    json get_blocked_users(const std::string& user_id, int limit = 50, const std::string& cursor = "");
    
    /**
     * @brief Get users muted by a user
     * @param user_id User whose muted list to retrieve
     * @param limit Number of results
     * @param cursor Pagination cursor
     * @return List of muted users (only for the user themselves)
     */
    json get_muted_users(const std::string& user_id, int limit = 50, const std::string& cursor = "");
    
    // ========== FRIEND RECOMMENDATIONS ==========
    
    /**
     * @brief Get friend recommendations for a user
     * @param user_id User to get recommendations for
     * @param limit Number of recommendations (max 50)
     * @param algorithm Recommendation algorithm to use
     * @return List of recommended users with scores
     */
    json get_friend_recommendations(const std::string& user_id, int limit = 20, const std::string& algorithm = "default");
    
    /**
     * @brief Get recommendations based on mutual friends
     * @param user_id User to get recommendations for
     * @param limit Number of recommendations
     * @return List of users with mutual friend counts
     */
    json get_mutual_friend_recommendations(const std::string& user_id, int limit = 20);
    
    /**
     * @brief Get trending users to follow
     * @param user_id User requesting recommendations (for personalization)
     * @param limit Number of trending users
     * @param category Category filter (optional)
     * @return List of trending users
     */
    json get_trending_users(const std::string& user_id, int limit = 20, const std::string& category = "");
    
    // ========== ANALYTICS AND METRICS ==========
    
    /**
     * @brief Get follower analytics for a user
     * @param user_id User to analyze
     * @param requesting_user_id User making the request
     * @param time_range Time range for analytics (1d, 7d, 30d, 90d)
     * @return Detailed follower analytics
     */
    json get_follower_analytics(const std::string& user_id, const std::string& requesting_user_id, const std::string& time_range = "30d");
    
    /**
     * @brief Get user's social metrics
     * @param user_id User to get metrics for
     * @return Social metrics (followers, following, engagement rates)
     */
    json get_social_metrics(const std::string& user_id);
    
    /**
     * @brief Get growth metrics over time
     * @param user_id User to analyze
     * @param requesting_user_id User making the request
     * @param days Number of days to analyze
     * @return Growth metrics and trends
     */
    json get_growth_metrics(const std::string& user_id, const std::string& requesting_user_id, int days = 30);
    
    // ========== BATCH OPERATIONS ==========
    
    /**
     * @brief Get relationships for multiple users
     * @param user_id Base user
     * @param target_user_ids List of users to check relationships with
     * @return Map of user IDs to relationship status
     */
    json get_bulk_relationships(const std::string& user_id, const std::vector<std::string>& target_user_ids);
    
    /**
     * @brief Follow multiple users
     * @param follower_id User who wants to follow
     * @param user_ids_to_follow List of users to follow
     * @return Results for each follow operation
     */
    json bulk_follow(const std::string& follower_id, const std::vector<std::string>& user_ids_to_follow);
    
    /**
     * @brief Unfollow multiple users
     * @param follower_id User who wants to unfollow
     * @param user_ids_to_unfollow List of users to unfollow
     * @return Results for each unfollow operation
     */
    json bulk_unfollow(const std::string& follower_id, const std::vector<std::string>& user_ids_to_unfollow);
    
    // ========== PRIVACY AND SETTINGS ==========
    
    /**
     * @brief Update follow privacy settings
     * @param user_id User updating settings
     * @param settings Privacy settings object
     * @return Updated settings
     */
    json update_privacy_settings(const std::string& user_id, const json& settings);
    
    /**
     * @brief Get user's privacy settings
     * @param user_id User whose settings to retrieve
     * @param requesting_user_id User making the request
     * @return Privacy settings (filtered based on permissions)
     */
    json get_privacy_settings(const std::string& user_id, const std::string& requesting_user_id);
    
    // ========== REAL-TIME OPERATIONS ==========
    
    /**
     * @brief Get live follower count
     * @param user_id User to get count for
     * @return Real-time follower count
     */
    json get_live_follower_count(const std::string& user_id);
    
    /**
     * @brief Get recent follower activity
     * @param user_id User to get activity for
     * @param requesting_user_id User making the request
     * @param limit Number of recent activities
     * @return List of recent follower activities
     */
    json get_recent_follower_activity(const std::string& user_id, const std::string& requesting_user_id, int limit = 10);
    
    // ========== VALIDATION AND UTILITIES ==========
    
    /**
     * @brief Validate a follow request
     * @param follower_id User who wants to follow
     * @param following_id User to be followed
     * @return Validation result with details
     */
    json validate_follow_request(const std::string& follower_id, const std::string& following_id);
    
    /**
     * @brief Check rate limits for user actions
     * @param user_id User to check
     * @param action Action type (follow, unfollow, block, etc.)
     * @return Rate limit status
     */
    json check_rate_limits(const std::string& user_id, const std::string& action);
    
private:
    std::shared_ptr<FollowRepository> follow_repository_;
    std::shared_ptr<SocialGraph> social_graph_;
    
    // ========== HELPER METHODS ==========
    
    // Validation helpers
    bool validate_user_ids(const std::string& user1_id, const std::string& user2_id) const;
    bool can_user_follow(const std::string& follower_id, const std::string& following_id) const;
    bool can_view_followers(const std::string& target_user_id, const std::string& requesting_user_id) const;
    bool can_view_following(const std::string& target_user_id, const std::string& requesting_user_id) const;
    
    // Rate limiting
    bool check_follow_rate_limit(const std::string& user_id) const;
    bool check_unfollow_rate_limit(const std::string& user_id) const;
    bool check_block_rate_limit(const std::string& user_id) const;
    
    // Caching
    void invalidate_relationship_cache(const std::string& user1_id, const std::string& user2_id);
    void invalidate_follower_cache(const std::string& user_id);
    void invalidate_following_cache(const std::string& user_id);
    void update_social_graph_cache(const std::string& follower_id, const std::string& following_id, bool is_following);
    
    // Analytics helpers
    json calculate_engagement_rate(const std::string& user_id) const;
    json analyze_follower_demographics(const std::string& user_id) const;
    json detect_follower_growth_patterns(const std::string& user_id, int days) const;
    
    // Notification helpers
    void send_follow_notification(const std::string& follower_id, const std::string& following_id);
    void send_unfollow_notification(const std::string& follower_id, const std::string& following_id);
    void broadcast_relationship_update(const std::string& user1_id, const std::string& user2_id, const std::string& action);
    
    // Response helpers
    json create_success_response(const json& data, const std::string& message = "Success");
    json create_error_response(const std::string& error_code, const std::string& message);
    json create_relationship_response(const Relationship& relationship);
    json create_follow_response(const Follow& follow);
    
    // ========== CONSTANTS ==========
    
    // Rate limits (per minute)
    static constexpr int MAX_FOLLOWS_PER_MINUTE = 50;
    static constexpr int MAX_UNFOLLOWS_PER_MINUTE = 100;
    static constexpr int MAX_BLOCKS_PER_MINUTE = 20;
    static constexpr int MAX_RELATIONSHIP_CHECKS_PER_MINUTE = 1000;
    
    // Pagination limits
    static constexpr int MAX_FOLLOWERS_PER_REQUEST = 200;
    static constexpr int MAX_FOLLOWING_PER_REQUEST = 200;
    static constexpr int MAX_RECOMMENDATIONS_PER_REQUEST = 50;
    static constexpr int MAX_BULK_OPERATIONS = 100;
    
    // Analytics limits
    static constexpr int MAX_ANALYTICS_DAYS = 365;
    static constexpr int DEFAULT_ANALYTICS_DAYS = 30;
    
    // Privacy settings
    static constexpr bool DEFAULT_PRIVATE_FOLLOWERS = false;
    static constexpr bool DEFAULT_PRIVATE_FOLLOWING = false;
    static constexpr bool DEFAULT_ALLOW_RECOMMENDATIONS = true;
};

} // namespace sonet::follow
