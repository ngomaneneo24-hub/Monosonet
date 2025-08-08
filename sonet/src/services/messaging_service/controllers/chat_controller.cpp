#include "chat_controller.h"

namespace sonet::messaging_service::controllers {

void ChatController::createConversation(const std::string& /*creatorUserId*/, const std::vector<std::string>& /*participantUserIds*/) {
    // Intentionally left blank (skeleton)
}

void ChatController::sendMessage(const std::string& /*conversationId*/, const std::string& /*senderUserId*/, const std::string& /*plaintextMessage*/) {
    // Intentionally left blank (skeleton)
}

} // namespace sonet::messaging_service::controllers