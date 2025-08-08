#include "key_manager.h"

namespace sonet::messaging_service::security {

std::vector<uint8_t> KeyManager::getConversationKey(const std::string& /*conversationId*/) {
    return {}; // skeleton
}

void KeyManager::rotateConversationKey(const std::string& /*conversationId*/) {
    // skeleton
}

} // namespace sonet::messaging_service::security