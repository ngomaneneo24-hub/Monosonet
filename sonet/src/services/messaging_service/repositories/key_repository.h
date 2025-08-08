#pragma once
#include <string>
#include "../models/encryption_key.h"

namespace sonet::messaging_service::repositories {

class KeyRepository {
public:
    KeyRepository() = default;
    ~KeyRepository() = default;

    models::EncryptionKey getByConversation(const std::string& conversationId);
    void save(const models::EncryptionKey& key);
};

} // namespace sonet::messaging_service::repositories