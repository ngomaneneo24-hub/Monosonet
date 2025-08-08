//
// Copyright (c) 2025 Neo Qiss
// All rights reserved.
//
// This software is proprietary and confidential.
// Unauthorized copying, distribution, or use is strictly prohibited.
//

#include "service.h"

#include <filesystem>
#include <fstream>
#include <random>
#include <chrono>
#include <algorithm>

namespace fs = std::filesystem;

namespace sonet::media_service {

// ---------------- In-memory Repo (simple, for dev/testing) ----------------
class InMemoryRepo final : public MediaRepository {
public:
	bool Save(const MediaRecord& rec) override {
		store_[rec.id] = rec;
		by_owner_[rec.owner_user_id].push_back(rec.id);
		return true;
	}
	bool Get(const std::string& id, MediaRecord& out) override {
		auto it = store_.find(id);
		if (it == store_.end()) return false;
		out = it->second;
		return true;
	}
	bool Delete(const std::string& id) override {
		auto it = store_.find(id);
		if (it == store_.end()) return false;
		auto owner = it->second.owner_user_id;
		store_.erase(it);
		auto& vec = by_owner_[owner];
		vec.erase(std::remove(vec.begin(), vec.end(), id), vec.end());
		return true;
	}
	std::vector<MediaRecord> ListByOwner(const std::string& owner, uint32_t page, uint32_t page_size, uint32_t& total_pages) override {
		std::vector<MediaRecord> res;
		auto it = by_owner_.find(owner);
		if (it == by_owner_.end()) { total_pages = 0; return res; }
		const auto& ids = it->second;
		if (page_size == 0) page_size = 20;
		total_pages = (ids.size() + page_size - 1) / page_size;
		if (page == 0) page = 1;
		uint32_t start = (page - 1) * page_size;
		for (uint32_t i = start; i < ids.size() && res.size() < page_size; ++i) {
			MediaRecord r{}; if (Get(ids[i], r)) res.push_back(r);
		}
		return res;
	}
private:
	std::unordered_map<std::string, MediaRecord> store_;
	std::unordered_map<std::string, std::vector<std::string>> by_owner_;
};

std::unique_ptr<MediaRepository> CreateInMemoryRepo() { return std::make_unique<InMemoryRepo>(); }

// ---------------- Local Storage backend (writes to disk, returns file:// URL) ----------------
class LocalStorage final : public StorageBackend {
public:
	LocalStorage(std::string base_dir, std::string base_url) : base_dir_(std::move(base_dir)), base_url_(std::move(base_url)) {
		fs::create_directories(base_dir_);
	}
	bool Put(const std::string& local_path, const std::string& object_key, std::string& out_url) override {
		auto target = fs::path(base_dir_) / object_key;
		fs::create_directories(target.parent_path());
		std::error_code ec;
		fs::rename(local_path, target, ec);
		if (ec) {
			// fallback to copy if rename across devices fails
			ec.clear();
			fs::copy_file(local_path, target, fs::copy_options::overwrite_existing, ec);
			if (ec) return false;
			fs::remove(local_path);
		}
		out_url = base_url_ + "/" + object_key;
		return true;
	}
	bool Delete(const std::string& object_key) override {
		std::error_code ec;
		fs::remove(fs::path(base_dir_) / object_key, ec);
		return !ec;
	}
private:
	std::string base_dir_;
	std::string base_url_;
};

std::unique_ptr<StorageBackend> CreateLocalStorage(const std::string& base_dir, const std::string& base_url) {
	return std::make_unique<LocalStorage>(base_dir, base_url);
}

// ---------------- Processors (no-op/minimal placeholders) ----------------
class BasicImageProcessor final : public ImageProcessor {
public:
	bool Process(const std::string& path_in, std::string& path_out, std::string& thumb_out, uint32_t& width, uint32_t& height) override {
		// TODO: integrate real image library (stb, ImageMagick, etc.)
		path_out = path_in; // no conversion for now
		thumb_out = path_in; // same file as placeholder
		width = 0; height = 0; // unknown
		return true;
	}
};
std::unique_ptr<ImageProcessor> CreateImageProcessor() { return std::make_unique<BasicImageProcessor>(); }

class BasicVideoProcessor final : public VideoProcessor {
public:
	bool Process(const std::string& path_in, std::string& path_out, std::string& thumb_out, double& duration, uint32_t& width, uint32_t& height) override {
		// TODO: call ffmpeg for transcoding and thumbnail
		path_out = path_in;
		thumb_out = path_in;
		duration = 0.0; width = 0; height = 0;
		return true;
	}
};
std::unique_ptr<VideoProcessor> CreateVideoProcessor() { return std::make_unique<BasicVideoProcessor>(); }

class BasicGifProcessor final : public GifProcessor {
public:
	bool Process(const std::string& path_in, std::string& path_out, std::string& thumb_out, double& duration, uint32_t& width, uint32_t& height) override {
		// TODO: optimize frames/size
		path_out = path_in; thumb_out = path_in; duration = 0.0; width = 0; height = 0; return true;
	}
};
std::unique_ptr<GifProcessor> CreateGifProcessor() { return std::make_unique<BasicGifProcessor>(); }

// -------------- Utility --------------
static std::string GenId() {
	// Natural human-like: just a short random id; replace with ULID/UUID later
	static std::mt19937_64 rng{std::random_device{}()};
	static const char* alphabet = "0123456789abcdef";
	uint64_t x = rng();
	std::string s(16, '0');
	for (int i = 15; i >= 0; --i) { s[i] = alphabet[x & 0xF]; x >>= 4; }
	return s;
}

// -------------- gRPC methods --------------
::grpc::Status MediaServiceImpl::Upload(::grpc::ServerContext* context,
										::grpc::ServerReader< ::sonet::media::UploadRequest>* reader,
										::sonet::media::UploadResponse* response) {
	using namespace ::sonet::media;

	UploadRequest req;
	UploadInit init;
	bool got_init = false;

	// temp file to collect bytes
	auto tmp_dir = fs::temp_directory_path();
	auto tmp_path = tmp_dir / ("upload-" + GenId());
	std::ofstream ofs(tmp_path, std::ios::binary);
	if (!ofs) return {::grpc::StatusCode::INTERNAL, "Failed to open temp file"};

	uint64_t total = 0;
	while (reader->Read(&req)) {
		if (req.has_init()) {
			if (got_init) return {::grpc::StatusCode::INVALID_ARGUMENT, "Duplicate init"};
			init = req.init();
			got_init = true;
			// minimal validation
			if (init.owner_user_id().empty()) return {::grpc::StatusCode::INVALID_ARGUMENT, "owner_user_id required"};
			if (init.type() == MEDIA_TYPE_UNKNOWN) return {::grpc::StatusCode::INVALID_ARGUMENT, "media type required"};
			continue;
		}
		if (!got_init) return {::grpc::StatusCode::INVALID_ARGUMENT, "init frame required first"};
		if (req.has_chunk()) {
			const auto& c = req.chunk().content();
			total += c.size();
			if (total > max_upload_bytes_) return {::grpc::StatusCode::RESOURCE_EXHAUSTED, "file too large"};
			ofs.write(c.data(), static_cast<std::streamsize>(c.size()));
			if (!ofs) return {::grpc::StatusCode::INTERNAL, "failed to write temp"};
		}
	}
	ofs.close();

	if (!got_init) return {::grpc::StatusCode::INVALID_ARGUMENT, "missing init"};

	// Decide processor by type
	std::string processed = tmp_path; // may be replaced by processors
	std::string thumb = tmp_path;
	uint32_t width = 0, height = 0; double duration = 0;
	bool ok = false;
	switch (init.type()) {
		case MEDIA_TYPE_IMAGE: ok = img_->Process(tmp_path.string(), processed, thumb, width, height); break;
		case MEDIA_TYPE_VIDEO: ok = vid_->Process(tmp_path.string(), processed, thumb, duration, width, height); break;
		case MEDIA_TYPE_GIF:   ok = gif_->Process(tmp_path.string(), processed, thumb, duration, width, height); break;
		default: return {::grpc::StatusCode::INVALID_ARGUMENT, "unsupported type"};
	}
	if (!ok) { fs::remove(tmp_path); return {::grpc::StatusCode::INTERNAL, "processing failed"}; }

	// Store processed file
	auto id = GenId();
	std::string object_key = init.owner_user_id() + "/" + id;
	std::string url;
	if (!storage_->Put(processed, object_key, url)) { fs::remove(processed); return {::grpc::StatusCode::INTERNAL, "storage failed"}; }
	std::string thumb_url = url; // Placeholder. In real impl store thumb separately.

	// Save metadata
	MediaRecord rec{};
	rec.id = id;
	rec.owner_user_id = init.owner_user_id();
	rec.type = init.type();
	rec.mime_type = init.mime_type();
	rec.size_bytes = total;
	rec.width = width; rec.height = height; rec.duration_seconds = duration;
	rec.original_url = url; rec.thumbnail_url = thumb_url;
	repo_->Save(rec);

	response->set_media_id(id);
	response->set_type(init.type());
	response->set_url(url);
	response->set_thumbnail_url(thumb_url);
	return ::grpc::Status::OK;
}

::grpc::Status MediaServiceImpl::GetMedia(::grpc::ServerContext* /*context*/,
										  const ::sonet::media::GetMediaRequest* request,
										  ::sonet::media::GetMediaResponse* response) {
	MediaRecord rec{};
	if (!repo_->Get(request->media_id(), rec)) return {::grpc::StatusCode::NOT_FOUND, "not found"};
	auto* m = response->mutable_media();
	m->set_id(rec.id);
	m->set_owner_user_id(rec.owner_user_id);
	m->set_type(rec.type);
	m->set_mime_type(rec.mime_type);
	m->set_size_bytes(rec.size_bytes);
	m->set_width(rec.width);
	m->set_height(rec.height);
	m->set_duration_seconds(rec.duration_seconds);
	m->set_original_url(rec.original_url);
	m->set_thumbnail_url(rec.thumbnail_url);
	// created_at omitted in placeholder
	return ::grpc::Status::OK;
}

::grpc::Status MediaServiceImpl::DeleteMedia(::grpc::ServerContext* /*context*/,
											 const ::sonet::media::DeleteMediaRequest* request,
											 ::sonet::media::DeleteMediaResponse* response) {
	// We delete from storage best-effort, then repo
	MediaRecord rec{};
	bool ok = repo_->Get(request->media_id(), rec);
	if (ok) {
		// Derive object key from URL in our local storage scheme
		// Natural: assume URL ends with object key
		auto pos = rec.original_url.find_last_of('/');
		if (pos != std::string::npos) {
			auto key = rec.original_url.substr(pos + 1);
			storage_->Delete(rec.owner_user_id + "/" + key);
		}
	}
	response->set_deleted(repo_->Delete(request->media_id()));
	return ::grpc::Status::OK;
}

::grpc::Status MediaServiceImpl::ListUserMedia(::grpc::ServerContext* /*context*/,
											   const ::sonet::media::ListUserMediaRequest* request,
											   ::sonet::media::ListUserMediaResponse* response) {
	uint32_t total_pages = 0;
	auto items = repo_->ListByOwner(request->owner_user_id(), request->page(), request->page_size(), total_pages);
	response->set_page(request->page());
	response->set_page_size(request->page_size());
	response->set_total_pages(total_pages);
	for (const auto& r : items) {
		auto* m = response->add_items();
		m->set_id(r.id);
		m->set_owner_user_id(r.owner_user_id);
		m->set_type(r.type);
		m->set_mime_type(r.mime_type);
		m->set_size_bytes(r.size_bytes);
		m->set_width(r.width);
		m->set_height(r.height);
		m->set_duration_seconds(r.duration_seconds);
		m->set_original_url(r.original_url);
		m->set_thumbnail_url(r.thumbnail_url);
	}
	return ::grpc::Status::OK;
}

} // namespace sonet::media_service

