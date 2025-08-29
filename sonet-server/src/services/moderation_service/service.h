#pragma once

#include <memory>
#include <string>
#include <vector>
#include <chrono>
#include <optional>
#include <grpcpp/grpcpp.h>
#include <grpcpp/server_context.h>
#include "moderation_service.grpc.pb.h"
#include "moderation_service.pb.h"
#include "models/moderation_models.h"
#include "repositories/moderation_repository.h"
#include "utils/audit_logger.h"
#include "utils/notification_service.h"

namespace sonet {
namespace moderation {

class ModerationService final : public ModerationService::Service {
public:
    explicit ModerationService(
        std::shared_ptr<ModerationRepository> repository,
        std::shared_ptr<AuditLogger> audit_logger,
        std::shared_ptr<NotificationService> notification_service
    );

    // Account moderation actions
    grpc::Status FlagAccount(
        grpc::ServerContext* context,
        const FlagAccountRequest* request,
        FlagAccountResponse* response
    ) override;

    grpc::Status RemoveFlag(
        grpc::ServerContext* context,
        const RemoveFlagRequest* request,
        RemoveFlagResponse* response
    ) override;

    grpc::Status ShadowbanAccount(
        grpc::ServerContext* context,
        const ShadowbanAccountRequest* request,
        ShadowbanAccountResponse* response
    ) override;

    grpc::Status SuspendAccount(
        grpc::ServerContext* context,
        const SuspendAccountRequest* request,
        SuspendAccountResponse* response
    ) override;

    grpc::Status BanAccount(
        grpc::ServerContext* context,
        const BanAccountRequest* request,
        BanAccountResponse* response
    ) override;

    // Note moderation actions
    grpc::Status DeleteNote(
        grpc::ServerContext* context,
        const DeleteNoteRequest* request,
        DeleteNoteResponse* response
    ) override;

    // Moderation queries
    grpc::Status GetFlaggedAccounts(
        grpc::ServerContext* context,
        const GetFlaggedAccountsRequest* request,
        GetFlaggedAccountsResponse* response
    ) override;

    grpc::Status GetModerationQueue(
        grpc::ServerContext* context,
        const GetModerationQueueRequest* request,
        GetModerationQueueResponse* response
    ) override;

    grpc::Status GetModerationStats(
        grpc::ServerContext* context,
        const GetModerationStatsRequest* request,
        GetModerationStatsResponse* response
    ) override;

    // Utility methods
    bool IsFounder(const std::string& user_id);
    bool CanPerformAction(const std::string& user_id, ModerationActionType action_type);
    std::string GeneratePublicMessage(const ModerationAction& action);
    void LogModerationAction(const ModerationAction& action);
    void NotifyUser(const std::string& user_id, const std::string& message);

private:
    std::shared_ptr<ModerationRepository> repository_;
    std::shared_ptr<AuditLogger> audit_logger_;
    std::shared_ptr<NotificationService> notification_service_;
    
    // Internal helper methods
    bool ValidateFounderRequest(const std::string& user_id);
    std::string SanitizeWarningMessage(const std::string& message);
    void ScheduleFlagExpiration(const std::string& user_id, const std::chrono::system_clock::time_point& expires_at);
    void ProcessAutoExpiredFlags();
    std::string GenerateAnonymousModeratorId();
};

} // namespace moderation
} // namespace sonet