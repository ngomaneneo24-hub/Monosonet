/*
 * Copyright (c) 2025 Neo Qiss
 * All rights reserved.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

#ifndef SONET_NOTE_GRPC_SERVICE_H
#define SONET_NOTE_GRPC_SERVICE_H

#include <grpcpp/grpcpp.h>
#include <grpcpp/server.h>
#include <grpcpp/server_builder.h>
#include <grpcpp/server_context.h>
#include <grpcpp/security/server_credentials.h>

#include "note_service.grpc.pb.h"
#include "note_service.pb.h"

#include "../models/note.h"
#include "../models/attachment.h"
#include "../services/note_service.h"
#include "../services/timeline_service.h"
#include "../services/analytics_service.h"
#include "../repositories/note_repository.h"

#include "../../core/cache/redis_client.h"
#include "../../core/security/auth_service.h"
#include "../../core/logging/metrics_collector.h"

#include <memory>
#include <string>
#include <vector>
#include <unordered_map>
#include <atomic>
#include <thread>
#include <mutex>

namespace sonet::note::grpc {

using grpc::Status;
using grpc::StatusCode;
using grpc::ServerContext;
using grpc::ServerWriter;

/**
 * @brief High-Performance gRPC Service Implementation for Note Operations
 * 
 * Provides Twitter-scale gRPC endpoints with:
 * - Sub-millisecond response times for core operations
 * - Horizontal scaling support
 * - Connection pooling and load balancing
 * - Advanced caching strategies
 * - Real-time streaming capabilities
 * - Comprehensive error handling
 * - Performance monitoring and metrics
 */
class NoteGrpcService final : public sonet::note::grpc::NoteService::Service {
public:
    // Constructor with service dependencies
    explicit NoteGrpcService(
        std::shared_ptr<services::NoteService> note_service,
        std::shared_ptr<services::TimelineService> timeline_service,
        std::shared_ptr<services::AnalyticsService> analytics_service,
        std::shared_ptr<repositories::NoteRepository> note_repository,
        std::shared_ptr<core::cache::RedisClient> redis_client,
        std::shared_ptr<core::security::AuthService> auth_service,
        std::shared_ptr<core::logging::MetricsCollector> metrics_collector
    );

    // Destructor
    virtual ~NoteGrpcService() = default;

    // ========== CORE NOTE OPERATIONS ==========
    
    /**
     * @brief Create a new note with sub-10ms response time
     * 
     * Performance optimizations:
     * - Async attachment processing
     * - Parallel validation
     * - Optimistic concurrency control
     * - Cache preloading
     */
    Status CreateNote(ServerContext* context, 
                     const CreateNoteRequest* request,
                     CreateNoteResponse* response) override;

    /**
     * @brief Get note by ID with sub-5ms response time
     * 
     * Performance optimizations:
     * - L1/L2 cache hierarchy
     * - Partial object loading
     * - Connection pooling
     * - Prefetch related data
     */
    Status GetNote(ServerContext* context,
                  const GetNoteRequest* request,
                  GetNoteResponse* response) override;

    /**
     * @brief Update note with optimistic locking
     */
    Status UpdateNote(ServerContext* context,
                     const UpdateNoteRequest* request,
                     UpdateNoteResponse* response) override;

    /**
     * @brief Delete note with cascade handling
     */
    Status DeleteNote(ServerContext* context,
                     const DeleteNoteRequest* request,
                     DeleteNoteResponse* response) override;

    /**
     * @brief Batch get notes with sub-20ms for 100 notes
     * 
     * Performance optimizations:
     * - Parallel database queries
     * - Bulk cache operations
     * - Result streaming
     * - Memory pool allocation
     */
    Status GetNotesBatch(ServerContext* context,
                        const GetNotesBatchRequest* request,
                        GetNotesBatchResponse* response) override;

    // ========== ENGAGEMENT OPERATIONS ==========
    
