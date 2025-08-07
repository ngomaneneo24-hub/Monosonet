#
# Copyright (c) 2025 Neo Qiss
# 
# This file is part of Sonet - a social media platform built for real connections.
# 
# CMake configuration for the notification service.
# I designed this build system to handle all the dependencies and create
# a production-ready notification service binary.
#

cmake_minimum_required(VERSION 3.20)
project(sonet_notification_service VERSION 1.0.0 LANGUAGES CXX)

# Set C++ standard
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Compiler flags for performance and debugging
set(CMAKE_CXX_FLAGS_DEBUG "-g -O0 -Wall -Wextra -DDEBUG")
set(CMAKE_CXX_FLAGS_RELEASE "-O3 -DNDEBUG -march=native")
set(CMAKE_CXX_FLAGS_RELWITHDEBINFO "-O2 -g -DNDEBUG")

# Find required packages
find_package(Threads REQUIRED)
find_package(PkgConfig REQUIRED)

# Find PostgreSQL
find_package(PostgreSQL REQUIRED)

# Find Redis (hiredis)
pkg_check_modules(HIREDIS REQUIRED hiredis)

# Find libcurl for HTTP clients
find_package(CURL REQUIRED)

# Find OpenSSL for cryptography
find_package(OpenSSL REQUIRED)

# Find UUID library
pkg_check_modules(UUID REQUIRED uuid)

# Find gRPC and Protobuf
find_package(Protobuf REQUIRED)
find_package(gRPC REQUIRED)

# Find nlohmann/json
find_package(nlohmann_json REQUIRED)

# Find jwt-cpp
find_package(jwt-cpp REQUIRED)

