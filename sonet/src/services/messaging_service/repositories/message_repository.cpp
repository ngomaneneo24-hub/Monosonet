#include "message_repository.h"

namespace sonet::messaging_service::repositories {

void MessageRepository::save(const models::Message& /*message*/) {
    // skeleton
}

std::vector<models::Message> MessageRepository::getByConversation(const std::string& /*conversationId*/, int /*limit*/) {
    return {}; // skeleton
}

} // namespace sonet::messaging_service::repositories