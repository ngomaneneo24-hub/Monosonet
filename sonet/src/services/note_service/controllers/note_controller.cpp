/*
 * Copyright (c) 2025 Neo Qiss
 * All rights reserved.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

#include "note_controller.h"
#include <spdlog/spdlog.h>
#include <regex>
#include <algorithm>
#include <chrono>
#include <iomanip>
#include <sstream>

namespace sonet::note::controllers {

NoteController::NoteController(std::shared_ptr<NoteRepository> repository)
    : note_repository_(repository) {
    spdlog::info("NoteController initialized");
}

// Core CRUD operations
nlohmann::json NoteController::create_note(const nlohmann::json& request_data, const std::string& user_id) {
    try {
        // Validate request data
        std::string error_message;
        if (!validate_note_data(request_data, error_message)) {
            return create_error_response(error_message, 400);
        }
        
        // Check rate limits
        if (!check_rate_limits(user_id, "create_note")) {
            return create_error_response("Rate limit exceeded. Please wait before posting again.", 429);
        }
        
        // Get content and validate length
        std::string content = request_data.value("content", "");
        if (!validate_content_length(content, error_message)) {
            return create_error_response(error_message, 400);
        }
        
        // Check for spam and duplicate content
        if (detect_spam_content(content)) {
            return create_error_response("Content flagged as potential spam", 400);
        }
        
        if (check_duplicate_content(content, user_id)) {
            return create_error_response("Duplicate content detected", 400);
        }
        
        // Create note object
        Note note = process_note_request(request_data, user_id);
        
        // Validate note
        if (!note.is_valid()) {
            auto errors = note.get_validation_errors();
            return create_error_response("Note validation failed", 400, "Validation errors detected");
        }
        
        // Save to repository
        bool created = note_repository_->create(note);
        if (!created) {
            return create_error_response("Failed to create note", 500);
        }
        
        // Invalidate caches
        invalidate_user_cache(user_id);
        invalidate_timeline_cache(user_id);
        update_trending_cache();
        
        // Return success response
        nlohmann::json response_data = note_to_json(note, user_id);
        return create_success_response("Note created successfully", response_data);
        
    } catch (const std::exception& e) {
        log_controller_error("create_note", e.what(), user_id);
        return handle_repository_exception(e, "create_note");
    }
}

nlohmann::json NoteController::get_note(const std::string& note_id, const std::string& requesting_user_id) {
    try {
        auto note_opt = note_repository_->get_by_id(note_id);
        if (!note_opt) {
            return create_error_response("Note not found", 404);
        }
        
        Note note = note_opt.value();
        
        // Check if user can view this note
        if (!can_user_view_note(note, requesting_user_id)) {
            return create_error_response("Access denied", 403);
        }
        
        // Increment view count (but not for the author)
        if (requesting_user_id != note.author_id && !requesting_user_id.empty()) {
            note.increment_views();
            note_repository_->update(note);
        }
        
        // Sanitize note for user
        sanitize_note_for_user(note, requesting_user_id);
        
        nlohmann::json response_data = note_to_json(note, requesting_user_id);
        return create_success_response("Note retrieved successfully", response_data);
        
    } catch (const std::exception& e) {
        log_controller_error("get_note", e.what(), requesting_user_id);
        return handle_repository_exception(e, "get_note");
    }
}

nlohmann::json NoteController::update_note(const std::string& note_id, const nlohmann::json& request_data, const std::string& user_id) {
    try {
        auto note_opt = note_repository_->get_by_id(note_id);
        if (!note_opt) {
            return create_error_response("Note not found", 404);
        }
        
        Note note = note_opt.value();
        
        // Check permissions
        if (!validate_user_permissions(note_id, user_id, "update")) {
            return create_error_response("Permission denied", 403);
        }
        
        // Validate update data
        std::string error_message;
        if (!validate_note_data(request_data, error_message)) {
            return create_error_response(error_message, 400);
        }
        
        // Update content if provided
        if (request_data.contains("content")) {
            std::string new_content = request_data["content"];
            if (!validate_content_length(new_content, error_message)) {
                return create_error_response(error_message, 400);
            }
            
            if (!note.set_content(new_content)) {
                return create_error_response("Failed to update content", 400);
            }
        }
        
        // Update visibility if provided
        if (request_data.contains("visibility")) {
            std::string visibility_str = request_data["visibility"];
            NoteVisibility visibility = string_to_note_visibility(visibility_str);
            note.set_visibility(visibility);
        }
        
        // Update other metadata
        populate_note_metadata(note, request_data);
        
        // Save changes
        bool updated = note_repository_->update(note);
        if (!updated) {
            return create_error_response("Failed to update note", 500);
        }
        
        // Invalidate caches
        invalidate_user_cache(user_id);
        invalidate_timeline_cache(user_id);
        
        nlohmann::json response_data = note_to_json(note, user_id);
        return create_success_response("Note updated successfully", response_data);
        
    } catch (const std::exception& e) {
        log_controller_error("update_note", e.what(), user_id);
        return handle_repository_exception(e, "update_note");
    }
}

nlohmann::json NoteController::delete_note(const std::string& note_id, const std::string& user_id) {
    try {
        auto note_opt = note_repository_->get_by_id(note_id);
        if (!note_opt) {
            return create_error_response("Note not found", 404);
        }
        
        Note note = note_opt.value();
        
        // Check permissions
        if (!validate_user_permissions(note_id, user_id, "delete")) {
            return create_error_response("Permission denied", 403);
        }
        
        // Soft delete the note
        note.soft_delete();
        bool updated = note_repository_->update(note);
        
        if (!updated) {
            return create_error_response("Failed to delete note", 500);
        }
        
        // Invalidate caches
        invalidate_user_cache(user_id);
        invalidate_timeline_cache(user_id);
        
        return create_success_response("Note deleted successfully");
        
    } catch (const std::exception& e) {
        log_controller_error("delete_note", e.what(), user_id);
        return handle_repository_exception(e, "delete_note");
    }
}

// Timeline operations
nlohmann::json NoteController::get_user_timeline(const std::string& user_id, int limit, int offset, const std::string& max_id) {
    try {
        // Validate pagination parameters
        limit = std::min(limit, MAX_TIMELINE_LIMIT);
        limit = std::max(limit, 1);
        offset = std::max(offset, 0);
        
        // Get user's notes
        auto notes = note_repository_->get_by_user_id(user_id, limit, offset);
        
        // Apply privacy filters
        std::vector<Note> filtered_notes;
        for (auto& note : notes) {
            if (!note.is_deleted() && note.status == NoteStatus::ACTIVE) {
                filtered_notes.push_back(note);
            }
        }
        
        // Get total count for pagination
        int total_count = note_repository_->count_by_user_id(user_id);
        
        return create_paginated_response(filtered_notes, total_count, limit, offset);
        
    } catch (const std::exception& e) {
        log_controller_error("get_user_timeline", e.what(), user_id);
        return handle_repository_exception(e, "get_user_timeline");
    }
}

nlohmann::json NoteController::get_home_timeline(const std::string& user_id, int limit, int offset) {
    try {
        // Validate pagination parameters
        limit = std::min(limit, MAX_TIMELINE_LIMIT);
        limit = std::max(limit, 1);
        offset = std::max(offset, 0);
        
        // Get followed users (in real implementation, call follow service)
        std::vector<std::string> following_ids = {"user1", "user2", "user3"}; // Mock data
        following_ids.push_back(user_id); // Include user's own notes
        
        // Get timeline notes
        auto notes = note_repository_->get_timeline_for_users(following_ids, limit, offset);
        
        // Apply privacy filters
        apply_privacy_filter(notes, user_id);
        
        // Sort by engagement score and recency
        std::sort(notes.begin(), notes.end(), [](const Note& a, const Note& b) {
            // Prioritize recent and engaging content
            double score_a = a.calculate_engagement_rate() + (a.is_fresh(60) ? 0.5 : 0.0);
            double score_b = b.calculate_engagement_rate() + (b.is_fresh(60) ? 0.5 : 0.0);
            return score_a > score_b;
        });
        
        return create_paginated_response(notes, static_cast<int>(notes.size()), limit, offset);
        
    } catch (const std::exception& e) {
        log_controller_error("get_home_timeline", e.what(), user_id);
        return handle_repository_exception(e, "get_home_timeline");
    }
}

nlohmann::json NoteController::get_public_timeline(int limit, int offset, const std::string& filter) {
    try {
        // Validate pagination parameters
        limit = std::min(limit, MAX_TIMELINE_LIMIT);
        limit = std::max(limit, 1);
        offset = std::max(offset, 0);
        
        // Get public notes
        auto notes = note_repository_->get_public_notes(limit, offset);
        
        // Apply content filter if specified
        if (!filter.empty()) {
            std::vector<Note> filtered_notes;
            for (const auto& note : notes) {
                if (filter == "trending" && note.calculate_virality_score() > 0.3) {
                    filtered_notes.push_back(note);
                } else if (filter == "recent" && note.is_recent(24)) {
                    filtered_notes.push_back(note);
                } else if (filter == "popular" && note.get_total_engagement() > 10) {
                    filtered_notes.push_back(note);
                } else if (filter.empty()) {
                    filtered_notes.push_back(note);
                }
            }
            notes = filtered_notes;
        }
        
        return create_paginated_response(notes, static_cast<int>(notes.size()), limit, offset);
        
    } catch (const std::exception& e) {
        log_controller_error("get_public_timeline", e.what());
        return handle_repository_exception(e, "get_public_timeline");
    }
}

nlohmann::json NoteController::get_trending_notes(int limit, const std::string& timeframe) {
    try {
        limit = std::min(limit, MAX_TIMELINE_LIMIT);
        limit = std::max(limit, 1);
        
        // Parse timeframe
        int hours = 24; // default
        if (timeframe == "1h") hours = 1;
        else if (timeframe == "6h") hours = 6;
        else if (timeframe == "12h") hours = 12;
        else if (timeframe == "24h") hours = 24;
        else if (timeframe == "7d") hours = 168;
        
        // Get trending notes
        auto notes = note_repository_->get_trending_notes(hours, limit);
        
        // Sort by virality score
        std::sort(notes.begin(), notes.end(), [](const Note& a, const Note& b) {
            return a.calculate_virality_score() > b.calculate_virality_score();
        });
        
        return create_paginated_response(notes, static_cast<int>(notes.size()), limit, 0);
        
    } catch (const std::exception& e) {
        log_controller_error("get_trending_notes", e.what());
        return handle_repository_exception(e, "get_trending_notes");
    }
}

// Engagement operations
nlohmann::json NoteController::like_note(const std::string& note_id, const std::string& user_id) {
    try {
        auto note_opt = note_repository_->get_by_id(note_id);
        if (!note_opt) {
            return create_error_response("Note not found", 404);
        }
        
        Note note = note_opt.value();
        
        // Check if user can interact with note
        if (!can_user_interact_with_note(note, user_id, "like")) {
            return create_error_response("Cannot like this note", 403);
        }
        
        // Check if already liked (in real implementation, check user interactions table)
        auto liked_users = note.liked_by_user_ids;
        if (std::find(liked_users.begin(), liked_users.end(), user_id) != liked_users.end()) {
            return create_error_response("Note already liked", 400);
        }
        
        // Add like
        note.increment_likes();
        note.record_user_interaction(user_id, "like");
        
        bool updated = note_repository_->update(note);
        if (!updated) {
            return create_error_response("Failed to like note", 500);
        }
        
        nlohmann::json response_data = {
            {"note_id", note_id},
            {"like_count", note.like_count},
            {"liked", true}
        };
        
        return create_success_response("Note liked successfully", response_data);
        
    } catch (const std::exception& e) {
        log_controller_error("like_note", e.what(), user_id);
        return handle_repository_exception(e, "like_note");
    }
}

nlohmann::json NoteController::unlike_note(const std::string& note_id, const std::string& user_id) {
    try {
        auto note_opt = note_repository_->get_by_id(note_id);
        if (!note_opt) {
            return create_error_response("Note not found", 404);
        }
        
        Note note = note_opt.value();
        
        // Check if note was liked
        auto liked_users = note.liked_by_user_ids;
        if (std::find(liked_users.begin(), liked_users.end(), user_id) == liked_users.end()) {
            return create_error_response("Note not liked", 400);
        }
        
        // Remove like
        note.decrement_likes();
        
        // Remove from liked users list
        liked_users.erase(std::remove(liked_users.begin(), liked_users.end(), user_id), liked_users.end());
        note.liked_by_user_ids = liked_users;
        
        bool updated = note_repository_->update(note);
        if (!updated) {
            return create_error_response("Failed to unlike note", 500);
        }
        
        nlohmann::json response_data = {
            {"note_id", note_id},
            {"like_count", note.like_count},
            {"liked", false}
        };
        
        return create_success_response("Note unliked successfully", response_data);
        
    } catch (const std::exception& e) {
        log_controller_error("unlike_note", e.what(), user_id);
        return handle_repository_exception(e, "unlike_note");
    }
}

nlohmann::json NoteController::repost_note(const std::string& note_id, const std::string& user_id, const std::string& additional_content) {
    try {
        auto note_opt = note_repository_->get_by_id(note_id);
        if (!note_opt) {
            return create_error_response("Note not found", 404);
        }
        
        Note original_note = note_opt.value();
        
        // Check if user can repost
        if (!can_user_interact_with_note(original_note, user_id, "repost")) {
            return create_error_response("Cannot repost this note", 403);
        }
        
        // Create repost note
        Note repost_note(user_id, additional_content, NoteType::REPOST);
        repost_note.set_repost_target(note_id);
        
        // Validate additional content if provided
        if (!additional_content.empty()) {
            std::string error_message;
            if (!validate_content_length(additional_content, error_message)) {
                return create_error_response(error_message, 400);
            }
        }
        
        // Save repost
        bool created = note_repository_->create(repost_note);
        if (!created) {
            return create_error_response("Failed to create repost", 500);
        }
        
        // Update original note repost count
        original_note.increment_reposts();
        original_note.record_user_interaction(user_id, "repost");
        note_repository_->update(original_note);
        
        nlohmann::json response_data = note_to_json(repost_note, user_id);
        return create_success_response("Note reposted successfully", response_data);
        
    } catch (const std::exception& e) {
        log_controller_error("repost_note", e.what(), user_id);
        return handle_repository_exception(e, "repost_note");
    }
}

// Reply operations
nlohmann::json NoteController::create_reply(const std::string& note_id, const nlohmann::json& request_data, const std::string& user_id) {
    try {
        auto note_opt = note_repository_->get_by_id(note_id);
        if (!note_opt) {
            return create_error_response("Original note not found", 404);
        }
        
        Note original_note = note_opt.value();
        
        // Check if user can reply
        if (!can_user_interact_with_note(original_note, user_id, "reply")) {
            return create_error_response("Cannot reply to this note", 403);
        }
        
        // Validate reply content
        std::string error_message;
        if (!validate_note_data(request_data, error_message)) {
            return create_error_response(error_message, 400);
        }
        
        std::string content = request_data.value("content", "");
        if (!validate_content_length(content, error_message)) {
            return create_error_response(error_message, 400);
        }
        
        // Create reply note
        Note reply_note = process_note_request(request_data, user_id);
        reply_note.set_reply_target(note_id, original_note.author_id);
        
        // Save reply
        bool created = note_repository_->create(reply_note);
        if (!created) {
            return create_error_response("Failed to create reply", 500);
        }
        
        // Update original note reply count
        original_note.increment_replies();
        note_repository_->update(original_note);
        
        nlohmann::json response_data = note_to_json(reply_note, user_id);
        return create_success_response("Reply created successfully", response_data);
        
    } catch (const std::exception& e) {
        log_controller_error("create_reply", e.what(), user_id);
        return handle_repository_exception(e, "create_reply");
    }
}

nlohmann::json NoteController::get_replies(const std::string& note_id, int limit, int offset, const std::string& sort) {
    try {
        limit = std::min(limit, MAX_TIMELINE_LIMIT);
        limit = std::max(limit, 1);
        offset = std::max(offset, 0);
        
        auto replies = note_repository_->get_replies(note_id, limit, offset);
        
        // Sort replies based on requested sort order
        if (sort == "engagement") {
            std::sort(replies.begin(), replies.end(), [](const Note& a, const Note& b) {
                return a.get_total_engagement() > b.get_total_engagement();
            });
        } else if (sort == "chronological") {
            std::sort(replies.begin(), replies.end(), [](const Note& a, const Note& b) {
                return a.created_at > b.created_at; // Newest first
            });
        }
        
        return create_paginated_response(replies, static_cast<int>(replies.size()), limit, offset);
        
    } catch (const std::exception& e) {
        log_controller_error("get_replies", e.what());
        return handle_repository_exception(e, "get_replies");
    }
}

// Search operations
nlohmann::json NoteController::search_notes(const std::string& query, int limit, int offset, 
                                           const std::string& filter, const std::string& sort) {
    try {
        limit = std::min(limit, MAX_SEARCH_LIMIT);
        limit = std::max(limit, 1);
        offset = std::max(offset, 0);
        
        if (query.empty()) {
            return create_error_response("Search query cannot be empty", 400);
        }
        
        // Perform search
        auto notes = note_repository_->search_notes(query, limit, offset);
        
        // Apply filter if specified
        if (!filter.empty()) {
            std::vector<Note> filtered_notes;
            for (const auto& note : notes) {
                if (filter == "images" && note.has_attachments()) {
                    filtered_notes.push_back(note);
                } else if (filter == "videos" && note.has_attachments()) {
                    // In real implementation, check attachment types
                    filtered_notes.push_back(note);
                } else if (filter == "verified" && note.is_verified_author) {
                    filtered_notes.push_back(note);
                } else if (filter.empty()) {
                    filtered_notes.push_back(note);
                }
            }
            notes = filtered_notes;
        }
        
        // Sort results
        if (sort == "recent") {
            std::sort(notes.begin(), notes.end(), [](const Note& a, const Note& b) {
                return a.created_at > b.created_at;
            });
        } else if (sort == "engagement") {
            std::sort(notes.begin(), notes.end(), [](const Note& a, const Note& b) {
                return a.get_total_engagement() > b.get_total_engagement();
            });
        }
        // Default sort is by relevance (handled by repository)
        
        return create_paginated_response(notes, static_cast<int>(notes.size()), limit, offset);
        
    } catch (const std::exception& e) {
        log_controller_error("search_notes", e.what());
        return handle_repository_exception(e, "search_notes");
    }
}

nlohmann::json NoteController::search_by_hashtag(const std::string& hashtag, int limit, int offset) {
    try {
        limit = std::min(limit, MAX_SEARCH_LIMIT);
        limit = std::max(limit, 1);
        offset = std::max(offset, 0);
        
        if (hashtag.empty()) {
            return create_error_response("Hashtag cannot be empty", 400);
        }
        
        // Remove # if present
        std::string clean_hashtag = hashtag;
        if (clean_hashtag[0] == '#') {
            clean_hashtag = clean_hashtag.substr(1);
        }
        
        auto notes = note_repository_->get_by_hashtag(clean_hashtag, limit, offset);
        
        // Sort by recency and engagement
        std::sort(notes.begin(), notes.end(), [](const Note& a, const Note& b) {
            double score_a = a.calculate_engagement_rate() + (a.is_recent(24) ? 0.5 : 0.0);
            double score_b = b.calculate_engagement_rate() + (b.is_recent(24) ? 0.5 : 0.0);
            return score_a > score_b;
        });
        
        return create_paginated_response(notes, static_cast<int>(notes.size()), limit, offset);
        
    } catch (const std::exception& e) {
        log_controller_error("search_by_hashtag", e.what());
        return handle_repository_exception(e, "search_by_hashtag");
    }
}

// Analytics operations
nlohmann::json NoteController::get_note_metrics(const std::string& note_id, const std::string& user_id) {
    try {
        auto note_opt = note_repository_->get_by_id(note_id);
        if (!note_opt) {
            return create_error_response("Note not found", 404);
        }
        
        Note note = note_opt.value();
        
        // Check if user can view metrics (only author can see detailed metrics)
        if (note.author_id != user_id) {
            return create_error_response("Permission denied", 403);
        }
        
        nlohmann::json metrics = calculate_engagement_metrics(note);
        return create_success_response("Note metrics retrieved successfully", metrics);
        
    } catch (const std::exception& e) {
        log_controller_error("get_note_metrics", e.what(), user_id);
        return handle_repository_exception(e, "get_note_metrics");
    }
}

// Helper method implementations
nlohmann::json NoteController::note_to_json(const Note& note, const std::string& requesting_user_id) const {
    nlohmann::json note_json = note.to_json();
    
    // Add computed fields
    note_json["age_relative"] = note.get_relative_timestamp();
    note_json["engagement_rate"] = note.calculate_engagement_rate();
    note_json["virality_score"] = note.calculate_virality_score();
    note_json["total_engagement"] = note.get_total_engagement();
    
    // Add user-specific fields
    if (!requesting_user_id.empty()) {
        note_json["is_liked_by_user"] = std::find(note.liked_by_user_ids.begin(), 
                                                 note.liked_by_user_ids.end(), 
                                                 requesting_user_id) != note.liked_by_user_ids.end();
        note_json["is_reposted_by_user"] = std::find(note.reposted_by_user_ids.begin(), 
                                                    note.reposted_by_user_ids.end(), 
                                                    requesting_user_id) != note.reposted_by_user_ids.end();
        note_json["can_reply"] = note.can_user_reply(requesting_user_id);
        note_json["can_repost"] = note.can_user_repost(requesting_user_id);
        note_json["can_quote"] = note.can_user_quote(requesting_user_id);
    }
    
    return note_json;
}

nlohmann::json NoteController::notes_to_json(const std::vector<Note>& notes, const std::string& requesting_user_id) const {
    nlohmann::json notes_array = nlohmann::json::array();
    
    for (const auto& note : notes) {
        notes_array.push_back(note_to_json(note, requesting_user_id));
    }
    
    return notes_array;
}

nlohmann::json NoteController::create_success_response(const std::string& message, const nlohmann::json& data) const {
    nlohmann::json response;
    response["success"] = true;
    response["message"] = message;
    response["timestamp"] = std::time(nullptr);
    
    if (!data.is_null()) {
        response["data"] = data;
    }
    
    return response;
}

nlohmann::json NoteController::create_error_response(const std::string& error, int code, const std::string& details) const {
    nlohmann::json response;
    response["success"] = false;
    response["error"] = error;
    response["code"] = code;
    response["timestamp"] = std::time(nullptr);
    
    if (!details.empty()) {
        response["details"] = details;
    }
    
    return response;
}

nlohmann::json NoteController::create_paginated_response(const std::vector<Note>& notes, int total_count, int limit, int offset) const {
    nlohmann::json response;
    response["success"] = true;
    response["data"] = {
        {"notes", notes_to_json(notes)},
        {"pagination", {
            {"total_count", total_count},
            {"limit", limit},
            {"offset", offset},
            {"has_more", offset + limit < total_count}
        }}
    };
    response["timestamp"] = std::time(nullptr);
    
    return response;
}

// Validation helper implementations
bool NoteController::validate_note_data(const nlohmann::json& data, std::string& error_message) const {
    if (!data.contains("content")) {
        error_message = "Content is required";
        return false;
    }
    
    std::string content = data["content"];
    if (content.empty()) {
        error_message = "Content cannot be empty";
        return false;
    }
    
    return validate_content_length(content, error_message);
}

bool NoteController::validate_content_length(const std::string& content, std::string& error_message) const {
    if (content.length() > MAX_CONTENT_LENGTH) {
        error_message = "Content exceeds maximum length of " + std::to_string(MAX_CONTENT_LENGTH) + " characters";
        return false;
    }
    return true;
}

bool NoteController::validate_user_permissions(const std::string& note_id, const std::string& user_id, const std::string& operation) const {
    try {
        auto note_opt = note_repository_->get_by_id(note_id);
        if (!note_opt) return false;
        
        Note note = note_opt.value();
        
        // Only the author can update or delete their notes
        if (operation == "update" || operation == "delete") {
            return note.author_id == user_id;
        }
        
        return true;
    } catch (const std::exception& e) {
        spdlog::error("Error validating user permissions: {}", e.what());
        return false;
    }
}

Note NoteController::process_note_request(const nlohmann::json& request_data, const std::string& user_id) const {
    std::string content = request_data.value("content", "");
    Note note(user_id, content);
    
    // Set visibility
    if (request_data.contains("visibility")) {
        std::string visibility_str = request_data["visibility"];
        note.set_visibility(string_to_note_visibility(visibility_str));
    }
    
    // Set location if provided
    if (request_data.contains("location")) {
        auto location = request_data["location"];
        if (location.contains("latitude") && location.contains("longitude")) {
            double lat = location["latitude"];
            double lng = location["longitude"];
            std::string name = location.value("name", "");
            note.set_location(lat, lng, name);
        }
    }
    
    // Set content warnings
    if (request_data.contains("content_warning")) {
        std::string warning_str = request_data["content_warning"];
        note.set_content_warning(string_to_content_warning(warning_str));
    }
    
    // Set sensitivity flags
    if (request_data.contains("is_sensitive")) {
        note.mark_sensitive(request_data["is_sensitive"]);
    }
    
    if (request_data.contains("contains_spoilers")) {
        note.mark_spoilers(request_data["contains_spoilers"]);
    }
    
    return note;
}

void NoteController::populate_note_metadata(Note& note, const nlohmann::json& request_data) const {
    if (request_data.contains("client_name")) {
        note.client_name = request_data["client_name"];
    }
    
    if (request_data.contains("client_version")) {
        note.client_version = request_data["client_version"];
    }
    
    if (request_data.contains("allow_replies")) {
        note.allow_replies = request_data["allow_replies"];
    }
    
    if (request_data.contains("allow_reposts")) {
        note.allow_reposts = request_data["allow_reposts"];
    }
    
    if (request_data.contains("allow_quotes")) {
        note.allow_quotes = request_data["allow_quotes"];
    }
}

bool NoteController::can_user_view_note(const Note& note, const std::string& user_id) const {
    // In real implementation, get user's following list and circle
    std::vector<std::string> following_ids; // Mock empty for now
    std::vector<std::string> circle_ids;    // Mock empty for now
    
    return note.is_visible_to_user(user_id, following_ids, circle_ids);
}

bool NoteController::can_user_interact_with_note(const Note& note, const std::string& user_id, const std::string& interaction_type) const {
    if (!can_user_view_note(note, user_id)) {
        return false;
    }
    
    if (interaction_type == "like") {
        return true; // Anyone who can see can like
    } else if (interaction_type == "reply") {
        return note.can_user_reply(user_id);
    } else if (interaction_type == "repost") {
        return note.can_user_repost(user_id);
    } else if (interaction_type == "quote") {
        return note.can_user_quote(user_id);
    }
    
    return false;
}

void NoteController::apply_privacy_filter(std::vector<Note>& notes, const std::string& user_id) const {
    notes.erase(std::remove_if(notes.begin(), notes.end(), 
        [this, &user_id](const Note& note) {
            return !can_user_view_note(note, user_id);
        }), notes.end());
}

nlohmann::json NoteController::calculate_engagement_metrics(const Note& note) const {
    nlohmann::json metrics;
    
    metrics["basic"] = {
        {"likes", note.like_count},
        {"reposts", note.repost_count},
        {"replies", note.reply_count},
        {"quotes", note.quote_count},
        {"views", note.view_count},
        {"bookmarks", note.bookmark_count}
    };
    
    metrics["calculated"] = {
        {"total_engagement", note.get_total_engagement()},
        {"engagement_rate", note.calculate_engagement_rate()},
        {"virality_score", note.calculate_virality_score()},
        {"likes_per_hour", note.get_likes_per_hour()},
        {"reposts_per_hour", note.get_reposts_per_hour()},
        {"replies_per_hour", note.get_replies_per_hour()},
        {"engagement_velocity", note.get_engagement_velocity()}
    };
    
    metrics["content"] = {
        {"character_count", note.get_content_length()},
        {"word_count", note.count_words()},
        {"hashtag_count", note.hashtags.size()},
        {"mention_count", note.mentioned_user_ids.size()},
        {"url_count", note.urls.size()},
        {"attachment_count", note.attachment_ids.size()}
    };
    
    metrics["quality"] = {
        {"spam_score", note.spam_score},
        {"toxicity_score", note.toxicity_score},
        {"readability_score", note.get_readability_score()}
    };
    
    return metrics;
}

// Rate limiting and abuse prevention
bool NoteController::check_rate_limits(const std::string& user_id, const std::string& operation) const {
    // Simplified rate limiting (in real implementation, use Redis or similar)
    static std::map<std::string, std::time_t> last_post_time;
    
    auto now = std::time(nullptr);
    auto key = user_id + "_" + operation;
    
    if (last_post_time.find(key) != last_post_time.end()) {
        auto time_diff = now - last_post_time[key];
        if (time_diff < 1) { // Minimum 1 second between posts
            return false;
        }
    }
    
    last_post_time[key] = now;
    return true;
}

bool NoteController::detect_spam_content(const std::string& content) const {
    // Simple spam detection
    if (content.empty()) return false;
    
    // Check for excessive capitalization
    int caps_count = 0;
    for (char c : content) {
        if (std::isupper(c)) caps_count++;
    }
    double caps_ratio = static_cast<double>(caps_count) / content.length();
    
    // Check for excessive punctuation
    int exclamation_count = std::count(content.begin(), content.end(), '!');
    
    return caps_ratio > 0.8 || exclamation_count > 5;
}

bool NoteController::check_duplicate_content(const std::string& content, const std::string& user_id) const {
    // In real implementation, check recent posts by user for duplicates
    // For now, return false (no duplicates)
    return false;
}

void NoteController::log_controller_error(const std::string& operation, const std::string& error, const std::string& user_id) const {
    spdlog::error("NoteController::{} error for user {}: {}", operation, user_id, error);
}

nlohmann::json NoteController::handle_repository_exception(const std::exception& e, const std::string& operation) const {
    spdlog::error("Repository error in {}: {}", operation, e.what());
    return create_error_response("Internal server error", 500, e.what());
}

// Cache management (stub implementations)
void NoteController::invalidate_user_cache(const std::string& user_id) const {
    // In real implementation, invalidate user-specific caches
    spdlog::debug("Invalidating cache for user: {}", user_id);
}

void NoteController::invalidate_timeline_cache(const std::string& user_id) const {
    // In real implementation, invalidate timeline caches
    spdlog::debug("Invalidating timeline cache for user: {}", user_id);
}

void NoteController::update_trending_cache() const {
    // In real implementation, update trending content cache
    spdlog::debug("Updating trending cache");
}

// Stub implementations for remaining methods
nlohmann::json NoteController::create_quote(const std::string& note_id, const nlohmann::json& request_data, const std::string& user_id) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::get_quotes(const std::string& note_id, int limit, int offset) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::create_thread(const nlohmann::json& request_data, const std::string& user_id) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::get_thread(const std::string& thread_id) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::add_to_thread(const std::string& thread_id, const nlohmann::json& request_data, const std::string& user_id) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::search_by_user(const std::string& username, int limit, int offset) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::get_note_engagement(const std::string& note_id, const std::string& user_id) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::get_note_analytics(const std::string& note_id, const std::string& user_id, const std::string& timeframe) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::flag_note(const std::string& note_id, const std::string& user_id, const std::string& reason) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::hide_note(const std::string& note_id, const std::string& user_id) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::report_note(const std::string& note_id, const std::string& user_id, const nlohmann::json& report_data) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::get_multiple_notes(const std::vector<std::string>& note_ids, const std::string& user_id) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::delete_multiple_notes(const std::vector<std::string>& note_ids, const std::string& user_id) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::bulk_update_notes(const nlohmann::json& updates_data, const std::string& user_id) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::schedule_note(const nlohmann::json& request_data, const std::string& user_id) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::get_scheduled_notes(const std::string& user_id, int limit) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::update_scheduled_note(const std::string& note_id, const nlohmann::json& request_data, const std::string& user_id) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::cancel_scheduled_note(const std::string& note_id, const std::string& user_id) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::save_draft(const nlohmann::json& request_data, const std::string& user_id) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::get_drafts(const std::string& user_id, int limit) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::update_draft(const std::string& note_id, const nlohmann::json& request_data, const std::string& user_id) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::publish_draft(const std::string& note_id, const std::string& user_id) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::delete_draft(const std::string& note_id, const std::string& user_id) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::get_mentioned_users(const std::string& note_id) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::get_hashtags(const std::string& note_id) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::get_urls(const std::string& note_id) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::preview_url(const std::string& url) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::get_user_likes(const std::string& user_id, int limit, int offset) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::get_user_reposts(const std::string& user_id, int limit, int offset) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::get_user_bookmarks(const std::string& user_id, int limit, int offset) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::get_user_mentions(const std::string& user_id, int limit, int offset) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::bookmark_note(const std::string& note_id, const std::string& user_id) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::unbookmark_note(const std::string& note_id, const std::string& user_id) {
    return create_error_response("Not implemented", 501);
}

nlohmann::json NoteController::unrepost_note(const std::string& note_id, const std::string& user_id) {
    return create_error_response("Not implemented", 501);
}

bool NoteController::validate_visibility_settings(const nlohmann::json& data, std::string& error_message) const {
    return true; // Stub implementation
}

void NoteController::process_note_attachments(Note& note, const nlohmann::json& request_data) const {
    // Stub implementation
}

void NoteController::extract_content_features(Note& note) const {
    // Stub implementation
}

void NoteController::sanitize_note_for_user(Note& note, const std::string& user_id) const {
    // Stub implementation
}

nlohmann::json NoteController::get_time_series_metrics(const std::string& note_id, const std::string& timeframe) const {
    return nlohmann::json::object();
}

nlohmann::json NoteController::get_demographic_metrics(const std::string& note_id) const {
    return nlohmann::json::object();
}

} // namespace sonet::note::controllers