#include "overdrive_client_grpc.h"

namespace sonet::timeline {

OverdriveClientGrpc::OverdriveClientGrpc(const std::string& target_address) : target_(target_address) {}

std::vector<OverdriveRankedItem> OverdriveClientGrpc::RankForYou(
	const std::string& /*user_id*/,
	const std::vector<std::string>& /*candidate_note_ids*/,
	int32_t /*limit*/
) {
	// TODO: Implement gRPC call to overdrive-serving
	return {};
}

} // namespace sonet::timeline