# Find httplib (if not found, we'll use a fallback)
find_path(HTTPLIB_INCLUDE_DIR httplib.h)
if(NOT HTTPLIB_INCLUDE_DIR)
    message(WARNING "httplib not found, using bundled version")
    set(HTTPLIB_INCLUDE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/external/httplib")
endif()

# Find WebSocketPP
find_path(WEBSOCKETPP_INCLUDE_DIR websocketpp/config/asio_no_tls.hpp)
if(NOT WEBSOCKETPP_INCLUDE_DIR)
    message(WARNING "WebSocketPP not found, using bundled version")
    set(WEBSOCKETPP_INCLUDE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/external/websocketpp")
endif()

# Include directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/../../core
    ${CMAKE_CURRENT_SOURCE_DIR}/../../external
    ${HTTPLIB_INCLUDE_DIR}
    ${WEBSOCKETPP_INCLUDE_DIR}
    ${PostgreSQL_INCLUDE_DIRS}
    ${HIREDIS_INCLUDE_DIRS}
    ${UUID_INCLUDE_DIRS}
)

# Protocol buffer files
set(PROTO_FILES
    ${CMAKE_CURRENT_SOURCE_DIR}/../../../proto/services/notification.proto
    ${CMAKE_CURRENT_SOURCE_DIR}/../../../proto/common/common.proto
    ${CMAKE_CURRENT_SOURCE_DIR}/../../../proto/common/timestamp.proto
)

# Generate protobuf and gRPC files
set(PROTO_SRC_DIR ${CMAKE_CURRENT_BINARY_DIR}/proto)
file(MAKE_DIRECTORY ${PROTO_SRC_DIR})

foreach(PROTO_FILE ${PROTO_FILES})
    get_filename_component(PROTO_NAME ${PROTO_FILE} NAME_WE)
    get_filename_component(PROTO_DIR ${PROTO_FILE} DIRECTORY)
    
    set(PROTO_SRCS ${PROTO_SRC_DIR}/${PROTO_NAME}.pb.cc)
    set(PROTO_HDRS ${PROTO_SRC_DIR}/${PROTO_NAME}.pb.h)
    set(GRPC_SRCS ${PROTO_SRC_DIR}/${PROTO_NAME}.grpc.pb.cc)
    set(GRPC_HDRS ${PROTO_SRC_DIR}/${PROTO_NAME}.grpc.pb.h)
    
    add_custom_command(
        OUTPUT ${PROTO_SRCS} ${PROTO_HDRS} ${GRPC_SRCS} ${GRPC_HDRS}
        COMMAND protobuf::protoc
        ARGS --grpc_out ${PROTO_SRC_DIR}
             --cpp_out ${PROTO_SRC_DIR}
             --plugin=protoc-gen-grpc=$<TARGET_FILE:gRPC::grpc_cpp_plugin>
             -I ${PROTO_DIR}
             ${PROTO_FILE}
        DEPENDS ${PROTO_FILE}
        COMMENT "Generating protobuf and gRPC files for ${PROTO_NAME}"
    )
    
    list(APPEND ALL_PROTO_SRCS ${PROTO_SRCS} ${GRPC_SRCS})
    list(APPEND ALL_PROTO_HDRS ${PROTO_HDRS} ${GRPC_HDRS})
endforeach()

# Source files for models
set(MODEL_SOURCES
    models/notification.cpp
    models/notification_template.cpp
    models/delivery_status.cpp
)

# Source files for repositories  
set(REPOSITORY_SOURCES
    repositories/notification_repository.cpp
)

# Source files for processors
set(PROCESSOR_SOURCES
    processors/notification_processor.cpp
)

# Source files for channels
set(CHANNEL_SOURCES
    channels/email_channel.cpp
    channels/push_channel.cpp
    channels/websocket_channel.cpp
)

# Source files for controllers
set(CONTROLLER_SOURCES
    controllers/notification_controller.cpp
)

# Main service files
set(SERVICE_SOURCES
    service.cpp
    main.cpp
)

# All source files
set(ALL_SOURCES
    ${MODEL_SOURCES}
    ${REPOSITORY_SOURCES}
    ${PROCESSOR_SOURCES}
    ${CHANNEL_SOURCES}
    ${CONTROLLER_SOURCES}
    ${SERVICE_SOURCES}
    ${ALL_PROTO_SRCS}
)

# Create the notification service executable
add_executable(sonet_notification_service ${ALL_SOURCES})

# Set target properties
set_target_properties(sonet_notification_service PROPERTIES
    OUTPUT_NAME "sonet-notification-service"
    RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin
)

# Link libraries
target_link_libraries(sonet_notification_service
    # Standard libraries
    Threads::Threads
    
    # Database libraries
    ${PostgreSQL_LIBRARIES}
    ${HIREDIS_LIBRARIES}
    
    # HTTP and networking
    CURL::libcurl
    OpenSSL::SSL
    OpenSSL::Crypto
    
    # System libraries
    ${UUID_LIBRARIES}
    
    # gRPC and Protobuf
    gRPC::grpc++
    gRPC::grpc++_reflection
    protobuf::libprotobuf
    
    # JSON library
    nlohmann_json::nlohmann_json
    
    # JWT library
    jwt-cpp::jwt-cpp
)

# Compiler definitions
target_compile_definitions(sonet_notification_service PRIVATE
    SONET_VERSION_MAJOR=${PROJECT_VERSION_MAJOR}
    SONET_VERSION_MINOR=${PROJECT_VERSION_MINOR}
    SONET_VERSION_PATCH=${PROJECT_VERSION_PATCH}
    SONET_VERSION_STRING="${PROJECT_VERSION}"
)

# Include proto headers
target_include_directories(sonet_notification_service PRIVATE ${PROTO_SRC_DIR})

# Platform-specific libraries
if(WIN32)
    target_link_libraries(sonet_notification_service ws2_32 wsock32)
elseif(UNIX AND NOT APPLE)
    target_link_libraries(sonet_notification_service dl rt)
endif()

# Installation rules
install(TARGETS sonet_notification_service
    RUNTIME DESTINATION bin
    COMPONENT notification_service
)

# Install configuration files
install(FILES
    ${CMAKE_CURRENT_SOURCE_DIR}/../../../config/development/services.json
    ${CMAKE_CURRENT_SOURCE_DIR}/../../../config/production/services.json
    DESTINATION etc/sonet
    COMPONENT notification_service
)

# Install systemd service file (Linux only)
if(UNIX AND NOT APPLE)
    install(FILES
        ${CMAKE_CURRENT_SOURCE_DIR}/deployment/sonet-notification-service.service
        DESTINATION lib/systemd/system
        COMPONENT notification_service
        OPTIONAL
    )
endif()

# Development and testing targets
if(CMAKE_BUILD_TYPE STREQUAL "Debug" OR CMAKE_BUILD_TYPE STREQUAL "RelWithDebInfo")
    # Add debug symbols
    target_compile_options(sonet_notification_service PRIVATE -g)
    
    # Enable sanitizers for debugging
    option(ENABLE_SANITIZERS "Enable AddressSanitizer and UBSan" OFF)
    if(ENABLE_SANITIZERS)
        target_compile_options(sonet_notification_service PRIVATE
            -fsanitize=address,undefined
            -fno-omit-frame-pointer
        )
        target_link_options(sonet_notification_service PRIVATE
            -fsanitize=address,undefined
        )
    endif()
endif()

# Performance profiling support
option(ENABLE_PROFILING "Enable performance profiling" OFF)
if(ENABLE_PROFILING)
    target_compile_options(sonet_notification_service PRIVATE -pg)
    target_link_options(sonet_notification_service PRIVATE -pg)
endif()

# Static analysis support
option(ENABLE_STATIC_ANALYSIS "Enable static analysis with clang-tidy" OFF)
if(ENABLE_STATIC_ANALYSIS)
    find_program(CLANG_TIDY_EXE NAMES "clang-tidy")
    if(CLANG_TIDY_EXE)
        set_target_properties(sonet_notification_service PROPERTIES
            CXX_CLANG_TIDY "${CLANG_TIDY_EXE};-checks=*,-readability-*"
        )
    endif()
endif()

# Docker support
add_custom_target(docker-build
    COMMAND docker build -t sonet/notification-service:${PROJECT_VERSION} .
    WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
    COMMENT "Building Docker image for notification service"
)

add_custom_target(docker-run
    COMMAND docker run --rm -p 8080:8080 -p 8081:8081 -p 50051:50051 sonet/notification-service:${PROJECT_VERSION}
    DEPENDS docker-build
    COMMENT "Running notification service in Docker container"
)

# Package configuration
set(CPACK_PACKAGE_NAME "sonet-notification-service")
set(CPACK_PACKAGE_VERSION ${PROJECT_VERSION})
set(CPACK_PACKAGE_DESCRIPTION_SUMMARY "Sonet Notification Service")
set(CPACK_PACKAGE_DESCRIPTION "Real-time notification delivery service for Sonet social media platform")
set(CPACK_PACKAGE_VENDOR "Neo Qiss")
set(CPACK_PACKAGE_CONTACT "notifications@sonet.app")

# Debian package configuration
set(CPACK_DEBIAN_PACKAGE_DEPENDS "libcurl4, libpq5, libhiredis0.14, libuuid1, libssl3")
set(CPACK_DEBIAN_PACKAGE_SECTION "web")
set(CPACK_DEBIAN_PACKAGE_PRIORITY "optional")

# RPM package configuration  
set(CPACK_RPM_PACKAGE_REQUIRES "libcurl, postgresql-libs, hiredis, libuuid, openssl-libs")
set(CPACK_RPM_PACKAGE_GROUP "Applications/Internet")

include(CPack)

# Print build information
message(STATUS "")
message(STATUS "Sonet Notification Service Build Configuration:")
message(STATUS "  Version: ${PROJECT_VERSION}")
message(STATUS "  Build Type: ${CMAKE_BUILD_TYPE}")
message(STATUS "  C++ Standard: ${CMAKE_CXX_STANDARD}")
message(STATUS "  Compiler: ${CMAKE_CXX_COMPILER_ID} ${CMAKE_CXX_COMPILER_VERSION}")
message(STATUS "  Install Prefix: ${CMAKE_INSTALL_PREFIX}")
message(STATUS "")
message(STATUS "Features:")
message(STATUS "  Sanitizers: ${ENABLE_SANITIZERS}")
message(STATUS "  Profiling: ${ENABLE_PROFILING}")
message(STATUS "  Static Analysis: ${ENABLE_STATIC_ANALYSIS}")
message(STATUS "")
message(STATUS "Dependencies:")
message(STATUS "  PostgreSQL: ${PostgreSQL_VERSION_STRING}")
message(STATUS "  Redis (hiredis): Found")
message(STATUS "  gRPC: Found")
message(STATUS "  Protobuf: ${Protobuf_VERSION}")
message(STATUS "  nlohmann/json: Found")
message(STATUS "  jwt-cpp: Found")
message(STATUS "  httplib: ${HTTPLIB_INCLUDE_DIR}")
message(STATUS "  WebSocketPP: ${WEBSOCKETPP_INCLUDE_DIR}")
message(STATUS "")