#pragma once
#include <string>

namespace sonet::messaging_service::controllers {

class EncryptionController {
public:
    EncryptionController() = default;
    ~EncryptionController() = default;

    std::string encryptForConversation(const std::string& conversationId, const std::string& plaintext);
    std::string decryptForConversation(const std::string& conversationId, const std::string& ciphertext);
};

} // namespace sonet::messaging_service::controllers