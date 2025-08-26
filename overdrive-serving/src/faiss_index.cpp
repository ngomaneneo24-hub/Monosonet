#include "faiss_index.h"
#include <random>
#include <algorithm>
#include <iostream>

namespace overdrive {

class StubFaissIndex : public FaissIndex {
public:
	bool BuildIndex(const std::vector<std::vector<float>>& vectors, const std::vector<std::string>& ids) override {
		vectors_ = vectors;
		ids_ = ids;
		dimension_ = vectors.empty() ? 0 : vectors[0].size();
		std::cout << "Stub FAISS index built with " << vectors.size() << " vectors of dimension " << dimension_ << std::endl;
		return true;
	}
	
	std::vector<std::pair<std::string, float>> Search(const std::vector<float>& query_vector, int k) override {
		std::vector<std::pair<std::string, float>> results;
		if (ids_.empty()) return results;
		
		// Return random results for now
		std::random_device rd;
		std::mt19937 gen(rd());
		std::uniform_real_distribution<float> dis(0.5f, 1.0f);
		
		k = std::min(k, static_cast<int>(ids_.size()));
		for (int i = 0; i < k; ++i) {
			results.emplace_back(ids_[i], dis(gen));
		}
		
		return results;
	}
	
	bool SaveIndex(const std::string& path) override {
		std::cout << "Stub FAISS index saved to " << path << std::endl;
		return true;
	}
	
	bool LoadIndex(const std::string& path) override {
		std::cout << "Stub FAISS index loaded from " << path << std::endl;
		return true;
	}
	
	size_t GetSize() const override { return vectors_.size(); }
	int GetDimension() const override { return dimension_; }

private:
	std::vector<std::vector<float>> vectors_;
	std::vector<std::string> ids_;
	int dimension_ = 0;
};

std::unique_ptr<FaissIndex> CreateFaissIndex(const std::string& type) {
	// TODO: Return real FAISS implementation when linked
	return std::make_unique<StubFaissIndex>();
}

} // namespace overdrive