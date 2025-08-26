use serde::{Deserialize, Serialize};
use once_cell::sync::Lazy;
use aho_corasick::{AhoCorasick, AhoCorasickBuilder};

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

static SPAM_PATTERNS: &[&str] = &["buy now", "free $$$", "click here", "limited offer"];
static SPAM_AUTOMATON: Lazy<AhoCorasick> = Lazy::new(|| {
	AhoCorasickBuilder::new()
		.ascii_case_insensitive(true)
		.auto_configure(SPAM_PATTERNS)
		.build(SPAM_PATTERNS)
});

pub struct RuleBasedClassifier;

impl ContentClassifier for RuleBasedClassifier {
	fn classify(&self, text: &str) -> ClassificationResult {
		if SPAM_AUTOMATON.is_match(text.as_bytes()) {
			ClassificationResult { label: ClassificationLabel::Spam, confidence: 0.85 }
		} else {
			ClassificationResult { label: ClassificationLabel::Clean, confidence: 0.5 }
		}
	}
}