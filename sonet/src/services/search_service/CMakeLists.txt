# CMakeLists.txt for Sonet Search Service
# Copyright (c) 2025 Neo Qiss
#
# This builds a Twitter-scale search service with real-time indexing,
# advanced analytics, and high-performance search capabilities.

cmake_minimum_required(VERSION 3.20)

project(sonet_search_service
    VERSION 1.0.0
    DESCRIPTION "Sonet Twitter-Scale Search Service"
    LANGUAGES CXX
)

# Set C++ standard
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Build type
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif()

# Compiler flags
set(CMAKE_CXX_FLAGS_DEBUG "-g -O0 -DDEBUG -Wall -Wextra -Wpedantic")
set(CMAKE_CXX_FLAGS_RELEASE "-O3 -DNDEBUG -march=native -mtune=native")
set(CMAKE_CXX_FLAGS_RELWITHDEBINFO "-O2 -g -DNDEBUG")

# Enable position independent code
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# Find required packages
find_package(PkgConfig REQUIRED)

# Core dependencies
find_package(Threads REQUIRED)
find_package(OpenSSL REQUIRED)

# JSON library
find_package(nlohmann_json REQUIRED)
if(NOT nlohmann_json_FOUND)
    message(STATUS "nlohmann_json not found, using FetchContent")
    include(FetchContent)
    FetchContent_Declare(
        nlohmann_json
        GIT_REPOSITORY https://github.com/nlohmann/json.git
        GIT_TAG v3.11.3
    )
    FetchContent_MakeAvailable(nlohmann_json)
endif()

# cURL for HTTP requests
find_package(CURL REQUIRED)

# Elasticsearch C++ client
find_path(ELASTICSEARCH_INCLUDE_DIR
    NAMES elasticsearch/client.hpp
    PATHS /usr/include /usr/local/include
)

find_library(ELASTICSEARCH_LIBRARY
    NAMES elasticsearch_client
    PATHS /usr/lib /usr/local/lib
)

if(ELASTICSEARCH_INCLUDE_DIR AND ELASTICSEARCH_LIBRARY)
    set(ELASTICSEARCH_FOUND TRUE)
    message(STATUS "Found Elasticsearch C++ client")
else()
    message(WARNING "Elasticsearch C++ client not found, search functionality will be limited")
    set(ELASTICSEARCH_FOUND FALSE)
endif()

# gRPC and Protocol Buffers
find_package(Protobuf REQUIRED)
find_package(gRPC REQUIRED)

# Redis C++ client (for caching and message queues)
find_path(REDIS_INCLUDE_DIR
    NAMES sw/redis++/redis++.h
    PATHS /usr/include /usr/local/include
)

find_library(REDIS_LIBRARY
    NAMES redis++
    PATHS /usr/lib /usr/local/lib
)

if(REDIS_INCLUDE_DIR AND REDIS_LIBRARY)
    set(REDIS_FOUND TRUE)
    message(STATUS "Found Redis C++ client")
else()
    message(WARNING "Redis C++ client not found, caching will be limited")
    set(REDIS_FOUND FALSE)
endif()

# MongoDB C++ driver (for configuration and metadata)
find_path(MONGOCXX_INCLUDE_DIR
    NAMES mongocxx/client.hpp
    PATHS /usr/include /usr/local/include
)

find_library(MONGOCXX_LIBRARY
    NAMES mongocxx
    PATHS /usr/lib /usr/local/lib
)

if(MONGOCXX_INCLUDE_DIR AND MONGOCXX_LIBRARY)
    set(MONGOCXX_FOUND TRUE)
    message(STATUS "Found MongoDB C++ driver")
else()
    message(WARNING "MongoDB C++ driver not found, some features will be limited")
    set(MONGOCXX_FOUND FALSE)
endif()

# HTTP server library (mongoose)
find_path(MONGOOSE_INCLUDE_DIR
    NAMES mongoose.h
    PATHS /usr/include /usr/local/include
)

find_library(MONGOOSE_LIBRARY
    NAMES mongoose
    PATHS /usr/lib /usr/local/lib
)

if(NOT MONGOOSE_INCLUDE_DIR OR NOT MONGOOSE_LIBRARY)
    message(STATUS "Mongoose not found, using embedded version")
    # We'll include a header-only HTTP server implementation
endif()

# Language detection library
find_path(CPPJIEBA_INCLUDE_DIR
    NAMES cppjieba/Jieba.hpp
    PATHS /usr/include /usr/local/include
)

