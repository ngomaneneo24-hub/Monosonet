//
// Copyright (c) 2025 Neo Qiss
// All rights reserved.
//
// This software is proprietary and confidential.
// Unauthorized copying, distribution, or use is strictly prohibited.
//

// Realistic image processor using ImageMagick 'convert' to create a thumbnail.
// For simplicity, we keep original as processed (no format conversion yet).

#include "../service.h"
#include <cstdlib>
#include <filesystem>
#include <fstream>

namespace fs = std::filesystem;
namespace sonet::media_service {

class MagickImageProcessor final : public ImageProcessor {
public:
	bool Process(const std::string& path_in, std::string& path_out, std::string& thumb_out, uint32_t& width, uint32_t& height) override {
		// Leave original as processed output
		path_out = path_in;
		// Create thumbnail 256px wide, preserve aspect
		auto tpath = fs::path(path_in).parent_path() / (fs::path(path_in).filename().string() + ".thumb.jpg");
		std::string cmd = "convert '" + path_in + "' -auto-orient -resize 256x256 '" + tpath.string() + "'";
		int rc = std::system(cmd.c_str());
		if (rc != 0) {
			// Best effort: no thumbnail
			thumb_out = path_in;
		} else {
			thumb_out = tpath.string();
		}
		// Probe dimensions via ImageMagick identify
		{
			std::string dim_cmd = "identify -format '%w %h' '" + path_in + "' 2>/dev/null > '" + (tpath.string() + ".dim") + "'";
			int drc = std::system(dim_cmd.c_str()); (void)drc;
			std::ifstream ifs(tpath.string() + ".dim");
			if (ifs) { ifs >> width >> height; }
			fs::remove(tpath.string() + ".dim");
		}
		return true;
	}
};

std::unique_ptr<ImageProcessor> CreateImageProcessor() { return std::make_unique<MagickImageProcessor>(); }

} // namespace sonet::media_service

