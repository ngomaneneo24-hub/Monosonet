#pragma once
#include <string>
#include <vector>
#include "../models/message.h"

namespace sonet::messaging_service::repositories {

class MessageRepository {
public:
    MessageRepository() = default;
    ~MessageRepository() = default;

    void save(const models::Message& message);
    std::vector<models::Message> getByConversation(const std::string& conversationId, int limit = 50);
};

} // namespace sonet::messaging_service::repositories