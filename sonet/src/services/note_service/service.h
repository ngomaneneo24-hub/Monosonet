/*
 * Copyright (c) 2025 Neo Qiss
 * All rights reserved.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

#pragma once

#include "models/note.h"
#include "validators/note_validator.h"
#include "repositories/note_repository.h"
#include <nlohmann/json.hpp>
#include <memory>
#include <string>
#include <vector>

namespace sonet::note {

using json = nlohmann::json;
using namespace sonet::note::models;
using namespace sonet::note::validators;
using namespace sonet::note::repositories;

/**
 * @brief Core Note Service Implementation
 * 
 * Provides the main business logic for the note service including:
 * - Note creation, retrieval, updating, and deletion
 * - Timeline management
 * - Search functionality
 * - Analytics and metrics
 * - Real-time operations
 */
class NoteService {
public:
    // Constructor
    NoteService(
        std::shared_ptr<NoteRepository> note_repository,
        std::shared_ptr<NoteValidator> validator
    );
    
    // ========== CORE NOTE OPERATIONS ==========
    
    /**
     * @brief Create a new note
     */
    json create_note(const json& note_data, const std::string& user_id);
    
    /**
     * @brief Get a note by ID
     */
    json get_note(const std::string& note_id, const std::string& requesting_user_id = "");
    
    /**
     * @brief Update an existing note
     */
    json update_note(const std::string& note_id, const json& update_data, const std::string& user_id);
    
    /**
     * @brief Delete a note
     */
    json delete_note(const std::string& note_id, const std::string& user_id);
    
    // ========== ENGAGEMENT OPERATIONS ==========
    
    /**
     * @brief Like a note
     */
    json like_note(const std::string& user_id, const std::string& note_id);
    
    /**
     * @brief Unlike a note
     */
    json unlike_note(const std::string& user_id, const std::string& note_id);
    
    /**
     * @brief Renote (repost) a note
     */
    json renote(const std::string& user_id, const std::string& note_id);
    
    /**
     * @brief Undo renote
     */
    json undo_renote(const std::string& user_id, const std::string& note_id);
    
    // ========== TIMELINE OPERATIONS ==========
    
    /**
     * @brief Get user's home timeline
     */
    json get_timeline(const std::string& user_id, int limit = 20, const std::string& cursor = "");
    
    /**
     * @brief Get timeline updates for streaming
     */
    json get_timeline_updates(const std::string& user_id, const std::string& since_cursor = "");
    
    /**
     * @brief Get user's profile timeline
     */
    json get_user_timeline(const std::string& target_user_id, const std::string& requesting_user_id = "", int limit = 20);
    
    // ========== SEARCH OPERATIONS ==========
    
    /**
     * @brief Search notes by content
     */
    json search_notes(const std::string& query, const std::string& user_id = "", int limit = 20);
    
    /**
     * @brief Search hashtags
     */
    json search_hashtags(const std::string& query, int limit = 20);
    
    // ========== ANALYTICS OPERATIONS ==========
    
    /**
     * @brief Get note analytics
     */
    json get_note_analytics(const std::string& note_id, const std::string& user_id);
    
    /**
     * @brief Get user analytics
     */
    json get_user_analytics(const std::string& user_id);
    
private:
    std::shared_ptr<NoteRepository> note_repository_;
    std::shared_ptr<NoteValidator> validator_;
    
    // Helper methods
    json create_success_response(const json& data, const std::string& message = "Success");
    json create_error_response(const std::string& error_code, const std::string& message);
    void track_note_view(const std::string& note_id, const std::string& user_id);
    void invalidate_timeline_cache(const std::string& user_id);
};

} // namespace sonet::note
