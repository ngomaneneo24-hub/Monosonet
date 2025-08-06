/*
 * Copyright (c) 2025 Neo Qiss
 * All rights reserved.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

#pragma once

#include "../models/follow.h"
#include "../models/relationship.h"
#include <string>
#include <vector>
#include <unordered_set>
#include <unordered_map>
#include <memory>
#include <nlohmann/json.hpp>

namespace sonet::follow::graph {

using json = nlohmann::json;
using namespace sonet::follow::models;

/**
 * @brief Recommendation algorithm types
 */
enum class RecommendationAlgorithm {
    MUTUAL_FRIENDS = 0,      // Based on mutual friends
    INTERESTS = 1,           // Based on shared interests/topics
    ENGAGEMENT = 2,          // Based on engagement patterns
    LOCATION = 3,            // Based on geographic proximity
    TRENDING = 4,            // Based on trending users
    COLLABORATIVE = 5,       // Collaborative filtering
    HYBRID = 6               // Combination of multiple algorithms
};

/**
 * @brief Graph traversal modes
 */
enum class TraversalMode {
    BREADTH_FIRST = 0,       // BFS traversal
    DEPTH_FIRST = 1,         // DFS traversal
    WEIGHTED = 2,            // Weighted by relationship strength
    SHORTEST_PATH = 3        // Shortest path between nodes
};

/**
 * @brief Twitter-Scale Social Graph Engine
 * 
 * High-performance social graph implementation optimized for:
 * - Ultra-fast relationship lookups (sub-millisecond)
 * - Real-time friend recommendations
 * - Efficient graph traversal algorithms
 * - Scalable to 100M+ users and 10B+ relationships
 * - Advanced analytics and insights
 * - Community detection
 * - Influence scoring
 */
class SocialGraph {
public:
    // Constructor
    SocialGraph();
    ~SocialGraph();
    
    // ========== CORE GRAPH OPERATIONS ==========
    
    /**
     * @brief Add a user to the social graph
     * @param user_id User to add
     * @param metadata Optional user metadata
     * @return Success status
     */
    bool add_user(const std::string& user_id, const json& metadata = json::object());
    
    /**
     * @brief Remove a user from the social graph
     * @param user_id User to remove
     * @return Success status
     */
    bool remove_user(const std::string& user_id);
    
    /**
     * @brief Add a relationship edge to the graph
     * @param follower_id User who follows
     * @param following_id User being followed
     * @param relationship_strength Strength of the relationship (0.0 - 1.0)
     * @return Success status
     */
    bool add_edge(const std::string& follower_id, const std::string& following_id, double relationship_strength = 1.0);
    
    /**
     * @brief Remove a relationship edge from the graph
     * @param follower_id User who follows
     * @param following_id User being followed
     * @return Success status
     */
    bool remove_edge(const std::string& follower_id, const std::string& following_id);
    
    /**
     * @brief Update relationship strength between two users
     * @param user1_id First user
     * @param user2_id Second user
     * @param strength New relationship strength
     * @return Success status
     */
    bool update_edge_weight(const std::string& user1_id, const std::string& user2_id, double strength);
    
    // ========== RELATIONSHIP QUERIES ==========
    
    /**
     * @brief Check if a relationship exists between two users
     * @param follower_id Potential follower
     * @param following_id Potential following
     * @return True if relationship exists
     */
    bool has_relationship(const std::string& follower_id, const std::string& following_id) const;
    
    /**
     * @brief Get relationship strength between two users
     * @param user1_id First user
     * @param user2_id Second user
     * @return Relationship strength (0.0 if no relationship)
     */
    double get_relationship_strength(const std::string& user1_id, const std::string& user2_id) const;
    
    /**
     * @brief Check if two users are mutually connected
     * @param user1_id First user
     * @param user2_id Second user
     * @return True if mutual relationship exists
     */
    bool are_mutual_friends(const std::string& user1_id, const std::string& user2_id) const;
    
