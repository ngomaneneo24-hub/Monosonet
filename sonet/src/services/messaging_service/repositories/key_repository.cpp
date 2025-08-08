#include "key_repository.h"

namespace sonet::messaging_service::repositories {

models::EncryptionKey KeyRepository::getByConversation(const std::string& /*conversationId*/) {
    return {}; // skeleton
}

void KeyRepository::save(const models::EncryptionKey& /*key*/) {
    // skeleton
}

} // namespace sonet::messaging_service::repositories