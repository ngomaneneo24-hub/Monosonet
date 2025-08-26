use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ClassificationLabel {
	Spam,
	HateSpeech,
	Csam,
	Clean,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClassificationResult {
	pub label: ClassificationLabel,
	pub confidence: f32,
}

pub trait ContentClassifier {
	fn classify(&self, text: &str) -> ClassificationResult;
}

pub struct RuleBasedClassifier;

impl ContentClassifier for RuleBasedClassifier {
	fn classify(&self, text: &str) -> ClassificationResult {
		let lowered = text.to_lowercase();
		if lowered.contains("buy now") || lowered.contains("free $$$") {
			ClassificationResult { label: ClassificationLabel::Spam, confidence: 0.7 }
		} else {
			ClassificationResult { label: ClassificationLabel::Clean, confidence: 0.5 }
		}
	}
}