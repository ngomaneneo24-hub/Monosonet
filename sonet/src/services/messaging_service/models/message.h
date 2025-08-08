#pragma once
#include <string>
#include <chrono>

namespace sonet::messaging_service::models {

struct Message {
    std::string id;
    std::string conversation_id;
    std::string sender_user_id;
    std::string body;
    std::chrono::system_clock::time_point created_at{};
};

} // namespace sonet::messaging_service::models