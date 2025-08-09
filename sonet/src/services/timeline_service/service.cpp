//
// Copyright (c) 2025 Neo Qiss
// All rights reserved.
//
// This software is proprietary and confidential.
// Unauthorized copying, distribution, or use is strictly prohibited.
//

#include "service.h"
#include <algorithm>
#include <cmath>
#include <random>
#include <sstream>
#include <thread>
#include <iostream>

namespace sonet::timeline {

namespace {
    // Helper to convert system_clock::time_point to protobuf timestamp
    ::sonet::common::Timestamp ToProtoTimestamp(std::chrono::system_clock::time_point tp) {
        ::sonet::common::Timestamp result;
        auto duration = tp.time_since_epoch();
        auto seconds = std::chrono::duration_cast<std::chrono::seconds>(duration);
        auto nanos = std::chrono::duration_cast<std::chrono::nanoseconds>(duration - seconds);
        
        result.set_seconds(seconds.count());
        result.set_nanos(static_cast<int32_t>(nanos.count()));
        return result;
    }

    // Helper to convert protobuf timestamp to system_clock::time_point
    std::chrono::system_clock::time_point FromProtoTimestamp(const ::sonet::common::Timestamp& ts) {
        auto duration = std::chrono::seconds(ts.seconds()) + std::chrono::nanoseconds(ts.nanos());
        return std::chrono::system_clock::time_point(duration);
    }

    // Calculate time decay factor for recency scoring
    double CalculateTimeDecay(std::chrono::system_clock::time_point created_at, double half_life_hours = 6.0) {
        auto now = std::chrono::system_clock::now();
        auto age = std::chrono::duration_cast<std::chrono::hours>(now - created_at);
        double age_hours = static_cast<double>(age.count());
        return std::exp(-age_hours * std::log(2.0) / half_life_hours);
    }