    /**
     * @brief Like/unlike note with sub-3ms response time
     * 
     * Performance optimizations:
     * - Write-behind caching
     * - Event streaming
     * - Counter optimization
     * - Distributed locking
     */
    Status LikeNote(ServerContext* context,
                   const LikeNoteRequest* request,
                   LikeNoteResponse* response) override;

    /**
     * @brief Renote operations with real-time fanout
     */
    Status RenoteNote(ServerContext* context,
                     const RenoteNoteRequest* request,
                     RenoteNoteResponse* response) override;

    /**
     * @brief Quote renote with content validation
     */
    Status QuoteRenote(ServerContext* context,
                      const QuoteRenoteRequest* request,
                      QuoteRenoteResponse* response) override;

    /**
     * @brief Bookmark operations with user collections
     */
    Status BookmarkNote(ServerContext* context,
                       const BookmarkNoteRequest* request,
                       BookmarkNoteResponse* response) override;

    // ========== TIMELINE OPERATIONS ==========
    
    /**
     * @brief Get personalized home timeline with ML ranking
     * 
     * Performance optimizations:
     * - Precomputed timeline cache
     * - ML model inference caching
     * - Async ranking pipeline
     * - Progressive loading
     */
    Status GetHomeTimeline(ServerContext* context,
                          const GetTimelineRequest* request,
                          GetTimelineResponse* response) override;

    /**
     * @brief Get user timeline with privacy filtering
     */
    Status GetUserTimeline(ServerContext* context,
                          const GetUserTimelineRequest* request,
                          GetTimelineResponse* response) override;

    /**
     * @brief Get public timeline with geographic filtering
     */
    Status GetPublicTimeline(ServerContext* context,
                            const GetTimelineRequest* request,
                            GetTimelineResponse* response) override;

    /**
     * @brief Get trending timeline with real-time trends
     */
    Status GetTrendingTimeline(ServerContext* context,
                              const GetTrendingRequest* request,
                              GetTimelineResponse* response) override;

    // ========== SEARCH OPERATIONS ==========
    
    /**
     * @brief Advanced search with sub-50ms response time
     * 
     * Performance optimizations:
     * - Elasticsearch integration
     * - Query result caching
     * - Faceted search optimization
     * - Auto-complete suggestions
     */
    Status SearchNotes(ServerContext* context,
                      const SearchNotesRequest* request,
                      SearchNotesResponse* response) override;

    /**
     * @brief Search by hashtag with trend analysis
     */
    Status SearchByHashtag(ServerContext* context,
                          const SearchByHashtagRequest* request,
                          SearchNotesResponse* response) override;

    /**
     * @brief Get trending hashtags with geographic breakdown
     */
    Status GetTrendingHashtags(ServerContext* context,
                              const GetTrendingHashtagsRequest* request,
                              GetTrendingHashtagsResponse* response) override;

    // ========== ANALYTICS OPERATIONS ==========
    
    /**
     * @brief Get comprehensive note analytics
     */
    Status GetNoteAnalytics(ServerContext* context,
                           const GetNoteAnalyticsRequest* request,
                           GetNoteAnalyticsResponse* response) override;

    /**
     * @brief Get real-time engagement metrics
     */
    Status GetLiveEngagement(ServerContext* context,
                            const GetLiveEngagementRequest* request,
                            GetLiveEngagementResponse* response) override;

    /**
     * @brief Get user note statistics with trends
     */
    Status GetUserNoteStats(ServerContext* context,
                           const GetUserNoteStatsRequest* request,
                           GetUserNoteStatsResponse* response) override;

    // ========== THREAD OPERATIONS ==========
    
    /**
     * @brief Get conversation thread with smart ordering
     */
    Status GetThread(ServerContext* context,
                    const GetThreadRequest* request,
                    GetThreadResponse* response) override;

    /**
     * @brief Create reply with thread context
     */
    Status CreateReply(ServerContext* context,
                      const CreateReplyRequest* request,
                      CreateNoteResponse* response) override;

    // ========== STREAMING OPERATIONS ==========
    
