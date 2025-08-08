#include "message_validator.h"

namespace sonet::messaging_service::validators {

bool MessageValidator::isValidBody(const std::string& /*body*/) const {
    return true; // skeleton
}

} // namespace sonet::messaging_service::validators