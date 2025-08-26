#include "server.h"
#include <iostream>

namespace overdrive {

OverdriveServer::OverdriveServer(const ServerConfig& config) : config_(config) {}
OverdriveServer::~OverdriveServer() { Stop(); }

bool OverdriveServer::Start() {
	if (running_) return true;
	std::cout << "Overdrive gRPC server starting at " << config_.address << std::endl;
	// TODO: initialize gRPC service and bind OverdriveRanker implementation
	running_ = true;
	return true;
}

void OverdriveServer::Stop() {
	if (!running_) return;
	std::cout << "Overdrive gRPC server stopping" << std::endl;
	// TODO: shutdown gRPC server
	running_ = false;
}

} // namespace overdrive