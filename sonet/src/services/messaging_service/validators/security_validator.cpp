#include "security_validator.h"

namespace sonet::messaging_service::validators {

bool SecurityValidator::isKeyValid(const std::string& /*conversationId*/) const {
    return true; // skeleton
}

} // namespace sonet::messaging_service::validators