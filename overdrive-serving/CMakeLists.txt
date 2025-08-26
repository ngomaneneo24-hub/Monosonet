cmake_minimum_required(VERSION 3.20)
project(overdrive-serving LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(overdrive-serving
	src/main.cpp
	src/server.cpp
)

target_include_directories(overdrive-serving PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/src ${CMAKE_CURRENT_SOURCE_DIR}/proto)

target_compile_features(overdrive-serving PRIVATE cxx_std_20)

# TODO: Generate protobuf/gRPC sources from proto/overdrive.proto and link deps
# TODO: Link gRPC, Protobuf, ONNX Runtime, FAISS when added