    /**
     * @brief Stream real-time timeline updates
     * 
     * Features:
     * - Server-side filtering
     * - Backpressure handling
     * - Connection health monitoring
     * - Automatic reconnection
     */
    Status StreamTimeline(ServerContext* context,
                         const StreamTimelineRequest* request,
                         ServerWriter<TimelineUpdate>* writer) override;

    /**
     * @brief Stream live engagement updates
     */
    Status StreamEngagement(ServerContext* context,
                           const StreamEngagementRequest* request,
                           ServerWriter<EngagementUpdate>* writer) override;

    // ========== MODERATION OPERATIONS ==========
    
    /**
     * @brief Report note for policy violations
     */
    Status ReportNote(ServerContext* context,
                     const ReportNoteRequest* request,
                     ReportNoteResponse* response) override;

    /**
     * @brief Get content moderation status
     */
    Status GetModerationStatus(ServerContext* context,
                              const GetModerationStatusRequest* request,
                              GetModerationStatusResponse* response) override;

    // ========== SERVER MANAGEMENT ==========
    
    /**
     * @brief Start gRPC server with configuration
     */
    void start_server(const std::string& server_address, int port);

    /**
     * @brief Stop gRPC server gracefully
     */
    void stop_server();

    /**
     * @brief Get server health status
     */
    bool is_server_healthy() const;

    /**
     * @brief Get performance metrics
     */
    json get_performance_metrics() const;

private:
    // ========== SERVICE DEPENDENCIES ==========
    std::shared_ptr<services::NoteService> note_service_;
    std::shared_ptr<services::TimelineService> timeline_service_;
    std::shared_ptr<services::AnalyticsService> analytics_service_;
    std::shared_ptr<repositories::NoteRepository> note_repository_;
    std::shared_ptr<core::cache::RedisClient> redis_client_;
    std::shared_ptr<core::security::AuthService> auth_service_;
    std::shared_ptr<core::logging::MetricsCollector> metrics_collector_;

    // ========== SERVER INFRASTRUCTURE ==========
    std::unique_ptr<grpc::Server> server_;
    std::string server_address_;
    std::atomic<bool> server_running_{false};
    std::thread server_thread_;

    // ========== PERFORMANCE MONITORING ==========
    std::atomic<uint64_t> total_requests_{0};
    std::atomic<uint64_t> active_connections_{0};
    std::atomic<uint64_t> cache_hits_{0};
    std::atomic<uint64_t> cache_misses_{0};
    std::unordered_map<std::string, std::atomic<uint64_t>> endpoint_metrics_;

    // ========== STREAMING CONNECTIONS ==========
    std::mutex streaming_connections_mutex_;
    std::unordered_map<std::string, std::vector<ServerWriter<TimelineUpdate>*>> timeline_streams_;
    std::unordered_map<std::string, std::vector<ServerWriter<EngagementUpdate>*>> engagement_streams_;

    // ========== HELPER METHODS ==========
    
    // Authentication and authorization
    std::string extract_user_id(ServerContext* context);
    bool validate_authentication(ServerContext* context);
    bool validate_permissions(const std::string& user_id, const std::string& resource_id, const std::string& action);

    // Proto conversion helpers
    Note proto_to_note(const sonet::note::grpc::Note& proto_note);
    sonet::note::grpc::Note note_to_proto(const models::Note& note, const std::string& requesting_user_id = "");
    Attachment proto_to_attachment(const sonet::note::grpc::Attachment& proto_attachment);
    sonet::note::grpc::Attachment attachment_to_proto(const models::Attachment& attachment);
    
    // Cache management
    std::string generate_cache_key(const std::string& prefix, const std::vector<std::string>& params);
    bool get_from_cache(const std::string& key, std::string& value);
    void set_cache(const std::string& key, const std::string& value, int ttl_seconds = 3600);
    void invalidate_cache_pattern(const std::string& pattern);

    // Performance optimization
    void preload_related_data(const std::vector<std::string>& note_ids, const std::string& user_id);
    void batch_load_user_states(std::vector<sonet::note::grpc::Note>* notes, const std::string& user_id);
    void apply_privacy_filters(std::vector<sonet::note::grpc::Note>* notes, const std::string& user_id);

