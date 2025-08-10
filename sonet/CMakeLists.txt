#
# Copyright (c) 2025 Neo Qiss
# All rights reserved.
# 
# This software is proprietary and confidential.
# Unauthorized copying, distribution, or use is strictly prohibited.
#

cmake_minimum_required(VERSION 3.20)
project(Sonet VERSION 1.0.0 LANGUAGES CXX)

# Set C++ standard
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Conan setup
list(APPEND CMAKE_MODULE_PATH ${CMAKE_BINARY_DIR})
list(APPEND CMAKE_PREFIX_PATH ${CMAKE_BINARY_DIR})
list(APPEND CMAKE_MODULE_PATH ${CMAKE_CURRENT_SOURCE_DIR}/cmake)

# Make Boost optional in this environment
find_package(Boost COMPONENTS system filesystem thread)
# Use protobuf; we'll locate gRPC plugin via find_program
find_package(OpenSSL)

# Proper gRPC and Protobuf configuration
# Try to find protobuf and gRPC, but don't fail if they're not available
find_package(Protobuf QUIET)
find_package(gRPC QUIET)

# Check if we have the required libraries
if(NOT Protobuf_FOUND OR NOT gRPC_FOUND)
    message(WARNING "Protobuf or gRPC not found. Building with stub implementations only.")
    message(WARNING "For full gRPC functionality, install: libprotobuf-dev protobuf-compiler libgrpc++-dev libgrpc-dev")
    
    # Set a flag to indicate we're using stubs
    set(USE_STUB_IMPLEMENTATIONS ON)
    
    # Create dummy targets for stubs
    add_library(protobuf::libprotobuf INTERFACE IMPORTED)
    add_library(gRPC::grpc++ INTERFACE IMPORTED)
    add_library(gRPC::grpc++_reflection INTERFACE IMPORTED)
    
    # Set include directories for stub headers
    set(Protobuf_INCLUDE_DIRS ${CMAKE_CURRENT_SOURCE_DIR}/proto)
    set(gRPC_INCLUDE_DIRS ${CMAKE_CURRENT_SOURCE_DIR}/proto)
else()
    set(USE_STUB_IMPLEMENTATIONS OFF)
    message(STATUS "Found Protobuf: ${Protobuf_VERSION}")
    message(STATUS "Found gRPC: ${gRPC_VERSION}")
endif()

option(BUILD_GLOBAL_PROTO "Generate all protos at top-level" OFF)
find_program(PROTOC protoc)
find_program(GRPC_CPP_PLUGIN grpc_cpp_plugin)

# Compiler flags
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall -Wextra -Wpedantic")
set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} -g -O0 -DDEBUG")
set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} -O3 -DNDEBUG")

# Include directories
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/src)
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/external)
if(Boost_FOUND)
    include_directories(${Boost_INCLUDE_DIRS})
endif()
if(OpenSSL_FOUND)
    include_directories(${OPENSSL_INCLUDE_DIR})
endif()

# Add gRPC and Protobuf include directories
if(Protobuf_FOUND AND gRPC_FOUND)
    include_directories(${Protobuf_INCLUDE_DIRS})
    include_directories(${gRPC_INCLUDE_DIRS})
else()
    # In stub mode, use our stub headers
    include_directories(${CMAKE_CURRENT_SOURCE_DIR}/proto)
    include_directories(${CMAKE_CURRENT_SOURCE_DIR}/nlohmann)
    message(STATUS "Using stub implementations - include paths set to proto and nlohmann directories")
endif()