    /**
     * @brief Get shortest path between two users
     * @param user1_id Start user
     * @param user2_id End user
     * @param max_hops Maximum number of hops to search
     * @return Vector of user IDs representing the path (empty if no path)
     */
    std::vector<std::string> get_shortest_path(const std::string& user1_id, const std::string& user2_id, int max_hops = 6) const;
    
    /**
     * @brief Calculate degrees of separation between two users
     * @param user1_id First user
     * @param user2_id Second user
     * @param max_degrees Maximum degrees to search
     * @return Number of degrees of separation (-1 if not connected)
     */
    int get_degrees_of_separation(const std::string& user1_id, const std::string& user2_id, int max_degrees = 6) const;
    
    // ========== NETWORK TRAVERSAL ==========
    
    /**
     * @brief Get immediate followers of a user
     * @param user_id Target user
     * @param limit Maximum number of followers to return
     * @return Vector of follower user IDs
     */
    std::vector<std::string> get_followers(const std::string& user_id, int limit = -1) const;
    
    /**
     * @brief Get users that a user is following
     * @param user_id Target user
     * @param limit Maximum number of following to return
     * @return Vector of following user IDs
     */
    std::vector<std::string> get_following(const std::string& user_id, int limit = -1) const;
    
    /**
     * @brief Get mutual friends between two users
     * @param user1_id First user
     * @param user2_id Second user
     * @param limit Maximum number of mutual friends to return
     * @return Vector of mutual friend user IDs
     */
    std::vector<std::string> get_mutual_friends(const std::string& user1_id, const std::string& user2_id, int limit = -1) const;
    
    /**
     * @brief Get users within N hops of a user
     * @param user_id Center user
     * @param hops Number of hops
     * @param mode Traversal mode
     * @param limit Maximum number of users to return
     * @return Vector of user IDs within N hops
     */
    std::vector<std::string> get_users_within_hops(const std::string& user_id, int hops, TraversalMode mode = TraversalMode::BREADTH_FIRST, int limit = -1) const;
    
    // ========== FRIEND RECOMMENDATIONS ==========
    
    /**
     * @brief Get friend recommendations for a user
     * @param user_id User to get recommendations for
     * @param algorithm Recommendation algorithm to use
     * @param limit Maximum number of recommendations
     * @return Vector of recommended user IDs with scores
     */
    std::vector<std::pair<std::string, double>> get_friend_recommendations(
        const std::string& user_id, 
        RecommendationAlgorithm algorithm = RecommendationAlgorithm::HYBRID, 
        int limit = 20
    ) const;
    
    /**
     * @brief Get recommendations based on mutual friends
     * @param user_id User to get recommendations for
     * @param limit Maximum number of recommendations
     * @return Vector of user IDs with mutual friend counts
     */
    std::vector<std::pair<std::string, int>> get_mutual_friend_recommendations(const std::string& user_id, int limit = 20) const;
    
    /**
     * @brief Get recommendations based on similar interests
     * @param user_id User to get recommendations for
     * @param interests User's interests/topics
     * @param limit Maximum number of recommendations
     * @return Vector of user IDs with similarity scores
     */
    std::vector<std::pair<std::string, double>> get_interest_based_recommendations(
        const std::string& user_id, 
        const std::vector<std::string>& interests, 
        int limit = 20
    ) const;
    
    /**
     * @brief Get trending users to follow
     * @param user_id User requesting recommendations (for personalization)
     * @param time_window Time window for trending calculation (hours)
     * @param limit Maximum number of trending users
     * @return Vector of trending user IDs with scores
     */
    std::vector<std::pair<std::string, double>> get_trending_users(const std::string& user_id, int time_window = 24, int limit = 20) const;
    
    // ========== GRAPH ANALYTICS ==========
    
    /**
     * @brief Get user's network statistics
     * @param user_id User to analyze
     * @return JSON object with network statistics
     */
    json get_user_network_stats(const std::string& user_id) const;
    
    /**
     * @brief Calculate user's influence score
     * @param user_id User to calculate influence for
     * @param algorithm Influence calculation algorithm
     * @return Influence score (0.0 - 1.0)
     */
    double calculate_influence_score(const std::string& user_id, const std::string& algorithm = "pagerank") const;
    
