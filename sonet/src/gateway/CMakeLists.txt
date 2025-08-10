cmake_minimum_required(VERSION 3.20)

project(sonet_gateway LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(nlohmann_json QUIET)
find_package(Boost COMPONENTS system filesystem thread QUIET)

add_library(sonet_gateway_lib
	gateway.cpp
	controllers/api_controller.cpp
	middleware/auth_middleware.cpp
	middleware/cors_middleware.cpp
	middleware/logging_middleware.cpp
	auth/jwt_handler.cpp
	rate_limiting/rate_limiter.cpp
	rate_limiting/token_bucket.cpp
)

target_include_directories(sonet_gateway_lib PUBLIC ${CMAKE_CURRENT_SOURCE_DIR} ${CMAKE_BINARY_DIR})
target_link_libraries(sonet_gateway_lib PUBLIC sonet_proto)
if (nlohmann_json_FOUND)
	target_link_libraries(sonet_gateway_lib PUBLIC nlohmann_json::nlohmann_json)
endif()
if (Boost_FOUND)
	target_link_libraries(sonet_gateway_lib PUBLIC Boost::system Boost::filesystem Boost::thread)
endif()

add_executable(sonet_gateway main.cpp)
target_link_libraries(sonet_gateway PRIVATE sonet_gateway_lib)
target_include_directories(sonet_gateway PRIVATE ${CMAKE_BINARY_DIR})

install(TARGETS sonet_gateway RUNTIME DESTINATION bin)
