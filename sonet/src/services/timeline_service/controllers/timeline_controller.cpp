#include "timeline_controller.h"

namespace sonet {
namespace timeline {
namespace controllers {

TimelineController::TimelineController(std::shared_ptr<sonet::timeline::TimelineServiceImpl> service)
    : service_(std::move(service)) {}

HomeTimelineResult TimelineController::get_home_timeline(
    const std::string& user_id,
    int32_t offset,
    int32_t limit,
    bool include_ranking_signals
) {
    HomeTimelineResult result;

    ::sonet::timeline::GetTimelineRequest req;
    req.user_id_ = user_id;
    req.algorithm_ = ::sonet::timeline::TIMELINE_ALGORITHM_HYBRID;
    req.pagination_.offset = offset;
    req.pagination_.limit = limit;
    req.include_ranking_signals_ = include_ranking_signals;

    ::sonet::timeline::GetTimelineResponse resp;
    grpc::ServerContext ctx;
    auto status = service_->GetTimeline(&ctx, &req, &resp);

    if (status.ok()) {
        result.items = std::move(resp.items_);
        result.metadata = resp.metadata_;
        result.pagination = resp.pagination_;
        result.success = true;
    } else {
        result.success = false;
        result.error_message = status.error_message();
    }

    return result;
}

UserTimelineResult TimelineController::get_user_timeline(
    const std::string& target_user_id,
    const std::string& requesting_user_id,
    int32_t offset,
    int32_t limit,
    bool include_replies,
    bool include_reposts
) {
    UserTimelineResult result;

    ::sonet::timeline::GetUserTimelineRequest req;
    req.target_user_id_ = target_user_id;
    req.requesting_user_id_ = requesting_user_id;
    req.pagination_.offset = offset;
    req.pagination_.limit = limit;
    req.include_replies_ = include_replies;
    req.include_reposts_ = include_reposts;

    ::sonet::timeline::GetUserTimelineResponse resp;
    grpc::ServerContext ctx;
    auto status = service_->GetUserTimeline(&ctx, &req, &resp);
    if (status.ok()) {
        result.items = std::move(resp.items_);
        result.pagination = resp.pagination_;
        result.success = true;
    } else {
        result.success = false;
        result.error_message = status.error_message();
    }

    return result;
}

bool TimelineController::refresh_timeline(const std::string& user_id, int32_t max_items) {
    ::sonet::timeline::RefreshTimelineRequest req;
    req.user_id_ = user_id;
    req.max_items_ = max_items;
    ::sonet::common::Timestamp ts; ts.set_seconds(0); ts.set_nanos(0);
    req.since_ = ts;

    ::sonet::timeline::RefreshTimelineResponse resp;
    grpc::ServerContext ctx;
    auto status = service_->RefreshTimeline(&ctx, &req, &resp);
    return status.ok();
}

bool TimelineController::update_preferences(const std::string& user_id, const ::sonet::timeline::TimelinePreferences& prefs) {
    ::sonet::timeline::UpdateTimelinePreferencesRequest req;
    req.user_id_ = user_id;
    req.preferences_ = prefs;

    ::sonet::timeline::UpdateTimelinePreferencesResponse resp;
    grpc::ServerContext ctx;
    auto status = service_->UpdateTimelinePreferences(&ctx, &req, &resp);
    return status.ok();
}

std::optional<::sonet::timeline::TimelinePreferences> TimelineController::get_preferences(const std::string& user_id) {
    ::sonet::timeline::GetTimelinePreferencesRequest req;
    req.user_id_ = user_id;

    ::sonet::timeline::GetTimelinePreferencesResponse resp;
    grpc::ServerContext ctx;
    auto status = service_->GetTimelinePreferences(&ctx, &req, &resp);
    if (!status.ok()) return std::nullopt;
    return resp.preferences_;
}

} // namespace controllers
} // namespace timeline
} // namespace sonet