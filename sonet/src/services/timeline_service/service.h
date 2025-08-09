//
// Copyright (c) 2025 Neo Qiss
// All rights reserved.
//
// This software is proprietary and confidential.
// Unauthorized copying, distribution, or use is strictly prohibited.
//

#pragma once

#include <memory>
#include <string>
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <chrono>
#include <mutex>
#include <queue>
#include <future>

#include <grpcpp/grpcpp.h>
#include <services/timeline.grpc.pb.h>
#include <services/note.grpc.pb.h>
#include <services/follow.grpc.pb.h>

namespace sonet::timeline {

// Forward declarations
class TimelineCache;
class RankingEngine;
class ContentFilter;
class RealtimeNotifier;

// Timeline item with computed ranking data
struct RankedTimelineItem {
    ::sonet::note::Note note;
    ::sonet::timeline::ContentSource source;
    ::sonet::timeline::RankingSignals signals;
    double final_score;
    std::chrono::system_clock::time_point injected_at;
    std::string injection_reason;
    
    // For sorting by score
    bool operator<(const RankedTimelineItem& other) const {
        return final_score < other.final_score;
    }
};

// User engagement profile for personalization
struct UserEngagementProfile {
    std::string user_id;
    std::unordered_map<std::string, double> author_affinity;      // author_id -> affinity score
    std::unordered_map<std::string, double> hashtag_interests;    // hashtag -> interest score
    std::unordered_map<std::string, double> topic_interests;      // topic -> interest score
    std::unordered_set<std::string> muted_users;
    std::unordered_set<std::string> muted_keywords;
    std::chrono::system_clock::time_point last_updated;
    
    // Engagement statistics
    double avg_session_length_minutes = 0.0;
    double daily_engagement_score = 0.0;
    int32_t posts_per_day = 0;
    int32_t interactions_per_day = 0;
};

// Timeline generation configuration
struct TimelineConfig {
    ::sonet::timeline::TimelineAlgorithm algorithm = ::sonet::timeline::TIMELINE_ALGORITHM_HYBRID;
    int32_t max_items = 50;
    int32_t max_age_hours = 24;
    double min_score_threshold = 0.1;
    
    // Algorithm weights
    double recency_weight = 0.3;
    double engagement_weight = 0.25;
    double author_affinity_weight = 0.2;
    double content_quality_weight = 0.15;
    double diversity_weight = 0.1;
    
    // Content mix ratios
    double following_content_ratio = 0.7;
    double recommended_content_ratio = 0.2;
    double trending_content_ratio = 0.1;
};

// Content ranking engine interface
class RankingEngine {
public:
    virtual ~RankingEngine() = default;
    
    // Score a single note for a user
    virtual double ScoreNote(
        const ::sonet::note::Note& note,
        const std::string& user_id,
        const UserEngagementProfile& profile,
        const TimelineConfig& config
    ) = 0;
    
    // Batch score multiple notes
    virtual std::vector<RankedTimelineItem> ScoreNotes(
        const std::vector<::sonet::note::Note>& notes,
        const std::string& user_id,
        const UserEngagementProfile& profile,
        const TimelineConfig& config
    ) = 0;
    
    // Update ML models with user feedback
    virtual void UpdateWithFeedback(
        const std::string& user_id,
        const std::string& note_id,
        const std::string& action,  // "like", "share", "skip", "hide"
        double engagement_time_seconds
    ) = 0;
};

// Content filtering for privacy, safety, and preferences
class ContentFilter {
public:
    virtual ~ContentFilter() = default;
    
    // Check if note should be shown to user
    virtual bool ShouldShowNote(
        const ::sonet::note::Note& note,
        const std::string& user_id,
        const UserEngagementProfile& profile
    ) = 0;
    
    // Filter out inappropriate content
    virtual std::vector<::sonet::note::Note> FilterNotes(
        const std::vector<::sonet::note::Note>& notes,
        const std::string& user_id,
        const UserEngagementProfile& profile
    ) = 0;
};

// Timeline caching layer
class TimelineCache {
public:
    virtual ~TimelineCache() = default;
    