    // Generate unique ID for timeline items
    std::string GenerateItemId() {
        static std::random_device rd;
        static std::mt19937_64 gen(rd());
        std::uniform_int_distribution<uint64_t> dis;
        std::ostringstream oss;
        oss << std::hex << dis(gen);
        return oss.str();
    }
}

// ============= TIMELINE SERVICE IMPLEMENTATION =============

TimelineServiceImpl::TimelineServiceImpl(
    std::shared_ptr<TimelineCache> cache,
    std::shared_ptr<RankingEngine> ranking_engine,
    std::shared_ptr<ContentFilter> content_filter,
    std::shared_ptr<RealtimeNotifier> realtime_notifier,
    std::unordered_map<::sonet::timeline::ContentSource, std::shared_ptr<ContentSourceAdapter>> content_sources
) : cache_(std::move(cache)),
    ranking_engine_(std::move(ranking_engine)),
    content_filter_(std::move(content_filter)),
    realtime_notifier_(std::move(realtime_notifier)),
    content_sources_(std::move(content_sources)) {
    
    // Initialize default configuration
    default_config_.algorithm = ::sonet::timeline::TIMELINE_ALGORITHM_HYBRID;
    default_config_.max_items = 50;
    default_config_.max_age_hours = 24;
    default_config_.min_score_threshold = 0.1;
    
    // Algorithm weights
    default_config_.recency_weight = 0.3;
    default_config_.engagement_weight = 0.25;
    default_config_.author_affinity_weight = 0.2;
    default_config_.content_quality_weight = 0.15;
    default_config_.diversity_weight = 0.1;
    
    // Content mix
    default_config_.following_content_ratio = 0.7;
    default_config_.recommended_content_ratio = 0.2;
    default_config_.trending_content_ratio = 0.1;
    
    std::cout << "Timeline service initialized with " << content_sources_.size() << " content sources" << std::endl;
}

grpc::Status TimelineServiceImpl::GetTimeline(
    grpc::ServerContext* context,
    const ::sonet::timeline::GetTimelineRequest* request,
    ::sonet::timeline::GetTimelineResponse* response
) {
    try {
        if (!IsAuthorized(context, request->user_id())) {
            return grpc::Status(grpc::StatusCode::PERMISSION_DENIED, "Unauthorized access");
        }

        std::cout << "Generating timeline for user: " << request->user_id() << std::endl;

        // Get user configuration
        TimelineConfig config = GetUserTimelineConfig(request->user_id());
        if (request->algorithm() != ::sonet::timeline::TIMELINE_ALGORITHM_UNKNOWN) {
            config.algorithm = request->algorithm();
        }

        // Try cache first
        std::vector<RankedTimelineItem> timeline_items;
        bool cache_hit = cache_->GetTimeline(request->user_id(), timeline_items);

        if (!cache_hit || timeline_items.empty()) {
            std::cout << "Cache miss - generating new timeline" << std::endl;
            
            // Generate timeline
            auto since = std::chrono::system_clock::now() - std::chrono::hours(config.max_age_hours);
            timeline_items = GenerateTimeline(request->user_id(), config, since, config.max_items);
            
            // Cache the result
            cache_->SetTimeline(request->user_id(), timeline_items);
        } else {
            std::cout << "Cache hit - using cached timeline with " << timeline_items.size() << " items" << std::endl;
        }

        // Apply pagination
        int32_t offset = request->pagination().offset();
        int32_t limit = request->pagination().limit() > 0 ? request->pagination().limit() : 20;
        
        auto start_it = timeline_items.begin() + std::min(offset, static_cast<int32_t>(timeline_items.size()));
        auto end_it = start_it + std::min(limit, static_cast<int32_t>(timeline_items.end() - start_it));
        
        // Build response
        for (auto it = start_it; it != end_it; ++it) {
            auto* item = response->add_items();
            *item->mutable_note() = it->note;
            item->set_source(it->source);
            item->set_final_score(it->final_score);
            *item->mutable_injected_at() = ToProtoTimestamp(it->injected_at);
            item->set_injection_reason(it->injection_reason);
            
            if (request->include_ranking_signals()) {
                *item->mutable_ranking_signals() = it->signals;
            }
        }

        // Set metadata
        auto* metadata = response->mutable_metadata();
        *metadata = BuildTimelineMetadata(timeline_items, request->user_id(), config);

        // Set pagination info
        auto* page_info = response->mutable_pagination();
        page_info->set_offset(offset);
        page_info->set_limit(limit);
        page_info->set_total_count(static_cast<int32_t>(timeline_items.size()));
        page_info->set_has_next(offset + limit < static_cast<int32_t>(timeline_items.size()));

        response->set_success(true);
        
        // Update metrics
        {
            std::lock_guard<std::mutex> lock(metrics_mutex_);
            metrics_["timeline_requests"]++;
            if (cache_hit) metrics_["cache_hits"]++;
            else metrics_["cache_misses"]++;
        }

        std::cout << "Timeline generated successfully: " << (end_it - start_it) << " items returned" << std::endl;
        return grpc::Status::OK;

    } catch (const std::exception& e) {
        std::cerr << "Error generating timeline: " << e.what() << std::endl;
        response->set_success(false);
        response->set_error_message(e.what());
        return grpc::Status(grpc::StatusCode::INTERNAL, e.what());
    }
}

grpc::Status TimelineServiceImpl::RefreshTimeline(
    grpc::ServerContext* context,
    const ::sonet::timeline::RefreshTimelineRequest* request,
    ::sonet::timeline::RefreshTimelineResponse* response
) {
    try {
        if (!IsAuthorized(context, request->user_id())) {
            return grpc::Status(grpc::StatusCode::PERMISSION_DENIED, "Unauthorized access");
        }

        std::cout << "Refreshing timeline for user: " << request->user_id() << std::endl;

        // Invalidate cache to force regeneration
        cache_->InvalidateTimeline(request->user_id());

        // Get fresh content since specified time
        auto since = FromProtoTimestamp(request->since());
        auto config = GetUserTimelineConfig(request->user_id());
        int32_t max_items = request->max_items() > 0 ? request->max_items() : 20;

        auto new_items = GenerateTimeline(request->user_id(), config, since, max_items);

        // Build response
        for (const auto& item : new_items) {
            auto* timeline_item = response->add_new_items();
            *timeline_item->mutable_note() = item.note;
            timeline_item->set_source(item.source);
            timeline_item->set_final_score(item.final_score);
            *timeline_item->mutable_injected_at() = ToProtoTimestamp(item.injected_at);
            timeline_item->set_injection_reason(item.injection_reason);
        }

        response->set_total_new_items(static_cast<int32_t>(new_items.size()));
        response->set_has_more(new_items.size() >= max_items);
        response->set_success(true);

        // Notify real-time subscribers
        if (!new_items.empty()) {
            realtime_notifier_->NotifyNewItems(request->user_id(), new_items);
        }

        std::cout << "Timeline refreshed: " << new_items.size() << " new items" << std::endl;
        return grpc::Status::OK;

    } catch (const std::exception& e) {
        std::cerr << "Error refreshing timeline: " << e.what() << std::endl;
        response->set_success(false);
        response->set_error_message(e.what());
        return grpc::Status(grpc::StatusCode::INTERNAL, e.what());
    }
}

grpc::Status TimelineServiceImpl::MarkTimelineRead(
    grpc::ServerContext* context,
    const ::sonet::timeline::MarkTimelineReadRequest* request,
    ::sonet::timeline::MarkTimelineReadResponse* response
) {
    try {
        if (!IsAuthorized(context, request->user_id())) {
            return grpc::Status(grpc::StatusCode::PERMISSION_DENIED, "Unauthorized access");
        }

        auto read_until = FromProtoTimestamp(request->read_until());
        cache_->SetLastRead(request->user_id(), read_until);

        response->set_success(true);
        std::cout << "Timeline marked as read for user: " << request->user_id() << std::endl;
        return grpc::Status::OK;

    } catch (const std::exception& e) {
        response->set_success(false);
        response->set_error_message(e.what());
        return grpc::Status(grpc::StatusCode::INTERNAL, e.what());
    }
}

grpc::Status TimelineServiceImpl::HealthCheck(
    grpc::ServerContext* /*context*/,
    const ::sonet::timeline::HealthCheckRequest* /*request*/,
    ::sonet::timeline::HealthCheckResponse* response
) {
    response->set_status("healthy");
    
    // Add component health details
    auto& details = *response->mutable_details();
    details["cache"] = cache_ ? "healthy" : "unavailable";
    details["ranking_engine"] = ranking_engine_ ? "healthy" : "unavailable";
    details["content_filter"] = content_filter_ ? "healthy" : "unavailable";
    details["realtime_notifier"] = realtime_notifier_ ? "healthy" : "unavailable";
    details["content_sources"] = std::to_string(content_sources_.size());
    
    {
        std::lock_guard<std::mutex> lock(metrics_mutex_);
        details["total_requests"] = std::to_string(metrics_["timeline_requests"].load());
        details["cache_hit_ratio"] = metrics_["timeline_requests"] > 0 
            ? std::to_string(static_cast<double>(metrics_["cache_hits"]) / metrics_["timeline_requests"])
            : "0.0";
    }
    
    return grpc::Status::OK;
}

// ============= PRIVATE METHODS =============

std::vector<RankedTimelineItem> TimelineServiceImpl::GenerateTimeline(
    const std::string& user_id,
    const TimelineConfig& config,
    std::chrono::system_clock::time_point since,
    int32_t limit
) {
    std::cout << "Generating timeline with algorithm: " << static_cast<int>(config.algorithm) << std::endl;

    // Get user engagement profile
    auto profile = GetOrCreateUserProfile(user_id);
    
    // Collect content from various sources
    std::vector<::sonet::note::Note> all_notes;
    
    // Following content (70% of timeline)
    int32_t following_limit = static_cast<int32_t>(limit * config.following_content_ratio);
    if (following_limit > 0) {
        auto following_notes = FetchFollowingContent(user_id, since, following_limit);
        all_notes.insert(all_notes.end(), following_notes.begin(), following_notes.end());
        std::cout << "Fetched " << following_notes.size() << " notes from following" << std::endl;
    }
    
    // Recommended content (20% of timeline)
    int32_t recommended_limit = static_cast<int32_t>(limit * config.recommended_content_ratio);
    if (recommended_limit > 0) {
        auto recommended_notes = FetchRecommendedContent(user_id, profile, recommended_limit);
        all_notes.insert(all_notes.end(), recommended_notes.begin(), recommended_notes.end());
        std::cout << "Fetched " << recommended_notes.size() << " recommended notes" << std::endl;
    }
    
    // Trending content (10% of timeline)
    int32_t trending_limit = static_cast<int32_t>(limit * config.trending_content_ratio);
    if (trending_limit > 0) {
        auto trending_notes = FetchTrendingContent(user_id, trending_limit);
        all_notes.insert(all_notes.end(), trending_notes.begin(), trending_notes.end());
        std::cout << "Fetched " << trending_notes.size() << " trending notes" << std::endl;
    }

    // Filter content based on user preferences and safety
    if (content_filter_) {
        all_notes = content_filter_->FilterNotes(all_notes, user_id, profile);
        std::cout << "After filtering: " << all_notes.size() << " notes remain" << std::endl;
    }

    // Score and rank content
    std::vector<RankedTimelineItem> ranked_items;
    if (ranking_engine_) {
        ranked_items = ranking_engine_->ScoreNotes(all_notes, user_id, profile, config);
    } else {
        // Simple chronological fallback
        for (const auto& note : all_notes) {
            RankedTimelineItem item;
            item.note = note;
            item.source = ::sonet::timeline::CONTENT_SOURCE_FOLLOWING;
            item.final_score = static_cast<double>(FromProtoTimestamp(note.created_at()).time_since_epoch().count());
            item.injected_at = std::chrono::system_clock::now();
            item.injection_reason = "chronological";
            ranked_items.push_back(item);
        }
    }

    // Sort by score (descending)
    std::sort(ranked_items.begin(), ranked_items.end(), 
        [](const RankedTimelineItem& a, const RankedTimelineItem& b) {
            return a.final_score > b.final_score;
        });

    // Apply score threshold and limit
    std::vector<RankedTimelineItem> final_items;
    for (const auto& item : ranked_items) {
        if (item.final_score >= config.min_score_threshold && 
            static_cast<int32_t>(final_items.size()) < limit) {
            final_items.push_back(item);
        }
    }

    std::cout << "Timeline generation complete: " << final_items.size() << " items ranked and filtered" << std::endl;
    return final_items;
}

std::vector<::sonet::note::Note> TimelineServiceImpl::FetchFollowingContent(
    const std::string& user_id,
    std::chrono::system_clock::time_point since,
    int32_t limit
) {
    auto it = content_sources_.find(::sonet::timeline::CONTENT_SOURCE_FOLLOWING);
    if (it != content_sources_.end()) {
        return it->second->GetContent(user_id, default_config_, since, limit);
    }
    return {};
}

std::vector<::sonet::note::Note> TimelineServiceImpl::FetchRecommendedContent(
    const std::string& user_id,
    const UserEngagementProfile& profile,
    int32_t limit
) {
    auto it = content_sources_.find(::sonet::timeline::CONTENT_SOURCE_RECOMMENDED);
    if (it != content_sources_.end()) {
        auto since = std::chrono::system_clock::now() - std::chrono::hours(24);
        return it->second->GetContent(user_id, default_config_, since, limit);
    }
    return {};
}

std::vector<::sonet::note::Note> TimelineServiceImpl::FetchTrendingContent(
    const std::string& user_id,
    int32_t limit
) {
    auto it = content_sources_.find(::sonet::timeline::CONTENT_SOURCE_TRENDING);
    if (it != content_sources_.end()) {
        auto since = std::chrono::system_clock::now() - std::chrono::hours(6);
        return it->second->GetContent(user_id, default_config_, since, limit);
    }
    return {};
}

UserEngagementProfile TimelineServiceImpl::GetOrCreateUserProfile(const std::string& user_id) {
    UserEngagementProfile profile;
    
    if (!cache_->GetUserProfile(user_id, profile)) {
        // Create new profile with defaults
        profile.user_id = user_id;
        profile.last_updated = std::chrono::system_clock::now();
        profile.avg_session_length_minutes = 15.0;  // Default 15 minutes
        profile.daily_engagement_score = 0.5;       // Neutral engagement
        
        cache_->SetUserProfile(user_id, profile);
        std::cout << "Created new user profile for: " << user_id << std::endl;
    }
    
    return profile;
}

TimelineConfig TimelineServiceImpl::GetUserTimelineConfig(const std::string& user_id) {
    // For now, return default config
    // In production, this would fetch user preferences from database
    return default_config_;
}

::sonet::timeline::TimelineMetadata TimelineServiceImpl::BuildTimelineMetadata(
    const std::vector<RankedTimelineItem>& items,
    const std::string& user_id,
    const TimelineConfig& config
) {
    ::sonet::timeline::TimelineMetadata metadata;
    
    metadata.set_total_items(static_cast<int32_t>(items.size()));
    metadata.set_algorithm_used(config.algorithm);
    metadata.set_timeline_version("v1.0");
    *metadata.mutable_last_updated() = ToProtoTimestamp(std::chrono::system_clock::now());
    
    auto last_read = cache_->GetLastRead(user_id);
    *metadata.mutable_last_user_read() = ToProtoTimestamp(last_read);
    
    // Count new items since last read
    int32_t new_items = 0;
    for (const auto& item : items) {
        if (item.injected_at > last_read) {
            new_items++;
        }
    }
    metadata.set_new_items_since_last_fetch(new_items);
    
    return metadata;
}

std::string TimelineServiceImpl::GetMetadataValue(grpc::ServerContext* context, const std::string& key) {
    auto& client_metadata = context->client_metadata();
    auto it = client_metadata.find(grpc::string_ref(key.c_str(), key.size()));
    if (it != client_metadata.end()) {
        return std::string(it->second.data(), it->second.length());
    }
    return {};
}

bool TimelineServiceImpl::IsAuthorized(grpc::ServerContext* context, const std::string& user_id) {
    // Check x-user-id metadata matches requested user
    std::string caller_id = GetMetadataValue(context, "x-user-id");
    if (!caller_id.empty() && caller_id != user_id) {
        // Check if admin
        std::string admin = GetMetadataValue(context, "x-admin");
        if (admin != "true" && admin != "1") {
            return false;
        }
    }
    
    // Check auth token if required
    const char* required_token = std::getenv("SONET_TIMELINE_TOKEN");
    if (required_token && std::strlen(required_token) > 0) {
        std::string provided_token = GetMetadataValue(context, "x-auth-token");
        if (provided_token != required_token) {
            return false;
        }
    }
    
    return true;
}

// ============= EVENT HANDLERS =============

void TimelineServiceImpl::OnNewNote(const ::sonet::note::Note& note) {
    std::cout << "Processing new note event: " << note.id() << " by " << note.author_id() << std::endl;
    
    // Invalidate author's followers' timelines
    cache_->InvalidateAuthorTimelines(note.author_id());
    
    // TODO: Trigger fanout process for this note
    // fanout_service_->InitiateFanout(note);
}

void TimelineServiceImpl::OnNoteDeleted(const std::string& note_id, const std::string& author_id) {
    std::cout << "Processing note deletion: " << note_id << std::endl;
    
    // Invalidate affected timelines
    cache_->InvalidateAuthorTimelines(author_id);
    
    // TODO: Notify real-time subscribers about deletion
    // realtime_notifier_->NotifyItemDeleted("*", note_id);
}

void TimelineServiceImpl::OnFollowEvent(const std::string& follower_id, const std::string& following_id, bool is_follow) {
    std::cout << "Processing follow event: " << follower_id << " -> " << following_id 
              << " (follow: " << is_follow << ")" << std::endl;
    
    // Invalidate follower's timeline since their following list changed
    cache_->InvalidateTimeline(follower_id);
    
    // Update user engagement profile to reflect new relationships
    // This would update affinity scores and interests
}

// ============= STUB IMPLEMENTATIONS FOR MISSING METHODS =============

grpc::Status TimelineServiceImpl::GetUserTimeline(
    grpc::ServerContext* context,
    const ::sonet::timeline::GetUserTimelineRequest* request,
    ::sonet::timeline::GetUserTimelineResponse* response
) {
    // TODO: Implement user profile timeline
    response->set_success(true);
    return grpc::Status::OK;
}

grpc::Status TimelineServiceImpl::UpdateTimelinePreferences(
    grpc::ServerContext* context,
    const ::sonet::timeline::UpdateTimelinePreferencesRequest* request,
    ::sonet::timeline::UpdateTimelinePreferencesResponse* response
) {
    // TODO: Implement preferences update
    response->set_success(true);
    return grpc::Status::OK;
}

grpc::Status TimelineServiceImpl::GetTimelinePreferences(
    grpc::ServerContext* context,
    const ::sonet::timeline::GetTimelinePreferencesRequest* request,
    ::sonet::timeline::GetTimelinePreferencesResponse* response
) {
    // TODO: Implement preferences retrieval
    response->set_success(true);
    return grpc::Status::OK;
}

grpc::Status TimelineServiceImpl::SubscribeTimelineUpdates(
    grpc::ServerContext* context,
    const ::sonet::timeline::SubscribeTimelineUpdatesRequest* request,
    grpc::ServerWriter<::sonet::timeline::TimelineUpdate>* writer
) {
    // TODO: Implement real-time streaming
    return grpc::Status::OK;
}

} // namespace sonet::timeline
