from typing import Iterable, Dict, Any

class InteractionsConsumer:
	def __init__(self, brokers: str, topic: str, group_id: str) -> None:
		self.brokers = brokers
		topic = topic  # noqa: F841 (placeholder)
		self.group_id = group_id
		# TODO: initialize confluent-kafka consumer here

	def run(self) -> None:
		# TODO: poll, parse, and forward to feature pipelines
		pass

	def process_batch(self, events: Iterable[Dict[str, Any]]) -> None:
		# TODO: transform and write to offline/online stores
		pass