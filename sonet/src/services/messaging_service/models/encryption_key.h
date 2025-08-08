#pragma once
#include <string>
#include <vector>

namespace sonet::messaging_service::models {

struct EncryptionKey {
    std::string id;
    std::string conversation_id;
    std::vector<uint8_t> key_bytes;
};

} // namespace sonet::messaging_service::models