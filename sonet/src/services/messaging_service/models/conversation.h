#pragma once
#include <string>
#include <vector>

namespace sonet::messaging_service::models {

struct Conversation {
    std::string id;
    std::vector<std::string> participant_user_ids;
};

} // namespace sonet::messaging_service::models