    /**
     * @brief Get most influential users in the network
     * @param limit Number of influential users to return
     * @param category Optional category filter
     * @return Vector of user IDs with influence scores
     */
    std::vector<std::pair<std::string, double>> get_most_influential_users(int limit = 50, const std::string& category = "") const;
    
    /**
     * @brief Detect communities/clusters in the network
     * @param user_id Center user (optional)
     * @param algorithm Community detection algorithm
     * @param max_communities Maximum number of communities to detect
     * @return Vector of communities (each community is a vector of user IDs)
     */
    std::vector<std::vector<std::string>> detect_communities(
        const std::string& user_id = "", 
        const std::string& algorithm = "louvain", 
        int max_communities = 10
    ) const;
    
    /**
     * @brief Get network clustering coefficient
     * @param user_id User to calculate clustering for (empty for global)
     * @return Clustering coefficient (0.0 - 1.0)
     */
    double get_clustering_coefficient(const std::string& user_id = "") const;
    
    // ========== BULK OPERATIONS ==========
    
    /**
     * @brief Bulk add multiple relationships
     * @param relationships Vector of follower-following pairs
     * @return Number of successfully added relationships
     */
    int bulk_add_relationships(const std::vector<std::pair<std::string, std::string>>& relationships);
    
    /**
     * @brief Bulk remove multiple relationships
     * @param relationships Vector of follower-following pairs
     * @return Number of successfully removed relationships
     */
    int bulk_remove_relationships(const std::vector<std::pair<std::string, std::string>>& relationships);
    
    /**
     * @brief Get relationships for multiple users
     * @param user_id Base user
     * @param target_users Vector of users to check relationships with
     * @return Map of user IDs to relationship status
     */
    std::unordered_map<std::string, bool> bulk_check_relationships(
        const std::string& user_id, 
        const std::vector<std::string>& target_users
    ) const;
    
    // ========== GRAPH MAINTENANCE ==========
    
    /**
     * @brief Get total number of users in the graph
     * @return Number of users
     */
    size_t get_user_count() const;
    
    /**
     * @brief Get total number of relationships in the graph
     * @return Number of relationships
     */
    size_t get_relationship_count() const;
    
    /**
     * @brief Get graph density (ratio of actual to possible relationships)
     * @return Graph density (0.0 - 1.0)
     */
    double get_graph_density() const;
    
    /**
     * @brief Optimize graph structure for better performance
     * @param force_rebuild Force complete rebuild of internal structures
     * @return Success status
     */
    bool optimize_graph(bool force_rebuild = false);
    
    /**
     * @brief Clear all graph data
     */
    void clear();
    
    /**
     * @brief Validate graph consistency
     * @return True if graph is consistent
     */
    bool validate_consistency() const;
    
    // ========== CACHING AND PERFORMANCE ==========
    
    /**
     * @brief Precompute and cache expensive operations for a user
     * @param user_id User to precompute for
     * @param operations List of operations to precompute
     */
    void precompute_user_data(const std::string& user_id, const std::vector<std::string>& operations = {});
    
    /**
     * @brief Invalidate cached data for a user
     * @param user_id User to invalidate cache for
     */
    void invalidate_user_cache(const std::string& user_id);
    
    /**
     * @brief Get performance statistics
     * @return JSON object with performance metrics
     */
    json get_performance_stats() const;
    
    // ========== SERIALIZATION ==========
    
    /**
     * @brief Export graph data to JSON
     * @param include_weights Include relationship weights
     * @param user_filter Optional user filter
     * @return JSON representation of the graph
     */
    json export_to_json(bool include_weights = true, const std::vector<std::string>& user_filter = {}) const;
    
    /**
     * @brief Import graph data from JSON
     * @param graph_data JSON representation of the graph
     * @param merge Merge with existing data or replace
     * @return Success status
     */
    bool import_from_json(const json& graph_data, bool merge = false);
    
private:
    // ========== INTERNAL DATA STRUCTURES ==========
    
