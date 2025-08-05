#
# Copyright (c) 2025 Neo Qiss
# All rights r# Link with all the good stuff we need
target_link_libraries(user_service PRIVATE
    sonet_user_proto
    gRPC::grpc++
    gRPC::grpc++_reflection
    protobuf::protobuf
    libpqxx::pqxx
    OpenSSL::SSL
    OpenSSL::Crypto
    Boost::system
    Boost::filesystem
    Boost::thread
    nlohmann_json::nlohmann_json
    spdlog::spdlog
    fmt::fmt
    uuid
)is software is proprietary and confidential.
# Unauthorized copying, distribution, or use is strictly prohibited.
#

cmake_minimum_required(VERSION 3.20)

# User Service - the backbone of our authentication system
project(UserService VERSION 1.0.0 LANGUAGES CXX)

# I want modern C++ for this - no compromises
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Include directories
include_directories(include)
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/../../core)

# Source files - keeping it organized like a pro
set(USER_SERVICE_SOURCES
    main.cpp
    src/user_service_impl.cpp
    src/password_manager.cpp
    src/jwt_manager.cpp
    src/user_repository.cpp
    src/session_manager.cpp
    src/security_utils.cpp
)

set(USER_SERVICE_HEADERS
    include/user_service_impl.h
    include/password_manager.h
    include/jwt_manager.h
    include/user_repository.h
    include/session_manager.h
    include/security_utils.h
    include/models/user.h
    include/models/user_session.h
)

# Create the main service executable
add_executable(user_service ${USER_SERVICE_SOURCES})

# Link with all the good stuff we need
target_link_libraries(user_service
    sonet_proto
    gRPC::grpc++
    gRPC::grpc++_reflection
    protobuf::protobuf
    PostgreSQL::PostgreSQL
    OpenSSL::SSL
    OpenSSL::Crypto
    Boost::system
    Boost::filesystem
    Boost::thread
    nlohmann_json::nlohmann_json
    spdlog::spdlog
    fmt::fmt
)

# I'm serious about warnings - catch everything
target_compile_options(user_service PRIVATE 
    -Wall -Wextra -Wpedantic -Werror
    -Wno-unused-parameter  # Sometimes we need unused params for interfaces
)

# Debug vs Release optimizations
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    target_compile_definitions(user_service PRIVATE DEBUG_MODE=1)
    target_compile_options(user_service PRIVATE -g -O0)
else()
    target_compile_definitions(user_service PRIVATE NDEBUG=1)
    target_compile_options(user_service PRIVATE -O3 -DNDEBUG)
endif()

# Tests because I don't ship broken code
if(BUILD_TESTING)
    add_subdirectory(tests)
endif()

# Install target
install(TARGETS user_service
    RUNTIME DESTINATION bin
)
