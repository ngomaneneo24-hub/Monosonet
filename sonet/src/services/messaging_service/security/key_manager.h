#pragma once
#include <string>
#include <vector>

namespace sonet::messaging_service::security {

class KeyManager {
public:
    KeyManager() = default;
    ~KeyManager() = default;

    std::vector<uint8_t> getConversationKey(const std::string& conversationId);
    void rotateConversationKey(const std::string& conversationId);
};

} // namespace sonet::messaging_service::security