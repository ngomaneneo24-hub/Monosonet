# Timeline Service CMakeLists.txt (Simplified)
cmake_minimum_required(VERSION 3.22)

# Define the timeline service library
add_library(timeline_service STATIC
    service.cpp
    ranking_engine.cpp
    cache.cpp
    content_filter.cpp
    realtime_notifier.cpp
    content_adapters.cpp
    controllers/timeline_controller.cpp
    rankers/chronological_ranking_engine.cpp
)

# Set include directories
target_include_directories(timeline_service PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/controllers
    ${CMAKE_SOURCE_DIR}/proto
    ${CMAKE_SOURCE_DIR}/proto/services
    ${CMAKE_SOURCE_DIR}/proto/common
)

# Link required libraries (simplified for testing)
find_package(Threads REQUIRED)
target_link_libraries(timeline_service PUBLIC
    Threads::Threads
)

# Set C++ standard
set_target_properties(timeline_service PROPERTIES
    CXX_STANDARD 17
    CXX_STANDARD_REQUIRED ON
)

# Add timeline service executable for standalone testing
add_executable(timeline_service_main
    main.cpp
)

target_link_libraries(timeline_service_main
    timeline_service
    Threads::Threads
)

# Set properties for the executable
set_target_properties(timeline_service_main PROPERTIES
    CXX_STANDARD 17
    CXX_STANDARD_REQUIRED ON
    OUTPUT_NAME timeline_service
)

# Install targets
install(TARGETS timeline_service
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
    PUBLIC_HEADER DESTINATION include
)

install(TARGETS timeline_service_main
    RUNTIME DESTINATION bin
)

# Install headers
install(FILES
    service.h
    implementations.h
    controllers/timeline_controller.h
    DESTINATION include/sonet/timeline
)

message(STATUS "Timeline service configured successfully (simplified build)")