    // Cache operations
    virtual bool GetTimeline(const std::string& user_id, std::vector<RankedTimelineItem>& items) = 0;
    virtual void SetTimeline(const std::string& user_id, const std::vector<RankedTimelineItem>& items) = 0;
    virtual void InvalidateTimeline(const std::string& user_id) = 0;
    virtual void InvalidateAuthorTimelines(const std::string& author_id) = 0;
    
    // User profile cache
    virtual bool GetUserProfile(const std::string& user_id, UserEngagementProfile& profile) = 0;
    virtual void SetUserProfile(const std::string& user_id, const UserEngagementProfile& profile) = 0;
    
    // Timeline metadata
    virtual void SetLastRead(const std::string& user_id, std::chrono::system_clock::time_point timestamp) = 0;
    virtual std::chrono::system_clock::time_point GetLastRead(const std::string& user_id) = 0;
};

// Real-time timeline update notifications
class RealtimeNotifier {
public:
    virtual ~RealtimeNotifier() = default;
    
    // Subscribe user to real-time updates
    virtual void Subscribe(const std::string& user_id, grpc::ServerWriter<::sonet::timeline::TimelineUpdate>* writer) = 0;
    virtual void Unsubscribe(const std::string& user_id) = 0;
    
    // Notify subscribers of timeline updates
    virtual void NotifyNewItems(const std::string& user_id, const std::vector<RankedTimelineItem>& items) = 0;
    virtual void NotifyItemUpdate(const std::string& user_id, const std::string& note_id) = 0;
    virtual void NotifyItemDeleted(const std::string& user_id, const std::string& note_id) = 0;
};

// Content source adapters
class ContentSourceAdapter {
public:
    virtual ~ContentSourceAdapter() = default;
    virtual std::vector<::sonet::note::Note> GetContent(
        const std::string& user_id,
        const TimelineConfig& config,
        std::chrono::system_clock::time_point since,
        int32_t limit
    ) = 0;
};

// Main Timeline Service Implementation
class TimelineServiceImpl final : public ::sonet::timeline::TimelineService::Service {
public:
    TimelineServiceImpl(
        std::shared_ptr<TimelineCache> cache,
        std::shared_ptr<RankingEngine> ranking_engine,
        std::shared_ptr<ContentFilter> content_filter,
        std::shared_ptr<RealtimeNotifier> realtime_notifier,
        std::unordered_map<::sonet::timeline::ContentSource, std::shared_ptr<ContentSourceAdapter>> content_sources
    );
    
    // gRPC service methods
    grpc::Status GetTimeline(
        grpc::ServerContext* context,
        const ::sonet::timeline::GetTimelineRequest* request,
        ::sonet::timeline::GetTimelineResponse* response
    ) override;
    
    grpc::Status GetUserTimeline(
        grpc::ServerContext* context,
        const ::sonet::timeline::GetUserTimelineRequest* request,
        ::sonet::timeline::GetUserTimelineResponse* response
    ) override;
    
    grpc::Status RefreshTimeline(
        grpc::ServerContext* context,
        const ::sonet::timeline::RefreshTimelineRequest* request,
        ::sonet::timeline::RefreshTimelineResponse* response
    ) override;
    
    grpc::Status MarkTimelineRead(
        grpc::ServerContext* context,
        const ::sonet::timeline::MarkTimelineReadRequest* request,
        ::sonet::timeline::MarkTimelineReadResponse* response
    ) override;
    
    grpc::Status UpdateTimelinePreferences(
        grpc::ServerContext* context,
        const ::sonet::timeline::UpdateTimelinePreferencesRequest* request,
        ::sonet::timeline::UpdateTimelinePreferencesResponse* response
    ) override;
    
    grpc::Status GetTimelinePreferences(
        grpc::ServerContext* context,
        const ::sonet::timeline::GetTimelinePreferencesRequest* request,
        ::sonet::timeline::GetTimelinePreferencesResponse* response
    ) override;
    
