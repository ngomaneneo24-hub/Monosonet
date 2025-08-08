//
// Copyright (c) 2025 Neo Qiss
// All rights reserved.
//
// This software is proprietary and confidential.
// Unauthorized copying, distribution, or use is strictly prohibited.
//

#include "service.h"

#include <grpcpp/grpcpp.h>
#include <iostream>

using grpc::Server;
using grpc::ServerBuilder;

int main(int argc, char** argv) {
	// Natural comments: tune via env/flags later; good defaults for dev
	std::string listen_addr = "0.0.0.0:50053"; // avoid clashing with other services
	std::string local_store_dir = "/tmp/sonet-media";
	std::string local_base_url = "file:///tmp/sonet-media"; // placeholder URL scheme
	uint64_t max_upload = 200ULL * 1024ULL * 1024ULL; // 200MB

	auto repo = std::shared_ptr<sonet::media_service::MediaRepository>(sonet::media_service::CreateInMemoryRepo().release());
	auto storage = std::shared_ptr<sonet::media_service::StorageBackend>(sonet::media_service::CreateLocalStorage(local_store_dir, local_base_url).release());
	auto img = std::shared_ptr<sonet::media_service::ImageProcessor>(sonet::media_service::CreateImageProcessor().release());
	auto vid = std::shared_ptr<sonet::media_service::VideoProcessor>(sonet::media_service::CreateVideoProcessor().release());
	auto gif = std::shared_ptr<sonet::media_service::GifProcessor>(sonet::media_service::CreateGifProcessor().release());

	sonet::media_service::MediaServiceImpl service(repo, storage, img, vid, gif, max_upload);

	ServerBuilder builder;
	builder.AddListeningPort(listen_addr, grpc::InsecureServerCredentials());
	builder.RegisterService(&service);
	std::unique_ptr<Server> server(builder.BuildAndStart());
	std::cout << "Media service listening on " << listen_addr << std::endl;
	server->Wait();
	return 0;
}

