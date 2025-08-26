#include "overdrive_client_grpc.h"
#include <iostream>

namespace sonet::timeline {

OverdriveClientGrpc::OverdriveClientGrpc(const std::string& target_address) : target_(target_address) {}

std::vector<OverdriveRankedItem> OverdriveClientGrpc::RankForYou(
	const std::string& user_id,
	const std::vector<std::string>& candidate_note_ids,
	int32_t limit
) {
	// TODO: Implement actual gRPC call to overdrive-serving
	// For now, return a simple ranking based on position
	std::vector<OverdriveRankedItem> result;
	result.reserve(candidate_note_ids.size());
	
	for (size_t i = 0; i < candidate_note_ids.size() && static_cast<int32_t>(result.size()) < limit; ++i) {
		OverdriveRankedItem item;
		item.note_id = candidate_note_ids[i];
		item.score = 1.0 - (0.001 * i); // Simple position-based scoring
		item.factors["position"] = static_cast<double>(i);
		item.factors["overdrive_stub"] = 1.0;
		item.reasons.push_back("overdrive_stub_ranking");
		result.push_back(std::move(item));
	}
	
	std::cout << "Overdrive stub ranked " << result.size() << " items for user " << user_id << std::endl;
	return result;
}

} // namespace sonet::timeline