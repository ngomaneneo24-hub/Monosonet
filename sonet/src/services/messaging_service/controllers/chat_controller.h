#pragma once
#include <string>
#include <vector>

namespace sonet::messaging_service::controllers {

class ChatController {
public:
    ChatController() = default;
    ~ChatController() = default;

    // Placeholder API surface
    void createConversation(const std::string& creatorUserId, const std::vector<std::string>& participantUserIds);
    void sendMessage(const std::string& conversationId, const std::string& senderUserId, const std::string& plaintextMessage);
};

} // namespace sonet::messaging_service::controllers