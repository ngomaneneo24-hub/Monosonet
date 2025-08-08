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

file(GLOB MEDIA_SERVICE_SOURCES
	${CMAKE_CURRENT_SOURCE_DIR}/*.cpp
	${CMAKE_CURRENT_SOURCE_DIR}/controllers/*.cpp
	${CMAKE_CURRENT_SOURCE_DIR}/repositories/*.cpp
	${CMAKE_CURRENT_SOURCE_DIR}/processors/*.cpp
	${CMAKE_CURRENT_SOURCE_DIR}/storage/*.cpp
)

add_executable(media_service
	${MEDIA_SERVICE_SOURCES}
)

target_include_directories(media_service PRIVATE ${CMAKE_CURRENT_SOURCE_DIR})

# Link against proto lib and common libs
target_link_libraries(media_service PRIVATE sonet_proto)

if(OpenSSL_FOUND)
	target_link_libraries(media_service PRIVATE OpenSSL::Crypto OpenSSL::SSL)
endif()

install(TARGETS media_service RUNTIME DESTINATION bin)

