#pragma once
#include <string>
#include <vector>

namespace sonet::messaging_service::security {

class CryptoEngine {
public:
    CryptoEngine() = default;
    ~CryptoEngine() = default;

    std::string encrypt(const std::vector<uint8_t>& key, const std::string& plaintext);
    std::string decrypt(const std::vector<uint8_t>& key, const std::string& ciphertext);
};

} // namespace sonet::messaging_service::security