if(BUILD_GLOBAL_PROTO)
    if(NOT PROTOC)
        message(FATAL_ERROR "protoc not found but BUILD_GLOBAL_PROTO=ON")
    endif()
    # Protocol Buffers
    set(PROTO_OUTPUT_DIR ${CMAKE_CURRENT_BINARY_DIR}/generated)
    file(MAKE_DIRECTORY ${PROTO_OUTPUT_DIR})

    function(compile_proto_file proto_file)
        get_filename_component(proto_name ${proto_file} NAME_WE)
        set(proto_srcs "${PROTO_OUTPUT_DIR}/${proto_name}.pb.cc")
        set(proto_hdrs "${PROTO_OUTPUT_DIR}/${proto_name}.pb.h")
        set(grpc_srcs "${PROTO_OUTPUT_DIR}/${proto_name}.grpc.pb.cc")
        set(grpc_hdrs "${PROTO_OUTPUT_DIR}/${proto_name}.grpc.pb.h")
        add_custom_command(
            OUTPUT "${proto_srcs}" "${proto_hdrs}" "${grpc_srcs}" "${grpc_hdrs}"
            COMMAND ${PROTOC}
            ARGS --grpc_out "${PROTO_OUTPUT_DIR}"
                 --cpp_out "${PROTO_OUTPUT_DIR}"
                 -I "${CMAKE_CURRENT_SOURCE_DIR}/proto"
                 --plugin=protoc-gen-grpc=${GRPC_CPP_PLUGIN}
                 "${proto_file}"
            DEPENDS "${proto_file}"
            COMMENT "Generating protocol buffer files for ${proto_file}"
        )
        set(PROTO_SRCS ${PROTO_SRCS} ${proto_srcs} ${grpc_srcs} PARENT_SCOPE)
        set(PROTO_HDRS ${PROTO_HDRS} ${proto_hdrs} ${grpc_hdrs} PARENT_SCOPE)
    endfunction()

    file(GLOB_RECURSE PROTO_FILES "${CMAKE_CURRENT_SOURCE_DIR}/proto/*.proto")
    foreach(proto_file ${PROTO_FILES})
        compile_proto_file(${proto_file})
    endforeach()

    add_library(sonet_proto ${PROTO_SRCS})
    if(Protobuf_FOUND AND gRPC_FOUND)
        target_link_libraries(sonet_proto 
            gRPC::grpc++ 
            gRPC::grpc++_reflection
            protobuf::libprotobuf
        )
    else()
        message(WARNING "Proto generation enabled but gRPC/Protobuf not found. Linking may fail.")
    endif()
    if(OpenSSL_FOUND)
        target_link_libraries(sonet_proto OpenSSL::Crypto OpenSSL::SSL)
    endif()
    target_include_directories(sonet_proto PUBLIC ${PROTO_OUTPUT_DIR})
else()
    # If not generating protos, assume include path is the source proto dir for service-local includes
    include_directories(${CMAKE_CURRENT_SOURCE_DIR}/proto)
    add_library(sonet_proto INTERFACE)
    
    if(Protobuf_FOUND AND gRPC_FOUND)
        target_link_libraries(sonet_proto INTERFACE 
            gRPC::grpc++ 
            gRPC::grpc++_reflection
            protobuf::libprotobuf
        )
    else()
        # In stub mode, just set include directories
        target_include_directories(sonet_proto INTERFACE 
            ${CMAKE_CURRENT_SOURCE_DIR}/proto
            ${CMAKE_CURRENT_SOURCE_DIR}/nlohmann
        )
        message(STATUS "sonet_proto target configured for stub mode")
    endif()
endif()

# Add subdirectories
# Temporarily disable proto generation due to plugin issues
# add_subdirectory(proto)
add_subdirectory(src/services)
add_subdirectory(src/gateway)
option(BUILD_EXTERNAL "Build external helper libs" OFF)
if(BUILD_EXTERNAL)
    add_subdirectory(external)
endif()

# Ensure all targets in stub mode have access to stub headers
if(USE_STUB_IMPLEMENTATIONS)
    # Set global include directories for all targets
    add_compile_options(-I${CMAKE_CURRENT_SOURCE_DIR}/proto -I${CMAKE_CURRENT_SOURCE_DIR}/nlohmann)
    
    # Also set them as system include directories to avoid warnings
    include_directories(SYSTEM ${CMAKE_CURRENT_SOURCE_DIR}/proto ${CMAKE_CURRENT_SOURCE_DIR}/nlohmann)
endif()

# Tests
option(BUILD_TESTS "Build test targets" OFF)
if(BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()

# Install configuration
install(TARGETS sonet_proto
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
    RUNTIME DESTINATION bin
)
