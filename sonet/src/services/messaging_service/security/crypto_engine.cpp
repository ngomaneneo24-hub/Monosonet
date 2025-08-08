#include "crypto_engine.h"

namespace sonet::messaging_service::security {

std::string CryptoEngine::encrypt(const std::vector<uint8_t>& /*key*/, const std::string& plaintext) {
    return plaintext; // skeleton
}

std::string CryptoEngine::decrypt(const std::vector<uint8_t>& /*key*/, const std::string& ciphertext) {
    return ciphertext; // skeleton
}

} // namespace sonet::messaging_service::security