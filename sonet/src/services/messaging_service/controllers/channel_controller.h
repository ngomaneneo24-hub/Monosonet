#pragma once
#include <string>

namespace sonet::messaging_service::controllers {

class ChannelController {
public:
    ChannelController() = default;
    ~ChannelController() = default;

    void openChannel(const std::string& userId);
    void closeChannel(const std::string& userId);
};

} // namespace sonet::messaging_service::controllers