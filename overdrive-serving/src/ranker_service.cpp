#include "ranker_service.h"
#include <grpcpp/grpcpp.h>
#include <grpcpp/server_context.h>
#include <grpcpp/support/status.h>

namespace overdrive {

class OverdriveRankerServiceImpl final : public OverdriveRanker::Service {
public:
	grpc::Status RankForYou(
		grpc::ServerContext* context,
		const RankForYouRequest* request,
		RankForYouResponse* response
	) override {
		// Call the ranker service
		auto ranked = ranker_.RankForYou(
			request->user_id(),
			std::vector<std::string>(request->candidate_note_ids().begin(), request->candidate_note_ids().end()),
			request->limit()
		);

		// Build response
		for (const auto& item : ranked) {
			auto* resp_item = response->add_items();
			resp_item->set_note_id(item.note_id);
			resp_item->set_score(item.score);
			
			for (const auto& factor : item.factors) {
				auto* resp_factor = resp_item->add_factors();
				resp_factor->set_name(factor.name);
				resp_factor->set_value(factor.value);
			}
			
			for (const auto& reason : item.reasons) {
				resp_item->add_reasons(reason);
			}
		}

		response->set_algorithm_version("0.1.0");
		response->mutable_personalization_summary()->insert({"overdrive_enabled", 1.0});

		return grpc::Status::OK;
	}

private:
	RankerServiceImpl ranker_;
};

} // namespace overdrive