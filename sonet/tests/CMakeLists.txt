cmake_minimum_required(VERSION 3.20)

# Test configuration
enable_testing()

# Find test dependencies
find_package(GTest REQUIRED)

# Include test directories
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/../src)
include_directories(${CMAKE_CURRENT_SOURCE_DIR})

# Test main executable
add_executable(test_main test_main.cpp)
target_link_libraries(test_main 
    GTest::gtest 
    GTest::gtest_main
    sonet_proto
)

# Add test subdirectories
add_subdirectory(unit)
add_subdirectory(integration)

# Register tests with CTest
add_test(NAME unit_tests COMMAND test_main)

# Test coverage (optional)
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    target_compile_options(test_main PRIVATE --coverage)
    target_link_options(test_main PRIVATE --coverage)
endif()
