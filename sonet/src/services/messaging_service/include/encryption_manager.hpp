/*
 * Encryption Manager - header
 */
#pragma once

#include <string>
#include <vector>
#include <chrono>
#include <json/json.h>

namespace sonet::messaging::encryption {

enum class EncryptionAlgorithm {
    AES_256_GCM = 0,
    CHACHA20_POLY1305 = 1,
    X25519_CHACHA20_POLY1305 = 2
};

struct EncryptionKeyPair {
    std::string key_id;
    EncryptionAlgorithm algorithm;
    std::string public_key;
    std::string private_key;
    std::chrono::system_clock::time_point created_at;
    std::chrono::system_clock::time_point expires_at;
    bool is_ephemeral = false;

    std::string serialize_public_key() const;
    std::string serialize_private_key() const;
    bool load_from_hex(const std::string& public_hex, const std::string& private_hex);
    Json::Value to_json() const;
    bool is_expired() const;
};

struct SessionKey {
    std::string session_id;
    std::string chat_id;
    std::string user_id;
    EncryptionAlgorithm algorithm;
    std::string key_material; // binary stored as string
    std::chrono::system_clock::time_point created_at;
    std::chrono::system_clock::time_point expires_at;
    uint32_t message_count = 0;
    uint32_t max_messages = 0;

    std::string get_key_material() const;
    Json::Value to_json() const;
    bool is_expired() const;
    void increment_usage();
};

struct EncryptedMessage {
    std::string message_id;
    std::string session_id;
    EncryptionAlgorithm algorithm;
    std::string ciphertext;      // base64
    std::string nonce;           // base64
    std::string tag;             // base64
    std::string additional_data; // raw AAD if any
    std::chrono::system_clock::time_point timestamp;

    Json::Value to_json() const;
    static EncryptedMessage from_json(const Json::Value& json);
};

class EncryptionManager {
public:
    EncryptionManager();
    ~EncryptionManager();

    EncryptionKeyPair generate_key_pair(EncryptionAlgorithm algorithm);
    SessionKey create_session_key(const std::string& chat_id,
                                  const std::string& user_id,
                                  EncryptionAlgorithm algorithm);

    EncryptedMessage encrypt_message(const std::string& session_id,
                                     const std::string& plaintext,
                                     const std::string& additional_data);

    std::string decrypt_message(const EncryptedMessage& encrypted_msg);

    // Utilities
    std::vector<std::string> get_supported_algorithms() const;

private:
    // Intentionally hide internals; implementation persists session keys to disk
};

} // namespace sonet::messaging::encryption