if(CPPJIEBA_INCLUDE_DIR)
    set(CPPJIEBA_FOUND TRUE)
    message(STATUS "Found cppjieba for text processing")
else()
    message(STATUS "cppjieba not found, using basic text processing")
    set(CPPJIEBA_FOUND FALSE)
endif()

# Core source files
set(SEARCH_SERVICE_SOURCES
    # Models
    models/search_query.cpp
    models/search_result.cpp
    
    # Engines
    engines/elasticsearch_engine.cpp
    
    # Indexers
    indexers/note_indexer.cpp
    indexers/user_indexer.cpp
    
    # Controllers
    controllers/search_controller.cpp
    
    # Service orchestration
    service.cpp
    
    # Main entry point
    main.cpp
)

# Create the main executable
add_executable(sonet_search_service ${SEARCH_SERVICE_SOURCES})

# Set target properties
set_target_properties(sonet_search_service PROPERTIES
    OUTPUT_NAME "sonet-search-service"
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin"
)

# Include directories
target_include_directories(sonet_search_service PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/../../core
    ${ELASTICSEARCH_INCLUDE_DIR}
    ${REDIS_INCLUDE_DIR}
    ${MONGOCXX_INCLUDE_DIR}
    ${MONGOOSE_INCLUDE_DIR}
    ${CPPJIEBA_INCLUDE_DIR}
)

# Link libraries
target_link_libraries(sonet_search_service PRIVATE
    # Core dependencies
    Threads::Threads
    OpenSSL::SSL
    OpenSSL::Crypto
    nlohmann_json::nlohmann_json
    CURL::libcurl
    
    # gRPC and Protobuf
    gRPC::grpc++
    protobuf::libprotobuf
    
    # Standard libraries
    stdc++fs  # For filesystem operations
)

# Conditional libraries
if(ELASTICSEARCH_FOUND)
    target_link_libraries(sonet_search_service PRIVATE ${ELASTICSEARCH_LIBRARY})
    target_compile_definitions(sonet_search_service PRIVATE HAVE_ELASTICSEARCH)
endif()

if(REDIS_FOUND)
    target_link_libraries(sonet_search_service PRIVATE ${REDIS_LIBRARY})
    target_compile_definitions(sonet_search_service PRIVATE HAVE_REDIS)
endif()

if(MONGOCXX_FOUND)
    target_link_libraries(sonet_search_service PRIVATE ${MONGOCXX_LIBRARY})
    target_compile_definitions(sonet_search_service PRIVATE HAVE_MONGOCXX)
endif()

if(MONGOOSE_LIBRARY)
    target_link_libraries(sonet_search_service PRIVATE ${MONGOOSE_LIBRARY})
    target_compile_definitions(sonet_search_service PRIVATE HAVE_MONGOOSE)
endif()

if(CPPJIEBA_FOUND)
    target_compile_definitions(sonet_search_service PRIVATE HAVE_CPPJIEBA)
endif()

# Compiler-specific options
if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    target_compile_options(sonet_search_service PRIVATE
        -Wall -Wextra -Wpedantic
        -Wno-unused-parameter
        -Wno-missing-field-initializers
    )
    
    if(CMAKE_BUILD_TYPE STREQUAL "Release")
        target_compile_options(sonet_search_service PRIVATE
            -O3 -march=native -mtune=native
            -flto  # Link-time optimization
        )
        target_link_options(sonet_search_service PRIVATE -flto)
    endif()
endif()

# Platform-specific settings
if(UNIX AND NOT APPLE)
    # Linux-specific settings
    target_link_libraries(sonet_search_service PRIVATE rt dl)
elseif(APPLE)
    # macOS-specific settings
    target_link_libraries(sonet_search_service PRIVATE "-framework CoreFoundation")
elseif(WIN32)
    # Windows-specific settings
    target_link_libraries(sonet_search_service PRIVATE ws2_32 wsock32)
endif()

# Protocol buffer generation
set(PROTO_FILES
    ../../proto/services/search.proto
    ../../proto/common/common.proto
    ../../proto/common/pagination.proto
)

