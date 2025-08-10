#pragma once
#include <string>
#include <vector>
#include <chrono>
#include <memory>

namespace sonet {
namespace common {
    struct Timestamp {
        int64_t seconds = 0;
        int32_t nanos = 0;
    };
}

namespace timeline {
    struct UserProfile {
        std::string user_id;
        std::string display_name;
        std::string bio;
        int32_t followers_count = 0;
        int32_t following_count = 0;
        bool verified = false;
    };

    struct NoteMetrics {
        int32_t likes() const { return likes_; }
        int32_t renotes() const { return renotes_; }
        int32_t comments() const { return comments_; }
        int32_t views() const { return views_; }

        void set_likes(int32_t value) { likes_ = value; }
        void set_renotes(int32_t value) { renotes_ = value; }
        void set_comments(int32_t value) { comments_ = value; }
        void set_views(int32_t value) { views_ = value; }

        // Deprecated aliases
        [[deprecated("Use renotes() instead")]] int32_t reposts() const { return renotes_; }
        [[deprecated("Use set_renotes() instead")]] void set_reposts(int32_t value) { renotes_ = value; }

    private:
        int32_t likes_ = 0;
        int32_t renotes_ = 0; // formerly reposts_
        int32_t comments_ = 0;
        int32_t views_ = 0;
    };

    struct Note {
        std::string id;
        std::string author_id;
        std::string content;
        std::string media_url;
        ::sonet::common::Timestamp created_at;
        NoteMetrics metrics;
        std::vector<std::string> mentions;
        std::vector<std::string> hashtags;
    bool is_renote = false; // formerly is_repost
        std::string original_note_id;
        UserProfile author_profile;
    };

    struct TimelineRequest {
        std::string user_id;
        int32_t limit = 50;
        std::string cursor;
        std::string source = "hybrid";
    };

    struct Timeline {
        std::vector<Note> notes;
        std::string next_cursor;
        std::string user_id;
        ::sonet::common::Timestamp generated_at;
        std::string algorithm_version;
    };

    struct RefreshTimelineRequest {
        std::string user_id;
        std::string source = "hybrid";
    };

    struct RefreshTimelineResponse {
        Timeline timeline;
        bool success = true;
        std::string message;
    };

    struct MarkTimelineReadRequest {
        std::string user_id;
        std::string last_read_note_id;
    };

    struct MarkTimelineReadResponse {
        bool success = true;
        std::string message;
    };

    struct HealthCheckRequest {};

    struct HealthCheckResponse {
        bool healthy = true;
        std::string status = "OK";
        std::string version = "1.0.0";
    };

    // User engagement and content filter types
    struct ContentFilterPreferences {
        bool show_nsfw = false;
        bool show_spoilers = false;
        std::vector<std::string> muted_keywords;
        std::vector<std::string> muted_users;
        std::vector<std::string> blocked_domains;
        int32_t min_quality_score = 0;
        bool hide_low_engagement = false;
    };

    struct UserEngagementProfile {
        std::string user_id;
        std::vector<std::string> following_ids;
        std::vector<std::string> interest_categories;
        std::vector<std::string> preferred_authors;
        std::vector<std::string> recent_engagements;
        double engagement_score = 0.0;
        ::sonet::common::Timestamp last_active;
        ContentFilterPreferences filter_preferences;
    };

    struct EngagementEvent {
        std::string user_id;
        std::string note_id;
        std::string event_type; // "like", "renote", "comment", "view" (formerly repost)
        ::sonet::common::Timestamp timestamp;
        double engagement_score = 1.0;
    };

    // Content source adapters
    struct ContentRequest {
        std::string user_id;
        int32_t limit = 20;
        std::string algorithm = "default";
        UserEngagementProfile user_profile;
    };

    struct ContentResponse {
        std::vector<Note> notes;
        std::string source;
        double confidence_score = 1.0;
        std::string algorithm_version;
    };
}

// Fanout service stub
namespace fanout {
    struct FanoutRequest {
        std::string note_id;
        std::string author_id;
        std::vector<std::string> recipient_ids;
    };

    struct FanoutResponse {
        bool success = true;
        std::string message;
        int32_t recipients_count = 0;
    };
}
}
