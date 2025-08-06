/*
 * Copyright (c) 2025 Neo Qiss
 * All rights reserved.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

#pragma once

#include "../models/note.h"
#include <string>
#include <vector>
#include <nlohmann/json.hpp>

namespace sonet::note::validators {

using namespace sonet::note::models;

/**
 * Validation result structure
 */
struct ValidationResult {
    bool is_valid;
    std::vector<std::string> errors;
    std::vector<std::string> warnings;
    
    ValidationResult() : is_valid(true) {}
    
    void add_error(const std::string& error) {
        errors.push_back(error);
        is_valid = false;
    }
    
    void add_warning(const std::string& warning) {
        warnings.push_back(warning);
    }
    
    nlohmann::json to_json() const {
        return nlohmann::json{
            {"is_valid", is_valid},
            {"errors", errors},
            {"warnings", warnings}
        };
    }
};

/**
 * Comprehensive note validator with Twitter-scale validation rules
 */
class NoteValidator {
public:
    // Core validation methods
    static ValidationResult validate_note(const Note& note);
    static ValidationResult validate_create_request(const nlohmann::json& request_data);
    static ValidationResult validate_update_request(const nlohmann::json& request_data);
    
    // Content validation
    static bool validate_content_length(const std::string& content, std::string& error_message);
    static bool validate_content_quality(const std::string& content, std::string& error_message);
    static bool is_spam_content(const std::string& content);
    static bool is_toxic_content(const std::string& content);
    static bool has_profanity(const std::string& content);
    
    // Structure validation
    static bool validate_hashtags(const std::vector<std::string>& hashtags, std::string& error_message);
    static bool validate_mentions(const std::vector<std::string>& mentions, std::string& error_message);
    static bool validate_urls(const std::vector<std::string>& urls, std::string& error_message);
    static bool validate_attachments(const std::vector<std::string>& attachment_ids, std::string& error_message);
    
    // Metadata validation
    static bool validate_visibility(NoteVisibility visibility, std::string& error_message);
    static bool validate_note_type(NoteType type, std::string& error_message);
    static bool validate_content_warning(ContentWarning warning, std::string& error_message);
    static bool validate_location(double latitude, double longitude, std::string& error_message);
    
    // Relationship validation
    static bool validate_reply_target(const std::string& reply_to_id, std::string& error_message);
    static bool validate_repost_target(const std::string& repost_of_id, std::string& error_message);
    static bool validate_quote_target(const std::string& quote_of_id, std::string& error_message);
    static bool validate_thread_info(const std::string& thread_id, int position, std::string& error_message);
    
    // Security validation
    static bool validate_user_permissions(const std::string& user_id, const Note& note, const std::string& operation);
    static bool validate_rate_limits(const std::string& user_id, const std::string& operation);
    static bool validate_content_safety(const std::string& content, std::string& error_message);
    
    // Business rules validation
    static bool validate_scheduling_rules(const std::optional<std::time_t>& scheduled_at, std::string& error_message);
    static bool validate_engagement_limits(const Note& note, std::string& error_message);
    static bool validate_thread_constraints(const Note& note, std::string& error_message);
    
    // Content analysis
    static double calculate_content_quality_score(const std::string& content);
    static double calculate_spam_probability(const std::string& content);
    static double calculate_toxicity_score(const std::string& content);
    static std::vector<std::string> detect_languages(const std::string& content);
    
private:
    // Content analysis helpers
    static bool contains_excessive_capitalization(const std::string& content);
    static bool contains_excessive_punctuation(const std::string& content);
    static bool contains_repeated_characters(const std::string& content);
    static bool contains_suspicious_patterns(const std::string& content);
    
    // URL and link validation
    static bool is_valid_url(const std::string& url);
    static bool is_safe_url(const std::string& url);
    static bool is_shortened_url(const std::string& url);
    
    // Hashtag and mention validation
    static bool is_valid_hashtag(const std::string& hashtag);
    static bool is_valid_mention(const std::string& mention);
    static bool has_valid_hashtag_format(const std::string& hashtag);
    static bool has_valid_mention_format(const std::string& mention);
    
    // Security helpers
    static bool check_for_injection_attempts(const std::string& content);
    static bool check_for_malicious_links(const std::vector<std::string>& urls);
    static bool check_for_phishing_patterns(const std::string& content);
    
    // Rate limiting helpers
    static bool check_posting_frequency(const std::string& user_id);
    static bool check_duplicate_content(const std::string& user_id, const std::string& content);
    static bool check_engagement_rate_limits(const std::string& user_id, const std::string& operation);
    
    // Content quality metrics
    static double calculate_readability_score(const std::string& content);
    static double calculate_sentiment_score(const std::string& content);
    static double calculate_engagement_potential(const std::string& content);
    
    // Business logic helpers
    static bool is_within_character_limit(const std::string& content);
    static bool has_appropriate_content_ratio(const Note& note);
    static bool follows_community_guidelines(const std::string& content);
    
    // Constants
    static constexpr size_t MAX_CONTENT_LENGTH = 300;
    static constexpr size_t MAX_HASHTAGS = 10;
    static constexpr size_t MAX_MENTIONS = 10;
    static constexpr size_t MAX_URLS = 5;
    static constexpr size_t MAX_ATTACHMENTS = 4;
    static constexpr double SPAM_THRESHOLD = 0.7;
    static constexpr double TOXICITY_THRESHOLD = 0.8;
    static constexpr int MAX_POSTS_PER_MINUTE = 5;
    static constexpr int MAX_POSTS_PER_HOUR = 100;
};

} // namespace sonet::note::validators