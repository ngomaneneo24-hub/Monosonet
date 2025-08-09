//
// Copyright (c) 2025 Neo Qiss
// All rights reserved.
//
// This software is proprietary and confidential.
// Unauthorized copying, distribution, or use is strictly prohibited.
//

// S3/R2/MinIO backend: prefers AWS SDK (if available) else falls back to AWS CLI.

#include "../service.h"
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <unistd.h>
#ifdef USE_AWS_SDK_S3
#include <aws/core/Aws.h>
#include <aws/core/auth/AWSCredentialsProvider.h>
#include <aws/s3/S3Client.h>
#include <aws/s3/model/PutObjectRequest.h>
#include <aws/s3/model/DeleteObjectRequest.h>
#include <aws/s3/model/CreateMultipartUploadRequest.h>
#include <aws/s3/model/UploadPartRequest.h>
#include <aws/s3/model/CompleteMultipartUploadRequest.h>
#include <aws/s3/model/CompletedMultipartUpload.h>
#include <aws/s3/model/CompletedPart.h>
#include <aws/s3/model/ListObjectsV2Request.h>
#include <aws/s3/model/DeleteObjectsRequest.h>
#include <aws/s3/model/GetObjectRequest.h>
#endif

namespace fs = std::filesystem;
namespace sonet::media_service {

// Abstract base that chooses implementation at runtime only by compile flags.
class S3StorageBase : public StorageBackend { };

#ifdef USE_AWS_SDK_S3
class AwsSdkS3Storage final : public S3StorageBase {
public:
	AwsSdkS3Storage(std::string bucket, std::string base_url, std::string endpoint)
		: bucket_(std::move(bucket)), base_url_(std::move(base_url)) {
		Aws::Client::ClientConfiguration cfg;
		if (!endpoint.empty()) { cfg.endpointOverride = endpoint; cfg.scheme = Aws::Http::Scheme::HTTPS; }
		client_ = std::make_shared<Aws::S3::S3Client>(cfg);
	}
	bool Put(const std::string& local_path, const std::string& object_key, std::string& out_url) override {
		std::ifstream ifs(local_path, std::ios::binary);
		if (!ifs) return false;
		Aws::S3::Model::PutObjectRequest req; req.SetBucket(bucket_.c_str()); req.SetKey(object_key.c_str());
		auto stream = Aws::MakeShared<Aws::StringStream>("putobj");
		(*stream) << ifs.rdbuf();
		req.SetBody(stream);
		auto outcome = client_->PutObject(req);
		if (!outcome.IsSuccess()) return false;
		out_url = base_url_.empty() ? ("https://" + bucket_ + "/" + object_key) : (base_url_ + "/" + object_key);
		return true;
	}
	bool PutDir(const std::string& local_dir, const std::string& object_prefix, std::string& out_base_url) override {
		for (auto& entry : fs::recursive_directory_iterator(local_dir)) {
			if (!entry.is_regular_file()) continue;
			auto rel = fs::relative(entry.path(), local_dir);
			std::string key = object_prefix + "/" + rel.generic_string();
			std::string dummy;
			if (!Put(entry.path().string(), key, dummy)) return false;
		}
		out_base_url = base_url_.empty() ? ("https://" + bucket_ + "/" + object_prefix) : (base_url_ + "/" + object_prefix);
		return true;
	}
	bool Delete(const std::string& object_key) override {
		Aws::S3::Model::DeleteObjectRequest req; req.SetBucket(bucket_.c_str()); req.SetKey(object_key.c_str());
		return client_->DeleteObject(req).IsSuccess();
	}
	std::string Sign(const std::string& object_key, int ttl_seconds) override {
		// Simple pre-signed URL generation
		Aws::Http::URI uri;
		Aws::S3::Model::GetObjectRequest req; req.SetBucket(bucket_.c_str()); req.SetKey(object_key.c_str());
		auto presigned = client_->GeneratePresignedUrl(bucket_.c_str(), object_key.c_str(), Aws::Http::HttpMethod::HTTP_GET, ttl_seconds);
		if (presigned.empty()) return base_url_ + "/" + object_key;
		return std::string(presigned.c_str());
	}
	std::string SignUrl(const std::string& url, int ttl_seconds) override {
		if (!base_url_.empty() && url.rfind(base_url_,0)==0) {
			std::string key = url.substr(base_url_.size()+1);
			return Sign(key, ttl_seconds);
		}
		return url;
	}
private:
	std::string bucket_;
	std::string base_url_;
	std::shared_ptr<Aws::S3::S3Client> client_;
};
#else
class AwsCliS3Storage final : public S3StorageBase {
public:
	AwsCliS3Storage(std::string bucket, std::string base_url, std::string endpoint)
		: bucket_(std::move(bucket)), base_url_(std::move(base_url)), endpoint_(std::move(endpoint)) {}
	// ... existing CLI implementation moved unchanged ...
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
		char tmpl[] = "/tmp/presignXXXXXX";
		int fd = mkstemp(tmpl);
		if (fd != -1) close(fd);
		std::string tmpfile = tmpl;
		std::string extra = endpoint_.empty() ? "" : (" --endpoint-url '" + endpoint_ + "'");
		std::string cmd = "aws s3 presign 's3://" + bucket_ + "/" + object_key + "' --expires-in " + std::to_string(ttl_seconds) + extra + " > '" + tmpfile + "' 2>/dev/null";
		int rc = std::system(cmd.c_str());
		if (rc == 0) { std::ifstream ifs(tmpfile); std::string url; std::getline(ifs,url); fs::remove(tmpfile); if (!url.empty()) return url; }
		fs::remove(tmpfile);
		return base_url_.empty() ? ("s3://" + bucket_ + "/" + object_key) : (base_url_ + "/" + object_key);
	}
	std::string SignUrl(const std::string& url, int ttl_seconds) override {
		if (!base_url_.empty() && url.rfind(base_url_,0)==0) { std::string key = url.substr(base_url_.size()+1); return Sign(key, ttl_seconds);} return url;
	}
private:
	std::string bucket_; std::string base_url_; std::string endpoint_;
};
#endif

std::unique_ptr<StorageBackend> CreateS3Storage(const std::string& bucket,
												const std::string& public_base_url,
												const std::string& endpoint) {
#ifdef USE_AWS_SDK_S3
	static bool aws_init = false; static Aws::SDKOptions options;
	if (!aws_init) { Aws::InitAPI(options); aws_init = true; }
	return std::make_unique<AwsSdkS3Storage>(bucket, public_base_url, endpoint);
#else
	return std::make_unique<AwsCliS3Storage>(bucket, public_base_url, endpoint);
#endif
}

} // namespace sonet::media_service
