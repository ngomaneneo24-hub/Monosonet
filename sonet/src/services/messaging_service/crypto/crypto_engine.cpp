/*
 * Copyright (c) 2025 Neo Qiss
 * All rights reserved.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

#include "include/crypto_engine.hpp"
#include <openssl/evp.h>
#include <openssl/rand.h>
#include <openssl/kdf.h>
#include <openssl/ec.h>
#include <openssl/ecdh.h>
#include <openssl/hmac.h>
#include <openssl/sha.h>
#include <sodium.h>
#include <algorithm>
#include <sstream>
#include <iomanip>

namespace sonet::messaging::crypto {

// CryptoKey implementation
Json::Value CryptoKey::to_json() const {
    Json::Value json;
    json["id"] = id;
    json["algorithm"] = algorithm;
    json["created_at"] = std::chrono::duration_cast<std::chrono::milliseconds>(
        created_at.time_since_epoch()).count();
    json["expires_at"] = std::chrono::duration_cast<std::chrono::milliseconds>(
        expires_at.time_since_epoch()).count();
    json["user_id"] = user_id;
    json["device_id"] = device_id;
    
    if (parent_key_id) {
        json["parent_key_id"] = *parent_key_id;
    }
    
    json["is_ephemeral"] = is_ephemeral;
    
    // Note: We don't serialize the actual key data for security
    json["key_length"] = static_cast<int>(key_data.size());
    
    return json;
}

bool CryptoKey::is_expired() const {
    return std::chrono::system_clock::now() > expires_at;
}

void CryptoKey::secure_erase() {
    if (!key_data.empty()) {
        sodium_memzero(key_data.data(), key_data.size());
        key_data.clear();
    }
}

// EncryptionContext implementation
Json::Value EncryptionContext::to_json() const {
    Json::Value json;
    json["algorithm"] = static_cast<int>(algorithm);
    json["key_id"] = key_id;
    json["session_id"] = session_id;
    
    // Encode binary data as base64
    json["iv"] = base64_encode(initialization_vector);
    json["tag"] = base64_encode(authentication_tag);
    
    if (additional_data) {
        json["aad"] = base64_encode(*additional_data);
    }
    
    return json;
}

EncryptionContext EncryptionContext::from_json(const Json::Value& json) {
    EncryptionContext context;
    context.algorithm = static_cast<CryptoAlgorithm>(json["algorithm"].asInt());
    context.key_id = json["key_id"].asString();
    context.session_id = json["session_id"].asString();
    
    context.initialization_vector = base64_decode(json["iv"].asString());
    context.authentication_tag = base64_decode(json["tag"].asString());
    
    if (json.isMember("aad")) {
        context.additional_data = base64_decode(json["aad"].asString());
    }
    
    return context;
}

// SecureRandom implementation
SecureRandom::SecureRandom() : gen_(rd_()) {
    // Initialize libsodium for additional entropy
    if (sodium_init() < 0) {
        throw std::runtime_error("Failed to initialize libsodium");
    }
}

std::vector<uint8_t> SecureRandom::generate_bytes(size_t length) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    std::vector<uint8_t> bytes(length);
    
    // Use libsodium's secure random generator
    randombytes_buf(bytes.data(), length);
    
    return bytes;
}

std::string SecureRandom::generate_hex(size_t length) {
    auto bytes = generate_bytes(length);
    std::stringstream ss;
    
    for (auto byte : bytes) {
        ss << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(byte);
    }
    
    return ss.str();
}

std::string SecureRandom::generate_base64(size_t length) {
    auto bytes = generate_bytes(length);
    return base64_encode(bytes);
}

uint64_t SecureRandom::generate_uint64() {
    auto bytes = generate_bytes(8);
    uint64_t value = 0;
    
    for (size_t i = 0; i < 8; ++i) {
        value |= static_cast<uint64_t>(bytes[i]) << (i * 8);
    }
    
    return value;
}

void SecureRandom::seed_additional_entropy(const std::vector<uint8_t>& entropy) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    // Mix additional entropy into our generator
    std::seed_seq seq(entropy.begin(), entropy.end());
    gen_.seed(seq);
}

// CryptoEngine implementation
CryptoEngine::CryptoEngine() 
    : random_(std::make_unique<SecureRandom>()),
      default_encryption_algorithm_(CryptoAlgorithm::AES_256_GCM),
      default_key_exchange_(KeyExchangeProtocol::X25519),
      default_hash_algorithm_(HashAlgorithm::SHA256),
      default_signature_algorithm_(SignatureAlgorithm::ED25519),
      key_rotation_interval_hours_(24),
      max_cached_keys_(1000),
      perfect_forward_secrecy_enabled_(true),
      quantum_resistant_mode_(false) {
    
    // Initialize OpenSSL
    OpenSSL_add_all_algorithms();
    ERR_load_crypto_strings();
}

CryptoEngine::~CryptoEngine() {
    clear_key_cache();
    EVP_cleanup();
    ERR_free_strings();
}

std::unique_ptr<CryptoKey> CryptoEngine::generate_symmetric_key(
    CryptoAlgorithm algorithm, const std::string& user_id, 
    const std::string& device_id, std::chrono::hours expiry) {
    
    auto key = std::make_unique<CryptoKey>();
    key->id = generate_session_id();
    key->user_id = user_id;
    key->device_id = device_id;
    key->created_at = std::chrono::system_clock::now();
    key->expires_at = key->created_at + expiry;
    
    size_t key_length;
    switch (algorithm) {
        case CryptoAlgorithm::AES_256_GCM:
        case CryptoAlgorithm::AES_256_CBC:
        case CryptoAlgorithm::AES_256_SIV:
            key_length = 32; // 256 bits
            key->algorithm = "AES-256";
            break;
        case CryptoAlgorithm::CHACHA20_POLY1305:
        case CryptoAlgorithm::XCHACHA20_POLY1305:
            key_length = 32; // 256 bits
            key->algorithm = "ChaCha20";
            break;
        default:
            throw std::invalid_argument("Unsupported encryption algorithm");
    }
    
    key->key_data = random_->generate_bytes(key_length);
    
    return key;
}

std::pair<std::unique_ptr<CryptoKey>, std::unique_ptr<CryptoKey>> 
CryptoEngine::generate_keypair(KeyExchangeProtocol protocol, 
                              const std::string& user_id, 
                              const std::string& device_id) {
    
    auto private_key = std::make_unique<CryptoKey>();
    auto public_key = std::make_unique<CryptoKey>();
    
    // Set common properties
    std::string base_id = generate_session_id();
    private_key->id = base_id + "_private";
    public_key->id = base_id + "_public";
    
    private_key->user_id = public_key->user_id = user_id;
    private_key->device_id = public_key->device_id = device_id;
    
    auto now = std::chrono::system_clock::now();
    private_key->created_at = public_key->created_at = now;
    private_key->expires_at = public_key->expires_at = now + std::chrono::hours(24 * 30);
    
    switch (protocol) {
        case KeyExchangeProtocol::X25519: {
            private_key->algorithm = public_key->algorithm = "X25519";
            
            // Generate X25519 keypair using libsodium
            private_key->key_data.resize(crypto_scalarmult_curve25519_BYTES);
            public_key->key_data.resize(crypto_scalarmult_curve25519_BYTES);
            
            crypto_scalarmult_curve25519_base(
                public_key->key_data.data(),
                private_key->key_data.data()
            );
            break;
        }
        
        case KeyExchangeProtocol::ECDH_P256: {
            private_key->algorithm = public_key->algorithm = "ECDH-P256";
            
            // Generate ECDH P-256 keypair using OpenSSL
            EVP_PKEY_CTX* ctx = EVP_PKEY_CTX_new_id(EVP_PKEY_EC, nullptr);
            if (!ctx) throw std::runtime_error("Failed to create ECDH context");
            
            if (EVP_PKEY_keygen_init(ctx) <= 0) {
                EVP_PKEY_CTX_free(ctx);
                throw std::runtime_error("Failed to initialize ECDH keygen");
            }
            
            if (EVP_PKEY_CTX_set_ec_paramgen_curve_nid(ctx, NID_X9_62_prime256v1) <= 0) {
                EVP_PKEY_CTX_free(ctx);
                throw std::runtime_error("Failed to set ECDH curve");
            }
            
            EVP_PKEY* pkey = nullptr;
            if (EVP_PKEY_keygen(ctx, &pkey) <= 0) {
                EVP_PKEY_CTX_free(ctx);
                throw std::runtime_error("Failed to generate ECDH keypair");
            }
            
            // Extract key data (simplified - would need proper serialization)
            private_key->key_data.resize(32);
            public_key->key_data.resize(64);
            
            EVP_PKEY_free(pkey);
            EVP_PKEY_CTX_free(ctx);
            break;
        }
        
        default:
            throw std::invalid_argument("Unsupported key exchange protocol");
    }
    
    return std::make_pair(std::move(private_key), std::move(public_key));
}

std::pair<std::vector<uint8_t>, EncryptionContext> CryptoEngine::encrypt(
    const std::vector<uint8_t>& plaintext, const CryptoKey& key,
    const std::optional<std::vector<uint8_t>>& additional_data) {
    
    if (key.is_expired()) {
        throw std::runtime_error("Encryption key has expired");
    }
    
    EncryptionContext context;
    context.algorithm = default_encryption_algorithm_;
    context.key_id = key.id;
    context.session_id = generate_session_id();
    context.initialization_vector = generate_iv(context.algorithm);
    
    if (additional_data) {
        context.additional_data = *additional_data;
    }
    
    std::vector<uint8_t> ciphertext;
    
    switch (context.algorithm) {
        case CryptoAlgorithm::AES_256_GCM: {
            ciphertext = encrypt_aes_256_gcm(plaintext, key.key_data, 
                                           context.initialization_vector,
                                           context.additional_data,
                                           context.authentication_tag);
            break;
        }
        
        case CryptoAlgorithm::CHACHA20_POLY1305: {
            ciphertext = encrypt_chacha20_poly1305(plaintext, key.key_data,
                                                  context.initialization_vector,
                                                  context.additional_data,
                                                  context.authentication_tag);
            break;
        }
        
        default:
            throw std::invalid_argument("Unsupported encryption algorithm");
    }
    
    return std::make_pair(ciphertext, context);
}

std::vector<uint8_t> CryptoEngine::decrypt(
    const std::vector<uint8_t>& ciphertext, const CryptoKey& key,
    const EncryptionContext& context) {
    
    if (key.is_expired()) {
        throw std::runtime_error("Decryption key has expired");
    }
    
    if (key.id != context.key_id) {
        throw std::invalid_argument("Key ID mismatch");
    }
    
    std::vector<uint8_t> plaintext;
    
    switch (context.algorithm) {
        case CryptoAlgorithm::AES_256_GCM: {
            plaintext = decrypt_aes_256_gcm(ciphertext, key.key_data,
                                          context.initialization_vector,
                                          context.additional_data,
                                          context.authentication_tag);
            break;
        }
        
        case CryptoAlgorithm::CHACHA20_POLY1305: {
            plaintext = decrypt_chacha20_poly1305(ciphertext, key.key_data,
                                                 context.initialization_vector,
                                                 context.additional_data,
                                                 context.authentication_tag);
            break;
        }
        
        default:
            throw std::invalid_argument("Unsupported decryption algorithm");
    }
    
    return plaintext;
}

std::pair<std::string, EncryptionContext> CryptoEngine::encrypt_string(
    const std::string& plaintext, const CryptoKey& key) {
    
    std::vector<uint8_t> plaintext_bytes(plaintext.begin(), plaintext.end());
    auto [ciphertext, context] = encrypt(plaintext_bytes, key);
    
    std::string ciphertext_b64 = base64_encode(ciphertext);
    return std::make_pair(ciphertext_b64, context);
}

std::string CryptoEngine::decrypt_string(
    const std::string& ciphertext_base64, const CryptoKey& key,
    const EncryptionContext& context) {
    
    std::vector<uint8_t> ciphertext = base64_decode(ciphertext_base64);
    std::vector<uint8_t> plaintext_bytes = decrypt(ciphertext, key, context);
    
    return std::string(plaintext_bytes.begin(), plaintext_bytes.end());
}

std::vector<uint8_t> CryptoEngine::hash(const std::vector<uint8_t>& data, 
                                       HashAlgorithm algorithm) {
    std::vector<uint8_t> hash_output;
    
    switch (algorithm) {
        case HashAlgorithm::SHA256: {
            hash_output.resize(SHA256_DIGEST_LENGTH);
            SHA256(data.data(), data.size(), hash_output.data());
            break;
        }
        
        case HashAlgorithm::SHA512: {
            hash_output.resize(SHA512_DIGEST_LENGTH);
            SHA512(data.data(), data.size(), hash_output.data());
            break;
        }
        
        case HashAlgorithm::BLAKE2B: {
            hash_output.resize(crypto_generichash_BYTES);
            crypto_generichash(hash_output.data(), hash_output.size(),
                             data.data(), data.size(), nullptr, 0);
            break;
        }
        
        default:
            throw std::invalid_argument("Unsupported hash algorithm");
    }
    
    return hash_output;
}

std::string CryptoEngine::hash_hex(const std::vector<uint8_t>& data, 
                                  HashAlgorithm algorithm) {
    auto hash_bytes = hash(data, algorithm);
    
    std::stringstream ss;
    for (auto byte : hash_bytes) {
        ss << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(byte);
    }
    
    return ss.str();
}

std::string CryptoEngine::calculate_key_fingerprint(const CryptoKey& key, 
                                                   HashAlgorithm algorithm) {
    std::vector<uint8_t> key_data_copy = key.key_data;
    return hash_hex(key_data_copy, algorithm);
}

std::vector<uint8_t> CryptoEngine::generate_salt(size_t length) {
    return random_->generate_bytes(length);
}

std::vector<uint8_t> CryptoEngine::generate_iv(CryptoAlgorithm algorithm) {
    size_t iv_length;
    
    switch (algorithm) {
        case CryptoAlgorithm::AES_256_GCM:
            iv_length = 12; // 96 bits recommended for GCM
            break;
        case CryptoAlgorithm::AES_256_CBC:
            iv_length = 16; // 128 bits for CBC
            break;
        case CryptoAlgorithm::CHACHA20_POLY1305:
            iv_length = 12; // 96 bits for ChaCha20
            break;
        case CryptoAlgorithm::XCHACHA20_POLY1305:
            iv_length = 24; // 192 bits for XChaCha20
            break;
        default:
            iv_length = 16; // Default to 128 bits
    }
    
    return random_->generate_bytes(iv_length);
}

std::string CryptoEngine::generate_session_id() {
    return random_->generate_hex(16);
}

bool CryptoEngine::is_algorithm_secure(CryptoAlgorithm algorithm) {
    // All supported algorithms are considered secure
    switch (algorithm) {
        case CryptoAlgorithm::AES_256_GCM:
        case CryptoAlgorithm::CHACHA20_POLY1305:
        case CryptoAlgorithm::XCHACHA20_POLY1305:
        case CryptoAlgorithm::AES_256_SIV:
            return true;
        case CryptoAlgorithm::AES_256_CBC:
            return false; // CBC mode is vulnerable to padding oracle attacks
        default:
            return false;
    }
}

uint32_t CryptoEngine::calculate_security_level(CryptoAlgorithm algorithm) {
    switch (algorithm) {
        case CryptoAlgorithm::AES_256_GCM:
        case CryptoAlgorithm::AES_256_SIV:
            return 256; // 256-bit security level
        case CryptoAlgorithm::CHACHA20_POLY1305:
        case CryptoAlgorithm::XCHACHA20_POLY1305:
            return 256; // 256-bit security level
        case CryptoAlgorithm::AES_256_CBC:
            return 128; // Reduced due to CBC vulnerabilities
        default:
            return 0;
    }
}

void CryptoEngine::cache_key(std::unique_ptr<CryptoKey> key) {
    std::lock_guard<std::mutex> lock(key_cache_mutex_);
    
    if (key_cache_.size() >= max_cached_keys_) {
        // Remove oldest keys
        cleanup_expired_keys();
        
        if (key_cache_.size() >= max_cached_keys_) {
            auto oldest = key_cache_.begin();
            oldest->second->secure_erase();
            key_cache_.erase(oldest);
        }
    }
    
    std::string key_id = key->id;
    key_cache_[key_id] = std::move(key);
}

std::shared_ptr<CryptoKey> CryptoEngine::get_cached_key(const std::string& key_id) {
    std::lock_guard<std::mutex> lock(key_cache_mutex_);
    
    auto it = key_cache_.find(key_id);
    if (it != key_cache_.end() && !it->second->is_expired()) {
        return std::shared_ptr<CryptoKey>(it->second.get(), [](CryptoKey*) {
            // Custom deleter that doesn't actually delete (managed by unique_ptr)
        });
    }
    
    return nullptr;
}

void CryptoEngine::cleanup_expired_keys() {
    std::lock_guard<std::mutex> lock(key_cache_mutex_);
    
    auto it = key_cache_.begin();
    while (it != key_cache_.end()) {
        if (it->second->is_expired()) {
            it->second->secure_erase();
            it = key_cache_.erase(it);
        } else {
            ++it;
        }
    }
}

void CryptoEngine::clear_key_cache() {
    std::lock_guard<std::mutex> lock(key_cache_mutex_);
    
    for (auto& [id, key] : key_cache_) {
        key->secure_erase();
    }
    key_cache_.clear();
}

// Helper functions for encryption/decryption
std::vector<uint8_t> CryptoEngine::encrypt_aes_256_gcm(
    const std::vector<uint8_t>& plaintext,
    const std::vector<uint8_t>& key,
    const std::vector<uint8_t>& iv,
    const std::optional<std::vector<uint8_t>>& aad,
    std::vector<uint8_t>& tag) {
    
    EVP_CIPHER_CTX* ctx = EVP_CIPHER_CTX_new();
    if (!ctx) throw std::runtime_error("Failed to create cipher context");
    
    if (EVP_EncryptInit_ex(ctx, EVP_aes_256_gcm(), nullptr, nullptr, nullptr) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        throw std::runtime_error("Failed to initialize AES-256-GCM encryption");
    }
    
    if (EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_IVLEN, iv.size(), nullptr) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        throw std::runtime_error("Failed to set IV length");
    }
    
    if (EVP_EncryptInit_ex(ctx, nullptr, nullptr, key.data(), iv.data()) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        throw std::runtime_error("Failed to set key and IV");
    }
    
    std::vector<uint8_t> ciphertext(plaintext.size());
    int len = 0;
    
    // Add AAD if provided
    if (aad) {
        if (EVP_EncryptUpdate(ctx, nullptr, &len, aad->data(), aad->size()) != 1) {
            EVP_CIPHER_CTX_free(ctx);
            throw std::runtime_error("Failed to add AAD");
        }
    }
    
    // Encrypt plaintext
    if (EVP_EncryptUpdate(ctx, ciphertext.data(), &len, plaintext.data(), plaintext.size()) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        throw std::runtime_error("Failed to encrypt plaintext");
    }
    
    int ciphertext_len = len;
    
    // Finalize encryption
    if (EVP_EncryptFinal_ex(ctx, ciphertext.data() + len, &len) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        throw std::runtime_error("Failed to finalize encryption");
    }
    
    ciphertext_len += len;
    ciphertext.resize(ciphertext_len);
    
    // Get authentication tag
    tag.resize(16); // 128-bit tag
    if (EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_GET_TAG, 16, tag.data()) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        throw std::runtime_error("Failed to get authentication tag");
    }
    
    EVP_CIPHER_CTX_free(ctx);
    return ciphertext;
}

std::vector<uint8_t> CryptoEngine::decrypt_aes_256_gcm(
    const std::vector<uint8_t>& ciphertext,
    const std::vector<uint8_t>& key,
    const std::vector<uint8_t>& iv,
    const std::optional<std::vector<uint8_t>>& aad,
    const std::vector<uint8_t>& tag) {
    
    EVP_CIPHER_CTX* ctx = EVP_CIPHER_CTX_new();
    if (!ctx) throw std::runtime_error("Failed to create cipher context");
    
    if (EVP_DecryptInit_ex(ctx, EVP_aes_256_gcm(), nullptr, nullptr, nullptr) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        throw std::runtime_error("Failed to initialize AES-256-GCM decryption");
    }
    
    if (EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_IVLEN, iv.size(), nullptr) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        throw std::runtime_error("Failed to set IV length");
    }
    
    if (EVP_DecryptInit_ex(ctx, nullptr, nullptr, key.data(), iv.data()) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        throw std::runtime_error("Failed to set key and IV");
    }
    
    // Add AAD if provided
    int len = 0;
    if (aad) {
        if (EVP_DecryptUpdate(ctx, nullptr, &len, aad->data(), aad->size()) != 1) {
            EVP_CIPHER_CTX_free(ctx);
            throw std::runtime_error("Failed to add AAD");
        }
    }
    
    std::vector<uint8_t> plaintext(ciphertext.size());
    
    // Decrypt ciphertext
    if (EVP_DecryptUpdate(ctx, plaintext.data(), &len, ciphertext.data(), ciphertext.size()) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        throw std::runtime_error("Failed to decrypt ciphertext");
    }
    
    int plaintext_len = len;
    
    // Set authentication tag
    if (EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_TAG, tag.size(), const_cast<uint8_t*>(tag.data())) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        throw std::runtime_error("Failed to set authentication tag");
    }
    
    // Finalize decryption and verify tag
    if (EVP_DecryptFinal_ex(ctx, plaintext.data() + len, &len) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        throw std::runtime_error("Authentication verification failed");
    }
    
    plaintext_len += len;
    plaintext.resize(plaintext_len);
    
    EVP_CIPHER_CTX_free(ctx);
    return plaintext;
}

std::vector<uint8_t> CryptoEngine::encrypt_chacha20_poly1305(
    const std::vector<uint8_t>& plaintext,
    const std::vector<uint8_t>& key,
    const std::vector<uint8_t>& nonce,
    const std::optional<std::vector<uint8_t>>& aad,
    std::vector<uint8_t>& tag) {
    
    std::vector<uint8_t> ciphertext(plaintext.size());
    tag.resize(crypto_aead_chacha20poly1305_ABYTES);
    
    unsigned long long ciphertext_len;
    
    int result = crypto_aead_chacha20poly1305_encrypt(
        ciphertext.data(), &ciphertext_len,
        plaintext.data(), plaintext.size(),
        aad ? aad->data() : nullptr, aad ? aad->size() : 0,
        nullptr, // nsec (not used)
        nonce.data(), key.data()
    );
    
    if (result != 0) {
        throw std::runtime_error("ChaCha20-Poly1305 encryption failed");
    }
    
    // Extract tag from end of ciphertext
    size_t pure_ciphertext_len = ciphertext_len - crypto_aead_chacha20poly1305_ABYTES;
    std::copy(ciphertext.begin() + pure_ciphertext_len, 
             ciphertext.begin() + ciphertext_len, tag.begin());
    
    ciphertext.resize(pure_ciphertext_len);
    return ciphertext;
}

std::vector<uint8_t> CryptoEngine::decrypt_chacha20_poly1305(
    const std::vector<uint8_t>& ciphertext,
    const std::vector<uint8_t>& key,
    const std::vector<uint8_t>& nonce,
    const std::optional<std::vector<uint8_t>>& aad,
    const std::vector<uint8_t>& tag) {
    
    // Combine ciphertext and tag for libsodium
    std::vector<uint8_t> ciphertext_with_tag = ciphertext;
    ciphertext_with_tag.insert(ciphertext_with_tag.end(), tag.begin(), tag.end());
    
    std::vector<uint8_t> plaintext(ciphertext.size());
    unsigned long long plaintext_len;
    
    int result = crypto_aead_chacha20poly1305_decrypt(
        plaintext.data(), &plaintext_len,
        nullptr, // nsec (not used)
        ciphertext_with_tag.data(), ciphertext_with_tag.size(),
        aad ? aad->data() : nullptr, aad ? aad->size() : 0,
        nonce.data(), key.data()
    );
    
    if (result != 0) {
        throw std::runtime_error("ChaCha20-Poly1305 decryption failed");
    }
    
    plaintext.resize(plaintext_len);
    return plaintext;
}

// Base64 encoding/decoding helpers
std::string base64_encode(const std::vector<uint8_t>& data) {
    const char* chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    std::string result;
    
    size_t i = 0;
    uint8_t buffer[3];
    
    while (i < data.size()) {
        buffer[0] = data[i++];
        buffer[1] = (i < data.size()) ? data[i++] : 0;
        buffer[2] = (i < data.size()) ? data[i++] : 0;
        
        result += chars[(buffer[0] & 0xfc) >> 2];
        result += chars[((buffer[0] & 0x03) << 4) + ((buffer[1] & 0xf0) >> 4)];
        result += chars[((buffer[1] & 0x0f) << 2) + ((buffer[2] & 0xc0) >> 6)];
        result += chars[buffer[2] & 0x3f];
    }
    
    // Add padding
    size_t padding = (3 - (data.size() % 3)) % 3;
    for (size_t j = 0; j < padding; ++j) {
        result[result.size() - 1 - j] = '=';
    }
    
    return result;
}

std::vector<uint8_t> base64_decode(const std::string& encoded) {
    const int lookup[256] = {
        -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
        -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
        -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,62,-1,-1,-1,63,
        52,53,54,55,56,57,58,59,60,61,-1,-1,-1,-1,-1,-1,
        -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,10,11,12,13,14,
        15,16,17,18,19,20,21,22,23,24,25,-1,-1,-1,-1,-1,
        -1,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,
        41,42,43,44,45,46,47,48,49,50,51,-1,-1,-1,-1,-1,
        -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
        -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
        -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
        -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
        -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
        -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
        -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
        -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1
    };
    
    std::vector<uint8_t> result;
    size_t padding = 0;
    
    // Count padding
    for (size_t i = encoded.size(); i > 0 && encoded[i-1] == '='; --i) {
        ++padding;
    }
    
    size_t length = encoded.size() - padding;
    result.reserve((length * 3) / 4);
    
    for (size_t i = 0; i < length; i += 4) {
        int n = (lookup[encoded[i]] << 18) + 
                (lookup[encoded[i+1]] << 12) + 
                (lookup[encoded[i+2]] << 6) + 
                lookup[encoded[i+3]];
        
        result.push_back((n >> 16) & 255);
        if (i + 2 < length) result.push_back((n >> 8) & 255);
        if (i + 3 < length) result.push_back(n & 255);
    }
    
    return result;
}

} // namespace sonet::messaging::crypto
