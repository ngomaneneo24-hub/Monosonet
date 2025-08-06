/*
 * Copyright (c) 2025 Neo Qiss
 * All rights reserved.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

#pragma once

#include "../models/note.h"
#include "../repositories/note_repository.h"
#include "../validators/note_validator.h"
#include <nlohmann/json.hpp>
#include <string>
#include <vector>
#include <memory>
#include <optional>

namespace sonet::note::controllers {

using namespace sonet::note::models;
using namespace sonet::note::repositories;

/**
 * RESTful controller for Note management
 * Handles HTTP requests for creating, reading, updating, and deleting notes
 */
class NoteController {
private:
    std::shared_ptr<NoteRepository> note_repository_;
    
public:
    explicit NoteController(std::shared_ptr<NoteRepository> repository);
    
    // Core CRUD operations
    nlohmann::json create_note(const nlohmann::json& request_data, const std::string& user_id);
    nlohmann::json get_note(const std::string& note_id, const std::string& requesting_user_id = "");
    nlohmann::json update_note(const std::string& note_id, const nlohmann::json& request_data, const std::string& user_id);
    nlohmann::json delete_note(const std::string& note_id, const std::string& user_id);
    
    // Timeline and feed operations
    nlohmann::json get_user_timeline(const std::string& user_id, int limit = 20, int offset = 0, const std::string& max_id = "");
    nlohmann::json get_home_timeline(const std::string& user_id, int limit = 20, int offset = 0);
    nlohmann::json get_public_timeline(int limit = 20, int offset = 0, const std::string& filter = "");
    nlohmann::json get_trending_notes(int limit = 20, const std::string& timeframe = "24h");
    
    // Engagement operations
    nlohmann::json like_note(const std::string& note_id, const std::string& user_id);
    nlohmann::json unlike_note(const std::string& note_id, const std::string& user_id);
    nlohmann::json repost_note(const std::string& note_id, const std::string& user_id, const std::string& additional_content = "");
    nlohmann::json unrepost_note(const std::string& note_id, const std::string& user_id);
    nlohmann::json bookmark_note(const std::string& note_id, const std::string& user_id);
    nlohmann::json unbookmark_note(const std::string& note_id, const std::string& user_id);
    
    // Reply and quote operations
    nlohmann::json create_reply(const std::string& note_id, const nlohmann::json& request_data, const std::string& user_id);
    nlohmann::json create_quote(const std::string& note_id, const nlohmann::json& request_data, const std::string& user_id);
    nlohmann::json get_replies(const std::string& note_id, int limit = 20, int offset = 0, const std::string& sort = "chronological");
    nlohmann::json get_quotes(const std::string& note_id, int limit = 20, int offset = 0);
    
    // Thread operations
    nlohmann::json create_thread(const nlohmann::json& request_data, const std::string& user_id);
    nlohmann::json get_thread(const std::string& thread_id);
    nlohmann::json add_to_thread(const std::string& thread_id, const nlohmann::json& request_data, const std::string& user_id);
    
    // Search operations
    nlohmann::json search_notes(const std::string& query, int limit = 20, int offset = 0, 
                               const std::string& filter = "", const std::string& sort = "relevance");
    nlohmann::json search_by_hashtag(const std::string& hashtag, int limit = 20, int offset = 0);
    nlohmann::json search_by_user(const std::string& username, int limit = 20, int offset = 0);
    
    // Analytics and metrics
    nlohmann::json get_note_metrics(const std::string& note_id, const std::string& user_id);
    nlohmann::json get_note_engagement(const std::string& note_id, const std::string& user_id);
    nlohmann::json get_note_analytics(const std::string& note_id, const std::string& user_id, const std::string& timeframe = "7d");
    
    // Moderation operations
    nlohmann::json flag_note(const std::string& note_id, const std::string& user_id, const std::string& reason);
    nlohmann::json hide_note(const std::string& note_id, const std::string& user_id);
    nlohmann::json report_note(const std::string& note_id, const std::string& user_id, const nlohmann::json& report_data);
    
    // Batch operations
    nlohmann::json get_multiple_notes(const std::vector<std::string>& note_ids, const std::string& user_id = "");
    nlohmann::json delete_multiple_notes(const std::vector<std::string>& note_ids, const std::string& user_id);
    nlohmann::json bulk_update_notes(const nlohmann::json& updates_data, const std::string& user_id);
    
