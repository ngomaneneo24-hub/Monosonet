//
// Copyright (c) 2025 Neo Qiss
// All rights reserved.
//
// This software is proprietary and confidential.
// Unauthorized copying, distribution, or use is strictly prohibited.
//

#pragma once

#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

#include <grpcpp/grpcpp.h>

// Generated from proto (built at top-level into include path)
#include <media.grpc.pb.h>

namespace sonet::media_service {

// Lightweight metadata model used internally
struct MediaRecord {
	std::string id;
	std::string owner_user_id;
	::sonet::media::MediaType type{};
	std::string mime_type;
	uint64_t size_bytes{};
	uint32_t width{};
	uint32_t height{};
	double duration_seconds{};
	std::string original_url;
	std::string thumbnail_url;
};

class MediaRepository {
public:
	virtual ~MediaRepository() = default;
	virtual bool Save(const MediaRecord& rec) = 0;
	virtual bool Get(const std::string& id, MediaRecord& out) = 0;
	virtual bool Delete(const std::string& id) = 0;
	virtual std::vector<MediaRecord> ListByOwner(const std::string& owner, uint32_t page, uint32_t page_size, uint32_t& total_pages) = 0;
};

class StorageBackend {
public:
	virtual ~StorageBackend() = default;
	// Store a file from a local temp path to object storage. Returns public/signed URL.
	virtual bool Put(const std::string& local_path, const std::string& object_key, std::string& out_url) = 0;
	virtual bool Delete(const std::string& object_key) = 0;
};

class ImageProcessor { public: virtual ~ImageProcessor() = default; virtual bool Process(const std::string& path_in, std::string& path_out, std::string& thumb_out, uint32_t& width, uint32_t& height) = 0; };
class VideoProcessor { public: virtual ~VideoProcessor() = default; virtual bool Process(const std::string& path_in, std::string& path_out, std::string& thumb_out, double& duration, uint32_t& width, uint32_t& height) = 0; };
class GifProcessor   { public: virtual ~GifProcessor()   = default; virtual bool Process(const std::string& path_in, std::string& path_out, std::string& thumb_out, double& duration, uint32_t& width, uint32_t& height) = 0; };

// Simple local implementations provided in this service for now
std::unique_ptr<MediaRepository> CreateInMemoryRepo();
std::unique_ptr<StorageBackend> CreateLocalStorage(const std::string& base_dir, const std::string& base_url);
std::unique_ptr<ImageProcessor> CreateImageProcessor();
std::unique_ptr<VideoProcessor> CreateVideoProcessor();
std::unique_ptr<GifProcessor> CreateGifProcessor();

class MediaServiceImpl final : public ::sonet::media::MediaService::Service {
public:
	MediaServiceImpl(std::shared_ptr<MediaRepository> repo,
					 std::shared_ptr<StorageBackend> storage,
					 std::shared_ptr<ImageProcessor> img,
					 std::shared_ptr<VideoProcessor> vid,
					 std::shared_ptr<GifProcessor> gif,
					 uint64_t max_upload_bytes)
		: repo_(std::move(repo)), storage_(std::move(storage)), img_(std::move(img)), vid_(std::move(vid)), gif_(std::move(gif)), max_upload_bytes_(max_upload_bytes) {}

	// Client streaming upload implementation
	::grpc::Status Upload(::grpc::ServerContext* context,
						  ::grpc::ServerReader< ::sonet::media::UploadRequest>* reader,
						  ::sonet::media::UploadResponse* response) override;

	::grpc::Status GetMedia(::grpc::ServerContext* context,
							const ::sonet::media::GetMediaRequest* request,
							::sonet::media::GetMediaResponse* response) override;

	::grpc::Status DeleteMedia(::grpc::ServerContext* context,
							   const ::sonet::media::DeleteMediaRequest* request,
							   ::sonet::media::DeleteMediaResponse* response) override;

	::grpc::Status ListUserMedia(::grpc::ServerContext* context,
								 const ::sonet::media::ListUserMediaRequest* request,
								 ::sonet::media::ListUserMediaResponse* response) override;

private:
	std::shared_ptr<MediaRepository> repo_;
	std::shared_ptr<StorageBackend> storage_;
	std::shared_ptr<ImageProcessor> img_;
	std::shared_ptr<VideoProcessor> vid_;
	std::shared_ptr<GifProcessor> gif_;
	uint64_t max_upload_bytes_{};
};

} // namespace sonet::media_service

