#pragma once
#include <string>

namespace sonet::messaging_service::validators {

class SecurityValidator {
public:
    SecurityValidator() = default;
    ~SecurityValidator() = default;

    bool isKeyValid(const std::string& conversationId) const;
};

} // namespace sonet::messaging_service::validators