# Generate protobuf and gRPC files
foreach(PROTO_FILE ${PROTO_FILES})
    get_filename_component(PROTO_NAME ${PROTO_FILE} NAME_WE)
    get_filename_component(PROTO_DIR ${PROTO_FILE} DIRECTORY)
    
    set(PROTO_SRCS "${CMAKE_CURRENT_BINARY_DIR}/${PROTO_NAME}.pb.cc")
    set(PROTO_HDRS "${CMAKE_CURRENT_BINARY_DIR}/${PROTO_NAME}.pb.h")
    set(GRPC_SRCS "${CMAKE_CURRENT_BINARY_DIR}/${PROTO_NAME}.grpc.pb.cc")
    set(GRPC_HDRS "${CMAKE_CURRENT_BINARY_DIR}/${PROTO_NAME}.grpc.pb.h")
    
    add_custom_command(
        OUTPUT ${PROTO_SRCS} ${PROTO_HDRS} ${GRPC_SRCS} ${GRPC_HDRS}
        COMMAND protobuf::protoc
        ARGS --grpc_out "${CMAKE_CURRENT_BINARY_DIR}"
             --cpp_out "${CMAKE_CURRENT_BINARY_DIR}"
             -I "${CMAKE_CURRENT_SOURCE_DIR}/${PROTO_DIR}"
             --plugin=protoc-gen-grpc=$<TARGET_FILE:gRPC::grpc_cpp_plugin>
             "${CMAKE_CURRENT_SOURCE_DIR}/${PROTO_FILE}"
        DEPENDS ${PROTO_FILE}
        COMMENT "Generating protocol buffer files for ${PROTO_NAME}"
    )
    
    target_sources(sonet_search_service PRIVATE ${PROTO_SRCS} ${GRPC_SRCS})
endforeach()

# Include generated protobuf headers
target_include_directories(sonet_search_service PRIVATE ${CMAKE_CURRENT_BINARY_DIR})

# Testing support
option(BUILD_TESTS "Build unit tests" ON)

if(BUILD_TESTS)
    enable_testing()
    
    # Find Google Test
    find_package(GTest QUIET)
    
    if(NOT GTest_FOUND)
        include(FetchContent)
        FetchContent_Declare(
            googletest
            GIT_REPOSITORY https://github.com/google/googletest.git
            GIT_TAG v1.14.0
        )
        FetchContent_MakeAvailable(googletest)
    endif()
    
    # Test sources
    set(TEST_SOURCES
        tests/test_search_query.cpp
        tests/test_search_result.cpp
        tests/test_elasticsearch_engine.cpp
        tests/test_note_indexer.cpp
        tests/test_user_indexer.cpp
        tests/test_search_controller.cpp
        tests/test_search_service.cpp
        tests/test_integration.cpp
    )
    
    # Create test executable
    add_executable(search_service_tests ${TEST_SOURCES})
    
    # Link test libraries
    target_link_libraries(search_service_tests PRIVATE
        gtest gtest_main
        gmock gmock_main
        # Same libraries as main executable (except main.cpp)
        Threads::Threads
        OpenSSL::SSL
        OpenSSL::Crypto
        nlohmann_json::nlohmann_json
        CURL::libcurl
        gRPC::grpc++
        protobuf::libprotobuf
    )
    
    # Include same directories as main executable
    target_include_directories(search_service_tests PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}
        ${CMAKE_CURRENT_SOURCE_DIR}/../../core
        ${CMAKE_CURRENT_BINARY_DIR}
        ${ELASTICSEARCH_INCLUDE_DIR}
        ${REDIS_INCLUDE_DIR}
        ${MONGOCXX_INCLUDE_DIR}
    )
    
    # Add conditional libraries for tests
    if(ELASTICSEARCH_FOUND)
        target_link_libraries(search_service_tests PRIVATE ${ELASTICSEARCH_LIBRARY})
        target_compile_definitions(search_service_tests PRIVATE HAVE_ELASTICSEARCH)
    endif()
    
    if(REDIS_FOUND)
        target_link_libraries(search_service_tests PRIVATE ${REDIS_LIBRARY})
        target_compile_definitions(search_service_tests PRIVATE HAVE_REDIS)
    endif()
    
    # Register tests
    add_test(NAME search_service_unit_tests COMMAND search_service_tests)
    
    # Set test properties
    set_target_properties(search_service_tests PROPERTIES
        RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/tests"
    )
endif()

# Benchmarking support
option(BUILD_BENCHMARKS "Build performance benchmarks" OFF)