    // Scheduled notes
    nlohmann::json schedule_note(const nlohmann::json& request_data, const std::string& user_id);
    nlohmann::json get_scheduled_notes(const std::string& user_id, int limit = 20);
    nlohmann::json update_scheduled_note(const std::string& note_id, const nlohmann::json& request_data, const std::string& user_id);
    nlohmann::json cancel_scheduled_note(const std::string& note_id, const std::string& user_id);
    
    // Draft operations
    nlohmann::json save_draft(const nlohmann::json& request_data, const std::string& user_id);
    nlohmann::json get_drafts(const std::string& user_id, int limit = 20);
    nlohmann::json update_draft(const std::string& note_id, const nlohmann::json& request_data, const std::string& user_id);
    nlohmann::json publish_draft(const std::string& note_id, const std::string& user_id);
    nlohmann::json delete_draft(const std::string& note_id, const std::string& user_id);
    
    // Content features
    nlohmann::json get_mentioned_users(const std::string& note_id);
    nlohmann::json get_hashtags(const std::string& note_id);
    nlohmann::json get_urls(const std::string& note_id);
    nlohmann::json preview_url(const std::string& url);
    
    // User interactions
    nlohmann::json get_user_likes(const std::string& user_id, int limit = 20, int offset = 0);
    nlohmann::json get_user_reposts(const std::string& user_id, int limit = 20, int offset = 0);
    nlohmann::json get_user_bookmarks(const std::string& user_id, int limit = 20, int offset = 0);
    nlohmann::json get_user_mentions(const std::string& user_id, int limit = 20, int offset = 0);
    
private:
    // Helper methods
    nlohmann::json note_to_json(const Note& note, const std::string& requesting_user_id = "") const;
    nlohmann::json notes_to_json(const std::vector<Note>& notes, const std::string& requesting_user_id = "") const;
    nlohmann::json create_success_response(const std::string& message, const nlohmann::json& data = nlohmann::json::object()) const;
    nlohmann::json create_error_response(const std::string& error, int code = 400, const std::string& details = "") const;
    nlohmann::json create_paginated_response(const std::vector<Note>& notes, int total_count, int limit, int offset) const;
    
    // Validation helpers
    bool validate_note_data(const nlohmann::json& data, std::string& error_message) const;
    bool validate_user_permissions(const std::string& note_id, const std::string& user_id, const std::string& operation) const;
    bool validate_content_length(const std::string& content, std::string& error_message) const;
    bool validate_visibility_settings(const nlohmann::json& data, std::string& error_message) const;
    
    // Content processing helpers
    Note process_note_request(const nlohmann::json& request_data, const std::string& user_id) const;
    void populate_note_metadata(Note& note, const nlohmann::json& request_data) const;
    void process_note_attachments(Note& note, const nlohmann::json& request_data) const;
    void extract_content_features(Note& note) const;
    
    // Security and privacy helpers
    bool can_user_view_note(const Note& note, const std::string& user_id) const;
    bool can_user_interact_with_note(const Note& note, const std::string& user_id, const std::string& interaction_type) const;
    void apply_privacy_filter(std::vector<Note>& notes, const std::string& user_id) const;
    void sanitize_note_for_user(Note& note, const std::string& user_id) const;
    
    // Analytics helpers
    nlohmann::json calculate_engagement_metrics(const Note& note) const;
    nlohmann::json get_time_series_metrics(const std::string& note_id, const std::string& timeframe) const;
    nlohmann::json get_demographic_metrics(const std::string& note_id) const;
    
    // Rate limiting and abuse prevention
    bool check_rate_limits(const std::string& user_id, const std::string& operation) const;
    bool detect_spam_content(const std::string& content) const;
    bool check_duplicate_content(const std::string& content, const std::string& user_id) const;
    
    // Error handling
    void log_controller_error(const std::string& operation, const std::string& error, const std::string& user_id = "") const;
    nlohmann::json handle_repository_exception(const std::exception& e, const std::string& operation) const;
    
    // Cache management
    void invalidate_user_cache(const std::string& user_id) const;
    void invalidate_timeline_cache(const std::string& user_id) const;
    void update_trending_cache() const;
    
    // Constants
    static constexpr int MAX_CONTENT_LENGTH = 300;
    static constexpr int MAX_HASHTAGS = 10;
    static constexpr int MAX_MENTIONS = 10;
    static constexpr int MAX_ATTACHMENTS = 4;
    static constexpr int DEFAULT_TIMELINE_LIMIT = 20;
    static constexpr int MAX_TIMELINE_LIMIT = 100;
    static constexpr int DEFAULT_SEARCH_LIMIT = 20;
    static constexpr int MAX_SEARCH_LIMIT = 50;
};

} // namespace sonet::note::controllers