/*
 * Copyright (c) 2025 Neo Qiss
 * All rights reserved.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

#pragma once

#include "user_types.h"
#include <string>
#include <optional>

namespace sonet::user {

/**
 * Password Manager - Because security isn't optional
 * 
 * I've seen too many breaches from weak password handling.
 * This implementation uses Argon2id with proper salt and timing.
 * No shortcuts, no compromises.
 */
class PasswordManager {
public:
    PasswordManager();
    ~PasswordManager() = default;

    // Core password operations
    std::string hash_password(const std::string& password);
    bool verify_password(const std::string& password, const std::string& hash);
    
    // Password strength validation - I'm picky about this
    bool is_password_strong(const std::string& password) const;
    std::vector<std::string> get_password_requirements() const;
    
    // Security checks
    bool is_password_compromised(const std::string& password) const;
    bool is_password_reused(const std::string& user_id, const std::string& password) const;
    
    // Password history for preventing reuse
    void store_password_history(const std::string& user_id, const std::string& password_hash);
    
    // Generate secure passwords for users who need help
    std::string generate_secure_password(size_t length = 16) const;
    
    // Password reset tokens
    std::string generate_reset_token(const std::string& user_id);
    bool verify_reset_token(const std::string& token, const std::string& user_id);
    void invalidate_reset_token(const std::string& token);

private:
    // Argon2 configuration - tuned for security vs performance
    struct Argon2Config {
        uint32_t time_cost = 3;      // Number of iterations
        uint32_t memory_cost = 65536; // Memory usage in KB (64MB)
        uint32_t parallelism = 4;    // Number of threads
        uint32_t hash_length = 32;   // Output hash length
        uint32_t salt_length = 16;   // Salt length
    } argon2_config_;
    
    // Password validation helpers
    bool has_uppercase(const std::string& password) const;
    bool has_lowercase(const std::string& password) const;
    bool has_digit(const std::string& password) const;
    bool has_special_char(const std::string& password) const;
    bool has_sufficient_entropy(const std::string& password) const;
    
    // Common password checking
    bool is_in_common_passwords(const std::string& password) const;
    bool is_keyboard_pattern(const std::string& password) const;
    bool is_repeated_pattern(const std::string& password) const;
    
    // Secure random generation
    std::string generate_salt() const;
    std::string generate_secure_token(size_t length = 32) const;
    
    // Reset token storage (in production, this goes to Redis)
    std::unordered_map<std::string, std::pair<std::string, std::chrono::system_clock::time_point>> reset_tokens_;
};

} // namespace sonet::user
