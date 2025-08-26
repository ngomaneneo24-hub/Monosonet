# Passphrase Implementation

This document describes the implementation of passphrases to replace traditional passwords in the Sonet authentication system.

## Overview

Traditional passwords have become increasingly problematic:
- Users create weak, guessable passwords
- Complex passwords are hard to remember, leading to forgotten credentials
- Password reuse across multiple accounts creates security vulnerabilities
- Users often resort to writing passwords down, defeating the purpose

Passphrases provide better security through:
- **Easier to remember**: "correct horse battery staple" vs "K9#mP2$vX"
- **Harder to crack**: Longer length means exponentially more possible combinations
- **More natural**: Users can create meaningful, memorable phrases
- **Better entropy**: Even simple words in combination create strong security

## Backend Changes

### Password Manager (`password_manager.cpp`)

The `PasswordManager` class has been updated to support passphrases:

#### New Requirements
- **Minimum length**: 20 characters (increased from 8)
- **Maximum length**: 200 characters (increased from 128)
- **Word count**: Minimum 4 words, maximum 12 words
- **Character requirements**: No longer requires uppercase, digits, or special characters
- **Entropy**: Minimum 8 unique characters

#### New Methods
- `generate_secure_passphrase(size_t word_count = 4)`: Generates random passphrases using common English words
- `is_common_phrase(const std::string& passphrase)`: Checks against forbidden common phrases
- `has_minimum_word_count(const std::string& passphrase)`: Validates word count requirements

#### Forbidden Phrases
Common phrases that are too predictable are now rejected:
- Song lyrics: "twinkle twinkle little star", "mary had a little lamb"
- Nursery rhymes: "baa baa black sheep", "humpty dumpty sat on a wall"
- Tongue twisters: "peter piper picked a peck", "sally sells seashells"
- Famous phrases: "correct horse battery staple", "the quick brown fox"

### Password Policy (`user_types.h`)

Updated `PasswordPolicy` struct with new constants:
```cpp
struct PasswordPolicy {
    static constexpr size_t MIN_LENGTH = 20;        // Minimum 20 characters
    static constexpr size_t MAX_LENGTH = 200;       // Maximum 200 characters
    static constexpr size_t MIN_WORD_COUNT = 4;     // Minimum 4 words
    static constexpr size_t MAX_WORD_COUNT = 12;    // Maximum 12 words
    static constexpr bool REQUIRE_MIXED_CASE = false; // Not required
    static constexpr bool REQUIRE_DIGITS = false;    // Not required
    static constexpr bool REQUIRE_SPECIAL = false;   // Not required
    static constexpr size_t MIN_UNIQUE_CHARS = 8;   // Minimum unique characters
};
```

## Frontend Changes

### Signup Screen

#### Removed Elements
- "You're creating an account on..." starter pack message
- Traditional password requirements (uppercase, digits, special characters)

#### Updated Elements
- **Field label**: Changed from "Password" to "Passphrase"
- **Input label**: Changed from "Choose your password" to "Choose your passphrase"
- **Validation**: Now requires minimum 20 characters and 4 words
- **Help text**: Added guidance explaining passphrases with examples

#### New Help Text
```
A passphrase is 4 or more words that are easy to remember but hard to guess. 
For example: "correct horse battery staple" or "my favorite coffee shop downtown"
```

### Login Screen

#### Updated Elements
- **Field label**: Changed from "Password" to "Passphrase"
- **Accessibility**: Updated hints to reference passphrases
- **Error messages**: Updated to mention passphrases instead of passwords

### Password Reset Flow

#### Updated Elements
- **Form titles**: Changed from "Reset password" to "Reset passphrase"
- **Field labels**: Changed from "New password" to "New passphrase"
- **Help text**: Updated to reference passphrases
- **Success messages**: Updated to mention passphrases

## Validation Logic

### Frontend Validation
```typescript
// Check minimum length
if (password.length < 20) {
  return dispatch({
    type: 'setError',
    value: _('Your passphrase must be at least 20 characters long.'),
    field: 'password',
  })
}

// Check minimum word count
const wordCount = password.trim().split(/\s+/).filter(word => word.length >= 2).length
if (wordCount < 4) {
  return dispatch({
    type: 'setError',
    value: _('Your passphrase must contain at least 4 words.'),
    field: 'password',
  })
}
```

### Backend Validation
```cpp
bool PasswordManager::is_password_strong(const std::string& passphrase) const {
    // Length check
    if (passphrase.length() < PasswordPolicy::MIN_LENGTH || 
        passphrase.length() > PasswordPolicy::MAX_LENGTH) {
        return false;
    }
    
    // Word count check
    if (!has_minimum_word_count(passphrase)) {
        return false;
    }
    
    // Entropy check
    if (!has_sufficient_entropy(passphrase)) {
        return false;
    }
    
    // Common phrase checks
    if (is_in_common_passwords(passphrase)) return false;
    if (is_common_phrase(passphrase)) return false;
    if (is_keyboard_pattern(passphrase)) return false;
    if (is_repeated_pattern(passphrase)) return false;
    
    return true;
}
```

## Internationalization

All new passphrase-related strings have been added to the English locale file (`en/messages.po`) and are ready for translation to other languages. Key strings include:

- "Passphrase"
- "Choose your passphrase"
- "A passphrase is 4 or more words that are easy to remember but hard to guess..."
- "Your passphrase must be at least 20 characters long"
- "Your passphrase must contain at least 4 words"
- "Reset passphrase"
- "Set new passphrase"
- "Passphrase updated!"

## Security Benefits

1. **Increased Entropy**: 20+ character passphrases provide significantly more entropy than 8-character passwords
2. **Memorability**: Users are more likely to remember meaningful phrases than random character combinations
3. **Reduced Password Reuse**: Easier to remember unique passphrases for different services
4. **Resistance to Dictionary Attacks**: Multiple words in combination are harder to crack than single words
5. **User Adoption**: More user-friendly approach leads to better security practices

## Testing

A comprehensive test suite has been created (`test_passphrase_manager.cpp`) that validates:
- Passphrase strength validation
- Length and word count requirements
- Common phrase rejection
- Secure passphrase generation
- Hashing and verification functionality

## Migration Notes

### For Existing Users
- Existing password hashes remain valid
- Users can continue logging in with their current passwords
- Password reset will require new passphrases meeting the new requirements

### For New Users
- All new accounts must use passphrases
- Traditional password requirements no longer apply
- Clear guidance is provided during signup

## Future Enhancements

1. **Passphrase Strength Meter**: Visual indicator of passphrase strength
2. **Passphrase Suggestions**: AI-powered suggestions for memorable but secure passphrases
3. **Multi-language Support**: Passphrase generation in multiple languages
4. **Security Education**: In-app tutorials about passphrase best practices
5. **Breach Monitoring**: Integration with HaveIBeenPwned API for compromised passphrase detection

## Conclusion

The implementation of passphrases represents a significant improvement in both security and user experience. By moving away from complex character requirements and focusing on length and memorability, users are more likely to create and maintain secure credentials while reducing the likelihood of forgotten passwords and account lockouts.

This approach aligns with modern security recommendations from organizations like NIST and represents a best practice for authentication systems in 2025 and beyond.