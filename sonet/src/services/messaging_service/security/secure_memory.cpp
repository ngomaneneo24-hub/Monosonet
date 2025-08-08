#include "secure_memory.h"
#include <cstring>

namespace sonet::messaging_service::security {

void SecureMemory::wipe(void* data, std::size_t size) noexcept {
    if (data == nullptr || size == 0) return;
    std::memset(data, 0, size);
}

void SecureMemory::wipe(std::vector<unsigned char>& buffer) noexcept {
    if (!buffer.empty()) {
        std::memset(buffer.data(), 0, buffer.size());
        buffer.clear();
        buffer.shrink_to_fit();
    }
}

} // namespace sonet::messaging_service::security