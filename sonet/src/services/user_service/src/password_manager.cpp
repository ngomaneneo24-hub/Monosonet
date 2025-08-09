/*
 * Copyright (c) 2025 Neo Qiss
 * All rights reserved.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

#include "password_manager.h"
#include "security_utils.h"
#include <argon2.h>
#include <openssl/rand.h>
#include <openssl/sha.h>
#include <algorithm>
#include <regex>
#include <set>
#include <random>
#include <spdlog/spdlog.h>

namespace sonet::user {

// I hate weak passwords more than anything else in security
const std::vector<std::string> PasswordPolicy::FORBIDDEN_PASSWORDS = {
    "password", "123456", "123456789", "qwerty", "abc123", "111111",
    "password123", "admin", "welcome", "login", "root", "toor",
    "pass", "test", "guest", "user", "letmein", "monkey", "dragon"
};

PasswordManager::PasswordManager() {
    spdlog::info("Password manager initialized with Argon2id - because I don't mess around with security");
}

std::string PasswordManager::hash_password(const std::string& password) {
    // Generate a random salt - this is crucial for security
    std::string salt = generate_salt();
    
    // Prepare output buffer for the hash
    std::vector<uint8_t> hash(argon2_config_.hash_length);
    
    // Use Argon2id - the gold standard for password hashing
    int result = argon2id_hash_raw(
        argon2_config_.time_cost,
        argon2_config_.memory_cost,
        argon2_config_.parallelism,
        password.c_str(),
        password.length(),
        salt.c_str(),
        salt.length(),
        hash.data(),
        hash.size()
    );
    
    if (result != ARGON2_OK) {
        spdlog::error("Argon2 hashing failed: {}", argon2_error_message(result));
        throw std::runtime_error("Password hashing failed");
    }
    
    // Format: salt + hash (both base64 encoded)
    std::string encoded_salt = SecurityUtils::base64_encode(salt);
    std::string encoded_hash = SecurityUtils::base64_encode(std::string(hash.begin(), hash.end()));
    
    return encoded_salt + "$" + encoded_hash;
}

bool PasswordManager::verify_password(const std::string& password, const std::string& stored_hash) {
    // Parse stored hash: salt$hash
    size_t delimiter = stored_hash.find('$');
    if (delimiter == std::string::npos) {
        spdlog::warn("Invalid hash format encountered");
        return false;
    }
    
    std::string encoded_salt = stored_hash.substr(0, delimiter);
    std::string encoded_hash = stored_hash.substr(delimiter + 1);
    
    // Decode the stored components
    std::string salt = SecurityUtils::base64_decode(encoded_salt);
    std::string expected_hash = SecurityUtils::base64_decode(encoded_hash);
    
    // Hash the provided password with the same salt
    std::vector<uint8_t> computed_hash(argon2_config_.hash_length);
    
    int result = argon2id_hash_raw(
        argon2_config_.time_cost,
        argon2_config_.memory_cost,
        argon2_config_.parallelism,
        password.c_str(),
        password.length(),
        salt.c_str(),
        salt.length(),
        computed_hash.data(),
        computed_hash.size()
    );
    
    if (result != ARGON2_OK) {
        spdlog::error("Password verification failed: {}", argon2_error_message(result));
        return false;
    }
    
    // Constant-time comparison to prevent timing attacks
    std::string computed_hash_str(computed_hash.begin(), computed_hash.end());
    return SecurityUtils::secure_compare(computed_hash_str, expected_hash);
}

bool PasswordManager::is_password_strong(const std::string& password) const {
    // Length check - no negotiation here
    if (password.length() < PasswordPolicy::MIN_LENGTH || 
        password.length() > PasswordPolicy::MAX_LENGTH) {
        return false;
    }
    
    // Character type requirements
    if (PasswordPolicy::REQUIRE_UPPERCASE && !has_uppercase(password)) return false;
    if (PasswordPolicy::REQUIRE_LOWERCASE && !has_lowercase(password)) return false;
    if (PasswordPolicy::REQUIRE_DIGITS && !has_digit(password)) return false;
    if (PasswordPolicy::REQUIRE_SPECIAL && !has_special_char(password)) return false;
    
    // Entropy check - I want passwords that are actually random
    if (!has_sufficient_entropy(password)) return false;
    
    // Common password checks
    if (is_in_common_passwords(password)) return false;
    if (is_keyboard_pattern(password)) return false;
    if (is_repeated_pattern(password)) return false;
    
    return true;
}

std::vector<std::string> PasswordManager::get_password_requirements() const {
    return {
        "At least 8 characters long",
        "Contains uppercase letters",
        "Contains lowercase letters", 
        "Contains numbers",
        "Contains special characters",
        "Not a common password",
        "No obvious patterns"
    };
}

bool PasswordManager::is_password_compromised(const std::string& password) const {
    // In production, this would check against HaveIBeenPwned API
    // For now, just check against our known bad passwords
    std::string lower_password = password;
    std::transform(lower_password.begin(), lower_password.end(), 
                   lower_password.begin(), ::tolower);
    
    return is_in_common_passwords(lower_password);
}

std::string PasswordManager::generate_secure_password(size_t length) const {
    // Character sets for password generation
    const std::string uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const std::string lowercase = "abcdefghijklmnopqrstuvwxyz";
    const std::string digits = "0123456789";
    const std::string special = "!@#$%^&*()_+-=[]{}|;:,.<>?";
    const std::string all_chars = uppercase + lowercase + digits + special;
    
    std::string password;
    password.reserve(length);
    
    // Ensure we have at least one character from each required set
    password += get_random_char(uppercase);
    password += get_random_char(lowercase);
    password += get_random_char(digits);
    password += get_random_char(special);
    
    // Fill the rest randomly
    for (size_t i = 4; i < length; ++i) {
        password += get_random_char(all_chars);
    }
    
    // Shuffle to avoid predictable patterns
    {
        std::random_device rd;
        std::mt19937 gen(rd());
        std::shuffle(password.begin(), password.end(), gen);
    }
    
    return password;
}

std::string PasswordManager::generate_reset_token(const std::string& user_id) {
    std::string token = generate_secure_token(32);
    auto expires_at = std::chrono::system_clock::now() + std::chrono::hours(1);
    
    // Store token with expiration - in production this goes to Redis
    reset_tokens_[token] = {user_id, expires_at};
    
    spdlog::info("Generated password reset token for user {}", user_id);
    return token;
}

bool PasswordManager::verify_reset_token(const std::string& token, const std::string& user_id) {
    auto it = reset_tokens_.find(token);
    if (it == reset_tokens_.end()) {
        return false;
    }
    
    const auto& [stored_user_id, expires_at] = it->second;
    
    // Check if token has expired
    if (std::chrono::system_clock::now() > expires_at) {
        reset_tokens_.erase(it);
        return false;
    }
    
    // Check if token belongs to the right user
    return stored_user_id == user_id;
}

void PasswordManager::invalidate_reset_token(const std::string& token) {
    reset_tokens_.erase(token);
}

// Private helper methods

bool PasswordManager::has_uppercase(const std::string& password) const {
    return std::any_of(password.begin(), password.end(), ::isupper);
}

bool PasswordManager::has_lowercase(const std::string& password) const {
    return std::any_of(password.begin(), password.end(), ::islower);
}

bool PasswordManager::has_digit(const std::string& password) const {
    return std::any_of(password.begin(), password.end(), ::isdigit);
}

bool PasswordManager::has_special_char(const std::string& password) const {
    const std::string special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?";
    return std::any_of(password.begin(), password.end(), 
                       [&special_chars](char c) {
                           return special_chars.find(c) != std::string::npos;
                       });
}

bool PasswordManager::has_sufficient_entropy(const std::string& password) const {
    // Count unique characters - I want diversity
    std::set<char> unique_chars(password.begin(), password.end());
    return unique_chars.size() >= PasswordPolicy::MIN_UNIQUE_CHARS;
}

bool PasswordManager::is_in_common_passwords(const std::string& password) const {
    std::string lower_password = password;
    std::transform(lower_password.begin(), lower_password.end(), 
                   lower_password.begin(), ::tolower);
    
    return std::find(PasswordPolicy::FORBIDDEN_PASSWORDS.begin(),
                     PasswordPolicy::FORBIDDEN_PASSWORDS.end(),
                     lower_password) != PasswordPolicy::FORBIDDEN_PASSWORDS.end();
}

bool PasswordManager::is_keyboard_pattern(const std::string& password) const {
    // Check for obvious keyboard patterns like "qwerty", "asdf", "123456"
    const std::vector<std::string> patterns = {
        "qwerty", "asdf", "zxcv", "123456", "abcdef", "qwertyuiop"
    };
    
    std::string lower_password = password;
    std::transform(lower_password.begin(), lower_password.end(), 
                   lower_password.begin(), ::tolower);
    
    for (const auto& pattern : patterns) {
        if (lower_password.find(pattern) != std::string::npos) {
            return true;
        }
    }
    
    return false;
}

bool PasswordManager::is_repeated_pattern(const std::string& password) const {
    // Check for repeated characters or simple patterns
    if (password.length() < 3) return false;
    
    // Check for repeated sequences
    for (size_t len = 1; len <= password.length() / 2; ++len) {
        std::string pattern = password.substr(0, len);
        std::string repeated = pattern + pattern;
        
        if (password.find(repeated) != std::string::npos) {
            return true;
        }
    }
    
    return false;
}

std::string PasswordManager::generate_salt() const {
    return generate_secure_token(argon2_config_.salt_length);
}

std::string PasswordManager::generate_secure_token(size_t length) const {
    std::vector<uint8_t> random_bytes(length);
    
    if (RAND_bytes(random_bytes.data(), length) != 1) {
        throw std::runtime_error("Failed to generate secure random bytes");
    }
    
    return std::string(random_bytes.begin(), random_bytes.end());
}

} // namespace sonet::user
