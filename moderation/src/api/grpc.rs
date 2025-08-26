use tonic::{Request, Response, Status};
use async_stream::try_stream;
use futures_core::Stream;
use std::pin::Pin;

use crate::core::classifier::{ContentClassifier, RuleBasedClassifier};

pub mod moderation_v1 {
	tonic::include_proto!("moderation.v1");
}

use moderation_v1::{moderation_service_server::{ModerationService, ModerationServiceServer}, ClassifyRequest, ClassifyResponse, Classification};

#[derive(Default, Clone)]
pub struct ModerationGrpcService {
	classifier: RuleBasedClassifier,
}

#[tonic::async_trait]
impl ModerationService for ModerationGrpcService {
	async fn classify(&self, request: Request<ClassifyRequest>) -> Result<Response<ClassifyResponse>, Status> {
		let req = request.into_inner();
		let result = self.classifier.classify(&req.text);
		let resp = ClassifyResponse { content_id: req.content_id, result: Some(Classification { label: format!("{:?}", result.label), confidence: result.confidence }) };
		Ok(Response::new(resp))
	}

	type ClassifyStreamStream = Pin<Box<dyn Stream<Item = Result<ClassifyResponse, Status>> + Send + 'static>>;

	async fn classify_stream(&self, request: Request<tonic::Streaming<ClassifyRequest>>) -> Result<Response<Self::ClassifyStreamStream>, Status> {
		let mut inbound = request.into_inner();
		let classifier = self.classifier.clone();
		let output = try_stream! {
			while let Some(req) = inbound.message().await? {
				let result = classifier.classify(&req.text);
				yield ClassifyResponse { content_id: req.content_id, result: Some(Classification { label: format!("{:?}", result.label), confidence: result.confidence }) };
			}
		};
		Ok(Response::new(Box::pin(output) as Self::ClassifyStreamStream))
	}
}

impl ModerationGrpcService {
	pub fn into_server(self) -> ModerationServiceServer<Self> {
		ModerationServiceServer::new(self)
	}
}