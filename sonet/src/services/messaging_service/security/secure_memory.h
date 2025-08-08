#pragma once
#include <cstddef>
#include <vector>

namespace sonet::messaging_service::security {

struct SecureMemory {
    static void wipe(void* data, std::size_t size) noexcept;
    static void wipe(std::vector<unsigned char>& buffer) noexcept;
};

} // namespace sonet::messaging_service::security