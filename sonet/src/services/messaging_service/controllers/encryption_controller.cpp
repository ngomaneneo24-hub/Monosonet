#include "encryption_controller.h"

namespace sonet::messaging_service::controllers {

std::string EncryptionController::encryptForConversation(const std::string& /*conversationId*/, const std::string& plaintext) {
    return plaintext; // skeleton passthrough
}

std::string EncryptionController::decryptForConversation(const std::string& /*conversationId*/, const std::string& ciphertext) {
    return ciphertext; // skeleton passthrough
}

} // namespace sonet::messaging_service::controllers