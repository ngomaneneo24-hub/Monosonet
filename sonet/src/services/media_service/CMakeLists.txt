##
# Copyright (c) 2025 Neo Qiss
# All rights reserved.
#
# This software is proprietary and confidential.
# Unauthorized copying, distribution, or use is strictly prohibited.
##

cmake_minimum_required(VERSION 3.20)

project(media_service LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

option(ENABLE_COVERAGE "Enable coverage flags" OFF)

if(ENABLE_COVERAGE AND CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
	message(STATUS "Coverage enabled for media_service")
	add_compile_options(--coverage -O0 -g)
	add_link_options(--coverage)
endif()

find_package(Threads REQUIRED)

file(GLOB MEDIA_SERVICE_ALL_SOURCES
	${CMAKE_CURRENT_SOURCE_DIR}/*.cpp
	${CMAKE_CURRENT_SOURCE_DIR}/controllers/*.cpp
	${CMAKE_CURRENT_SOURCE_DIR}/repositories/*.cpp
	${CMAKE_CURRENT_SOURCE_DIR}/processors/*.cpp
	${CMAKE_CURRENT_SOURCE_DIR}/storage/*.cpp
)

# Separate main for executable
set(MEDIA_SERVICE_MAIN ${CMAKE_CURRENT_SOURCE_DIR}/main.cpp)
list(REMOVE_ITEM MEDIA_SERVICE_ALL_SOURCES ${MEDIA_SERVICE_MAIN})

add_library(media_service_core STATIC ${MEDIA_SERVICE_ALL_SOURCES})
add_executable(media_service ${MEDIA_SERVICE_MAIN})
target_link_libraries(media_service PRIVATE media_service_core)

target_include_directories(media_service_core PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})
target_include_directories(media_service PRIVATE ${CMAKE_CURRENT_SOURCE_DIR})

# Generate gRPC/Protobuf sources for media service only
set(PROTO_DIR ${CMAKE_SOURCE_DIR}/proto)
set(MEDIA_PROTO ${PROTO_DIR}/services/media.proto)
set(GEN_DIR ${CMAKE_CURRENT_BINARY_DIR}/generated)
file(MAKE_DIRECTORY ${GEN_DIR})

find_program(PROTOC protoc)
find_program(GRPC_CPP_PLUGIN grpc_cpp_plugin)
if(PROTOC AND GRPC_CPP_PLUGIN)
	set(GEN_SRCS
		${GEN_DIR}/services/media.pb.cc
		${GEN_DIR}/services/media.grpc.pb.cc
	)
	set(GEN_HDRS
		${GEN_DIR}/services/media.pb.h
		${GEN_DIR}/services/media.grpc.pb.h
	)
	add_custom_command(
		OUTPUT ${GEN_SRCS} ${GEN_HDRS}
		COMMAND ${PROTOC}
		ARGS --grpc_out ${GEN_DIR}
			 --cpp_out ${GEN_DIR}
			 -I ${PROTO_DIR}
			 --plugin=protoc-gen-grpc=${GRPC_CPP_PLUGIN}
			 ${MEDIA_PROTO}
		DEPENDS ${MEDIA_PROTO}
		COMMENT "Generating gRPC sources for media.proto"
	)
	target_sources(media_service_core PRIVATE ${GEN_SRCS})
	target_include_directories(media_service_core PUBLIC ${GEN_DIR} ${PROTO_DIR})
else()
	message(WARNING "protoc or grpc_cpp_plugin not found; expecting pre-generated sources in include path.")
	target_include_directories(media_service PRIVATE ${PROTO_DIR})
endif()

# Link against proto lib and common libs
target_link_libraries(media_service_core PUBLIC sonet_proto)
target_link_libraries(media_service PRIVATE sonet_proto)

# Link protobuf/grpc
find_package(Protobuf)
if(Protobuf_FOUND)
	target_link_libraries(media_service_core PUBLIC protobuf::libprotobuf)
	target_link_libraries(media_service PRIVATE protobuf::libprotobuf)
endif()
find_library(GRPCPP_LIB grpc++)
find_library(GRPCPP_REFLECTION_LIB grpc++_reflection)
find_library(GPR_LIB gpr)
find_library(ABSL_SYNCHRONIZATION_LIB absl_synchronization)
find_library(ABSL_STRINGS_LIB absl_strings)
find_library(ABSL_STATUS_LIB absl_status)
foreach(lib IN ITEMS GRPCPP_LIB GRPCPP_REFLECTION_LIB GPR_LIB ABSL_SYNCHRONIZATION_LIB ABSL_STRINGS_LIB ABSL_STATUS_LIB)
	if(${lib})
		target_link_libraries(media_service_core PUBLIC ${${lib}})
		target_link_libraries(media_service PRIVATE ${${lib}})
	endif()
endforeach()

# libpqxx (optional)
find_package(PkgConfig)
pkg_check_modules(PQXX libpqxx)
if(PQXX_FOUND)
	target_include_directories(media_service_core PUBLIC ${PQXX_INCLUDE_DIRS})
	target_link_libraries(media_service_core PUBLIC ${PQXX_LIBRARIES})
endif()

# Optional AWS SDK for S3 (SDK migration)
find_package(AWSSDK COMPONENTS s3 core QUIET)
if(AWSSDK_FOUND)
	message(STATUS "AWS SDK found; enabling native S3 backend")
	target_link_libraries(media_service PRIVATE AWS::aws-sdk-cpp::s3 AWS::aws-sdk-cpp::core)
	target_compile_definitions(media_service PRIVATE USE_AWS_SDK_S3=1)
else()
	message(STATUS "AWS SDK not found; falling back to CLI S3 backend implementation")
endif()

# Threads
target_link_libraries(media_service_core PUBLIC Threads::Threads)
target_link_libraries(media_service PRIVATE Threads::Threads)

if(OpenSSL_FOUND)
	target_link_libraries(media_service_core PUBLIC OpenSSL::Crypto OpenSSL::SSL)
endif()

install(TARGETS media_service RUNTIME DESTINATION bin)

if(BUILD_TESTS)
	add_executable(media_service_unit_tests
		${CMAKE_CURRENT_SOURCE_DIR}/tests/media_service_unit_tests.cpp
		${CMAKE_CURRENT_SOURCE_DIR}/tests/upload_integration_test.cpp
	)
	target_include_directories(media_service_unit_tests PRIVATE ${CMAKE_CURRENT_SOURCE_DIR})
	target_link_libraries(media_service_unit_tests PRIVATE media_service_core)
	if(ENABLE_COVERAGE AND CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
		target_compile_options(media_service_unit_tests PRIVATE --coverage -O0 -g)
		target_link_options(media_service_unit_tests PRIVATE --coverage)
	endif()
	enable_testing()
	add_test(NAME media_service_unit_tests COMMAND media_service_unit_tests)
endif()

