#
# Copyright (c) 2025 Neo Qiss
# All rights reserved.
# 
# This software is proprietary and confidential.
# Unauthorized copying, distribution, or use is strictly prohibited.
#

cmake_minimum_required(VERSION 3.20)

option(BUILD_OTHER_SERVICES "Build additional services besides media" OFF)

# Media service
add_subdirectory(media_service)

if(BUILD_OTHER_SERVICES)
	add_subdirectory(user_service)
	add_subdirectory(messaging_service)
endif()

# Timeline service
add_subdirectory(timeline_service)

# Add other services as they're implemented
