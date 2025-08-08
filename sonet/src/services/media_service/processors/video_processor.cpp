//
// Copyright (c) 2025 Neo Qiss
// All rights reserved.
//
// This software is proprietary and confidential.
// Unauthorized copying, distribution, or use is strictly prohibited.
//

// Video processor using ffmpeg to extract a thumbnail and probe basic info.

#include "../service.h"
#include <cstdlib>
#include <filesystem>

namespace fs = std::filesystem;
namespace sonet::media_service {

class FfmpegVideoProcessor final : public VideoProcessor {
public:
	bool Process(const std::string& path_in, std::string& path_out, std::string& thumb_out, double& duration, uint32_t& width, uint32_t& height) override {
		path_out = path_in; // keep original for now
		auto tpath = fs::path(path_in).parent_path() / (fs::path(path_in).filename().string() + ".thumb.jpg");
		// Grab a frame at 00:00:01 if possible
		std::string cmd = "ffmpeg -y -ss 00:00:01 -i '" + path_in + "' -frames:v 1 -q:v 5 '" + tpath.string() + "' >/dev/null 2>&1";
		int rc = std::system(cmd.c_str());
		if (rc != 0) { thumb_out = path_in; } else { thumb_out = tpath.string(); }
		// Optional: probe duration/dimensions with ffprobe
		duration = 0.0; width = 0; height = 0;
		return true;
	}
};

std::unique_ptr<VideoProcessor> CreateVideoProcessor() { return std::make_unique<FfmpegVideoProcessor>(); }

} // namespace sonet::media_service