    // Graph representation (adjacency lists)
    std::unordered_map<std::string, std::unordered_set<std::string>> outgoing_edges_;  // user -> following
    std::unordered_map<std::string, std::unordered_set<std::string>> incoming_edges_;  // user -> followers
    std::unordered_map<std::string, std::unordered_map<std::string, double>> edge_weights_;  // relationship strengths
    
    // User metadata
    std::unordered_map<std::string, json> user_metadata_;
    
    // Caching structures
    mutable std::unordered_map<std::string, std::vector<std::string>> cached_followers_;
    mutable std::unordered_map<std::string, std::vector<std::string>> cached_following_;
    mutable std::unordered_map<std::string, std::vector<std::pair<std::string, double>>> cached_recommendations_;
    mutable std::unordered_map<std::string, double> cached_influence_scores_;
    
    // Performance counters
    mutable size_t query_count_ = 0;
    mutable size_t cache_hits_ = 0;
    mutable size_t cache_misses_ = 0;
    
    // ========== INTERNAL ALGORITHMS ==========
    
    // Graph traversal algorithms
    std::vector<std::string> breadth_first_search(const std::string& start_user, int max_depth, int limit) const;
    std::vector<std::string> depth_first_search(const std::string& start_user, int max_depth, int limit) const;
    std::vector<std::string> dijkstra_shortest_path(const std::string& start_user, const std::string& end_user) const;
    
    // Recommendation algorithms
    std::vector<std::pair<std::string, double>> mutual_friends_algorithm(const std::string& user_id, int limit) const;
    std::vector<std::pair<std::string, double>> collaborative_filtering_algorithm(const std::string& user_id, int limit) const;
    std::vector<std::pair<std::string, double>> interest_similarity_algorithm(const std::string& user_id, const std::vector<std::string>& interests, int limit) const;
    std::vector<std::pair<std::string, double>> hybrid_recommendation_algorithm(const std::string& user_id, int limit) const;
    
    // Influence algorithms
    double calculate_pagerank_score(const std::string& user_id) const;
    double calculate_betweenness_centrality(const std::string& user_id) const;
    double calculate_closeness_centrality(const std::string& user_id) const;
    double calculate_eigenvector_centrality(const std::string& user_id) const;
    
    // Community detection algorithms
    std::vector<std::vector<std::string>> louvain_community_detection() const;
    std::vector<std::vector<std::string>> girvan_newman_algorithm() const;
    std::vector<std::vector<std::string>> label_propagation_algorithm() const;
    
    // Utility functions
    bool is_valid_user_id(const std::string& user_id) const;
    void update_cache_for_user(const std::string& user_id) const;
    void invalidate_related_caches(const std::string& user_id);
    double calculate_jaccard_similarity(const std::unordered_set<std::string>& set1, const std::unordered_set<std::string>& set2) const;
    
    // ========== CONSTANTS ==========
    static constexpr size_t MAX_CACHE_SIZE = 100000;
    static constexpr int DEFAULT_MAX_HOPS = 6;
    static constexpr int DEFAULT_RECOMMENDATION_LIMIT = 20;
    static constexpr double MIN_RELATIONSHIP_STRENGTH = 0.0;
    static constexpr double MAX_RELATIONSHIP_STRENGTH = 1.0;
    static constexpr double DEFAULT_RELATIONSHIP_STRENGTH = 1.0;
};

/**
 * @brief Graph statistics summary
 */
struct GraphStats {
    size_t total_users = 0;
    size_t total_relationships = 0;
    double graph_density = 0.0;
    double average_degree = 0.0;
    double clustering_coefficient = 0.0;
    int diameter = 0;
    size_t largest_component_size = 0;
    std::map<int, int> degree_distribution;
    
    json to_json() const;
};

/**
 * @brief Network recommendation result
 */
struct RecommendationResult {
    std::string user_id;
    std::string recommended_user_id;
    double score;
    RecommendationAlgorithm algorithm;
    std::string reason;
    json metadata;
    
    json to_json() const;
};

} // namespace sonet::follow::graph
