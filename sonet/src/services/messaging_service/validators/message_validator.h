#pragma once
#include <string>

namespace sonet::messaging_service::validators {

class MessageValidator {
public:
    MessageValidator() = default;
    ~MessageValidator() = default;

    bool isValidBody(const std::string& body) const;
};

} // namespace sonet::messaging_service::validators