    grpc::Status SubscribeTimelineUpdates(
        grpc::ServerContext* context,
        const ::sonet::timeline::SubscribeTimelineUpdatesRequest* request,
        grpc::ServerWriter<::sonet::timeline::TimelineUpdate>* writer
    ) override;
    
    grpc::Status HealthCheck(
        grpc::ServerContext* context,
        const ::sonet::timeline::HealthCheckRequest* request,
        ::sonet::timeline::HealthCheckResponse* response
    ) override;
    
    // Public methods for external services
    void OnNewNote(const ::sonet::note::Note& note);
    void OnNoteDeleted(const std::string& note_id, const std::string& author_id);
    void OnNoteUpdated(const ::sonet::note::Note& note);
    void OnFollowEvent(const std::string& follower_id, const std::string& following_id, bool is_follow);

private:
    // Core timeline generation
    std::vector<RankedTimelineItem> GenerateTimeline(
        const std::string& user_id,
        const TimelineConfig& config,
        std::chrono::system_clock::time_point since,
        int32_t limit
    );
    
    // Content source integration
    std::vector<::sonet::note::Note> FetchFollowingContent(
        const std::string& user_id,
        std::chrono::system_clock::time_point since,
        int32_t limit
    );
    
    std::vector<::sonet::note::Note> FetchRecommendedContent(
        const std::string& user_id,
        const UserEngagementProfile& profile,
        int32_t limit
    );
    
    std::vector<::sonet::note::Note> FetchTrendingContent(
        const std::string& user_id,
        int32_t limit
    );
    
    // User profile management
    UserEngagementProfile GetOrCreateUserProfile(const std::string& user_id);
    void UpdateUserEngagement(
        const std::string& user_id,
        const std::string& action,
        const std::string& target_id = ""
    );
    
    // Helper methods
    TimelineConfig GetUserTimelineConfig(const std::string& user_id);
    ::sonet::timeline::TimelineMetadata BuildTimelineMetadata(
        const std::vector<RankedTimelineItem>& items,
        const std::string& user_id,
        const TimelineConfig& config
    );
    
    std::string GetMetadataValue(grpc::ServerContext* context, const std::string& key);
    bool IsAuthorized(grpc::ServerContext* context, const std::string& user_id);
    
    // Components
    std::shared_ptr<TimelineCache> cache_;
    std::shared_ptr<RankingEngine> ranking_engine_;
    std::shared_ptr<ContentFilter> content_filter_;
    std::shared_ptr<RealtimeNotifier> realtime_notifier_;
    std::unordered_map<::sonet::timeline::ContentSource, std::shared_ptr<ContentSourceAdapter>> content_sources_;
    
    // Configuration
    TimelineConfig default_config_;
    
    // Metrics and monitoring
    std::unordered_map<std::string, std::atomic<uint64_t>> metrics_;
    mutable std::mutex metrics_mutex_;
    
    // Thread safety
    mutable std::shared_mutex service_mutex_;
};

// Factory functions for creating implementations
std::unique_ptr<RankingEngine> CreateMLRankingEngine(const std::string& model_path = "");
std::unique_ptr<ContentFilter> CreateAdvancedContentFilter();
std::unique_ptr<TimelineCache> CreateRedisTimelineCache(const std::string& redis_url);
std::unique_ptr<RealtimeNotifier> CreateWebSocketNotifier();

// Content source adapters
std::unique_ptr<ContentSourceAdapter> CreateFollowingContentAdapter(
    std::shared_ptr<::sonet::note::NoteService::Stub> note_service,
    std::shared_ptr<::sonet::follow::FollowService::Stub> follow_service
);

std::unique_ptr<ContentSourceAdapter> CreateTrendingContentAdapter(
    std::shared_ptr<::sonet::note::NoteService::Stub> note_service
);

std::unique_ptr<ContentSourceAdapter> CreateRecommendedContentAdapter(
    std::shared_ptr<::sonet::note::NoteService::Stub> note_service,
    const std::string& recommendation_model_path = ""
);

} // namespace sonet::timeline
