//
// Copyright (c) 2025 Neo Qiss
// All rights reserved.
//
// This software is proprietary and confidential.
// Unauthorized copying, distribution, or use is strictly prohibited.
//

// S3/R2/MinIO backend implemented via AWS CLI (s3 cp/sync) to avoid heavy SDK dependency.

#include "../service.h"
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <unistd.h>

namespace fs = std::filesystem;
namespace sonet::media_service {

class AwsCliS3Storage final : public StorageBackend {
public:
	AwsCliS3Storage(std::string bucket, std::string base_url, std::string endpoint)
		: bucket_(std::move(bucket)), base_url_(std::move(base_url)), endpoint_(std::move(endpoint)) {}

	bool Put(const std::string& local_path, const std::string& object_key, std::string& out_url) override {
		std::string extra = endpoint_.empty() ? "" : (" --endpoint-url '" + endpoint_ + "'");
		std::string cmd = "aws s3 cp '" + local_path + "' 's3://" + bucket_ + "/" + object_key + "'" + extra + " >/dev/null 2>&1";
		int rc = std::system(cmd.c_str());
		if (rc != 0) return false;
		out_url = base_url_.empty() ? ("s3://" + bucket_ + "/" + object_key) : (base_url_ + "/" + object_key);
		return true;
	}
	bool PutDir(const std::string& local_dir, const std::string& object_prefix, std::string& out_base_url) override {
		std::string extra = endpoint_.empty() ? "" : (" --endpoint-url '" + endpoint_ + "'");
		std::string cmd = "aws s3 sync '" + local_dir + "' 's3://" + bucket_ + "/" + object_prefix + "'" + extra + " --delete >/dev/null 2>&1";
		int rc = std::system(cmd.c_str());
		if (rc != 0) return false;
		out_base_url = base_url_.empty() ? ("s3://" + bucket_ + "/" + object_prefix) : (base_url_ + "/" + object_prefix);
		return true;
	}
	bool Delete(const std::string& object_key) override {
		std::string extra = endpoint_.empty() ? "" : (" --endpoint-url '" + endpoint_ + "'");
		std::string cmd = "aws s3 rm 's3://" + bucket_ + "/" + object_key + "'" + extra + " >/dev/null 2>&1";
		int rc = std::system(cmd.c_str());
		return rc == 0;
	}

	std::string Sign(const std::string& object_key, int ttl_seconds) override {
		// Attempt presign; if it fails, return public URL
		char tmpl[] = "/tmp/presignXXXXXX";
		int fd = mkstemp(tmpl);
		if (fd != -1) close(fd);
		std::string tmpfile = tmpl;
		std::string extra = endpoint_.empty() ? "" : (" --endpoint-url '" + endpoint_ + "'");
		std::string cmd = "aws s3 presign 's3://" + bucket_ + "/" + object_key + "' --expires-in " + std::to_string(ttl_seconds) + extra + " > '" + tmpfile + "' 2>/dev/null";
		int rc = std::system(cmd.c_str());
		if (rc == 0) {
			std::ifstream ifs(tmpfile);
			std::string url; std::getline(ifs, url);
			fs::remove(tmpfile);
			if (!url.empty()) return url;
		}
		fs::remove(tmpfile);
		return base_url_.empty() ? ("s3://" + bucket_ + "/" + object_key) : (base_url_ + "/" + object_key);
	}

	std::string SignUrl(const std::string& url, int ttl_seconds) override {
		// If url already includes bucket path; attempt to derive object key after base_url_
		if (!base_url_.empty()) {
			if (url.rfind(base_url_, 0) == 0) {
				std::string key = url.substr(base_url_.size() + 1); // skip '/'
				return Sign(key, ttl_seconds);
			}
		}
		// Fallback: return original
		return url;
	}

private:
	std::string bucket_;
	std::string base_url_;
	std::string endpoint_;
};

std::unique_ptr<StorageBackend> CreateS3Storage(const std::string& bucket,
												const std::string& public_base_url,
												const std::string& endpoint) {
	return std::make_unique<AwsCliS3Storage>(bucket, public_base_url, endpoint);
}

} // namespace sonet::media_service