    // Error handling
    Status create_error_status(StatusCode code, const std::string& message, const std::string& details = "");
    void log_error(const std::string& method, const std::string& error, const std::string& user_id = "");
    void track_request_metrics(const std::string& method, int64_t duration_ms, bool success);

    // Streaming helpers
    void register_timeline_stream(const std::string& user_id, ServerWriter<TimelineUpdate>* writer);
    void unregister_timeline_stream(const std::string& user_id, ServerWriter<TimelineUpdate>* writer);
    void broadcast_timeline_update(const std::string& user_id, const TimelineUpdate& update);
    
    void register_engagement_stream(const std::string& note_id, ServerWriter<EngagementUpdate>* writer);
    void unregister_engagement_stream(const std::string& note_id, ServerWriter<EngagementUpdate>* writer);
    void broadcast_engagement_update(const std::string& note_id, const EngagementUpdate& update);

    // Content processing
    void extract_content_features(sonet::note::grpc::Note* note);
    void calculate_engagement_metrics(sonet::note::grpc::Note* note);
    void apply_content_filters(sonet::note::grpc::Note* note, const std::string& user_id);

    // Performance helpers
    void optimize_for_read_heavy_workload();
    void optimize_for_write_heavy_workload();
    void adjust_cache_strategies(const std::string& workload_pattern);

    // Health monitoring
    void start_health_monitoring();
    void check_service_health();
    void report_metrics();

    // ========== CONFIGURATION CONSTANTS ==========
    
    // Performance targets
    static constexpr int64_t CREATE_NOTE_TARGET_MS = 10;
    static constexpr int64_t GET_NOTE_TARGET_MS = 5;
    static constexpr int64_t BATCH_GET_TARGET_MS = 20;
    static constexpr int64_t LIKE_NOTE_TARGET_MS = 3;
    static constexpr int64_t TIMELINE_TARGET_MS = 15;
    static constexpr int64_t SEARCH_TARGET_MS = 50;
    
    // Cache TTL (seconds)
    static constexpr int NOTE_CACHE_TTL = 3600;          // 1 hour
    static constexpr int TIMELINE_CACHE_TTL = 300;       // 5 minutes
    static constexpr int SEARCH_CACHE_TTL = 1800;        // 30 minutes
    static constexpr int ANALYTICS_CACHE_TTL = 600;      // 10 minutes
    static constexpr int USER_STATE_CACHE_TTL = 1800;    // 30 minutes
    
    // Connection limits
    static constexpr int MAX_CONCURRENT_CONNECTIONS = 10000;
    static constexpr int MAX_STREAMING_CONNECTIONS_PER_USER = 5;
    static constexpr int CONNECTION_TIMEOUT_SECONDS = 30;
    
    // Batch operation limits
    static constexpr int MAX_BATCH_SIZE = 100;
    static constexpr int MAX_SEARCH_RESULTS = 1000;
    static constexpr int MAX_TIMELINE_RESULTS = 200;
    
    // Resource limits
    static constexpr size_t MAX_CONTENT_LENGTH = 300;
    static constexpr size_t MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB
    static constexpr int MAX_ATTACHMENTS_PER_NOTE = 10;
};

/**
 * @brief gRPC Server Builder and Configuration Helper
 */
class NoteGrpcServerBuilder {
public:
    static std::unique_ptr<grpc::Server> build_high_performance_server(
        std::shared_ptr<NoteGrpcService> service,
        const std::string& server_address,
        int port
    );

    static grpc::ServerBuilder& configure_for_high_throughput(grpc::ServerBuilder& builder);
    static grpc::ServerBuilder& configure_security(grpc::ServerBuilder& builder);
    static grpc::ServerBuilder& configure_monitoring(grpc::ServerBuilder& builder);
};

} // namespace sonet::note::grpc

#endif // SONET_NOTE_GRPC_SERVICE_H