if(BUILD_BENCHMARKS)
    # Find Google Benchmark
    find_package(benchmark QUIET)
    
    if(NOT benchmark_FOUND)
        include(FetchContent)
        FetchContent_Declare(
            googlebenchmark
            GIT_REPOSITORY https://github.com/google/benchmark.git
            GIT_TAG v1.8.3
        )
        FetchContent_MakeAvailable(googlebenchmark)
    endif()
    
    # Benchmark sources
    set(BENCHMARK_SOURCES
        benchmarks/benchmark_search_query.cpp
        benchmarks/benchmark_elasticsearch.cpp
        benchmarks/benchmark_indexing.cpp
        benchmarks/benchmark_end_to_end.cpp
    )
    
    # Create benchmark executable
    add_executable(search_service_benchmarks ${BENCHMARK_SOURCES})
    
    # Link benchmark libraries
    target_link_libraries(search_service_benchmarks PRIVATE
        benchmark::benchmark
        benchmark::benchmark_main
        # Same libraries as main executable
        Threads::Threads
        OpenSSL::SSL
        OpenSSL::Crypto
        nlohmann_json::nlohmann_json
        CURL::libcurl
        gRPC::grpc++
        protobuf::libprotobuf
    )
    
    # Include same directories
    target_include_directories(search_service_benchmarks PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}
        ${CMAKE_CURRENT_SOURCE_DIR}/../../core
        ${CMAKE_CURRENT_BINARY_DIR}
        ${ELASTICSEARCH_INCLUDE_DIR}
        ${REDIS_INCLUDE_DIR}
    )
    
    set_target_properties(search_service_benchmarks PROPERTIES
        RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/benchmarks"
    )
endif()

# Installation rules
install(TARGETS sonet_search_service
    RUNTIME DESTINATION bin
    COMPONENT Runtime
)

# Install configuration files
install(FILES
    config/production.json
    config/development.json
    config/testing.json
    DESTINATION etc/sonet/search-service
    COMPONENT Configuration
)

# Install systemd service file
if(UNIX AND NOT APPLE)
    install(FILES
        deployment/systemd/sonet-search-service.service
        DESTINATION lib/systemd/system
        COMPONENT Runtime
    )
endif()

# Install Docker files
install(FILES
    deployment/docker/Dockerfile
    deployment/docker/docker-compose.yml
    DESTINATION share/sonet/search-service/docker
    COMPONENT Docker
)

# Install Kubernetes manifests
install(DIRECTORY deployment/kubernetes/
    DESTINATION share/sonet/search-service/kubernetes
    COMPONENT Kubernetes
)

# CPack configuration for packaging
set(CPACK_PACKAGE_NAME "sonet-search-service")
set(CPACK_PACKAGE_VERSION ${PROJECT_VERSION})
set(CPACK_PACKAGE_DESCRIPTION "Sonet Twitter-Scale Search Service")
set(CPACK_PACKAGE_CONTACT "Neo Qiss <neo@sonet.dev>")
set(CPACK_PACKAGE_VENDOR "Sonet")

# Platform-specific packaging
if(UNIX AND NOT APPLE)
    set(CPACK_GENERATOR "DEB;RPM;TGZ")
    set(CPACK_DEBIAN_PACKAGE_DEPENDS "libcurl4, libssl3, libstdc++6")
    set(CPACK_RPM_PACKAGE_REQUIRES "libcurl, openssl-libs, libstdc++")
elseif(APPLE)
    set(CPACK_GENERATOR "TGZ;ZIP")
elseif(WIN32)
    set(CPACK_GENERATOR "ZIP;NSIS")
endif()

include(CPack)

# Print build configuration summary
message(STATUS "")
message(STATUS "==== Sonet Search Service Build Configuration ====")
message(STATUS "Build Type:              ${CMAKE_BUILD_TYPE}")
message(STATUS "C++ Standard:            ${CMAKE_CXX_STANDARD}")
message(STATUS "Install Prefix:          ${CMAKE_INSTALL_PREFIX}")
message(STATUS "")
message(STATUS "Optional Dependencies:")
message(STATUS "  Elasticsearch:         ${ELASTICSEARCH_FOUND}")
message(STATUS "  Redis:                 ${REDIS_FOUND}")
message(STATUS "  MongoDB:               ${MONGOCXX_FOUND}")
message(STATUS "  cppjieba:              ${CPPJIEBA_FOUND}")
message(STATUS "")
message(STATUS "Build Options:")
message(STATUS "  Build Tests:           ${BUILD_TESTS}")
message(STATUS "  Build Benchmarks:      ${BUILD_BENCHMARKS}")
message(STATUS "")
message(STATUS "Compiler:")
message(STATUS "  ID:                    ${CMAKE_CXX_COMPILER_ID}")
message(STATUS "  Version:               ${CMAKE_CXX_COMPILER_VERSION}")
message(STATUS "  Path:                  ${CMAKE_CXX_COMPILER}")
message(STATUS "")
message(STATUS "==================================================")