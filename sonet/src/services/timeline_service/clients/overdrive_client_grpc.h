#pragma once

#include "overdrive_client.h"
#include <string>
#include <vector>

namespace sonet::timeline {

class OverdriveClientGrpc final : public OverdriveClient {
public:
	explicit OverdriveClientGrpc(const std::string& target_address);
	std::vector<OverdriveRankedItem> RankForYou(
		const std::string& user_id,
		const std::vector<std::string>& candidate_note_ids,
		int32_t limit
	) override;

private:
	std::string target_;
};

} // namespace sonet::timeline