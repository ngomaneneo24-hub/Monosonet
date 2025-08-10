#pragma once

#include <string>
#include <vector>
#include <memory>

namespace sonet {
namespace timeline {
namespace fanout {

class FanoutPublisher {
public:
    virtual ~FanoutPublisher() = default;
    virtual void PublishNewNote(const std::string& author_id, const std::string& note_id) = 0;
};

class FanoutConsumer {
public:
    virtual ~FanoutConsumer() = default;
    virtual void Start() = 0;
    virtual void Stop() = 0;
};

class StubFanoutPublisher : public FanoutPublisher {
public:
    void PublishNewNote(const std::string& /*author_id*/, const std::string& /*note_id*/) override {}
};

class StubFanoutConsumer : public FanoutConsumer {
public:
    void Start() override {}
    void Stop() override {}
};

#ifdef SONET_USE_KAFKA
// Placeholders for Kafka-based publisher/consumer
class KafkaFanoutPublisher : public FanoutPublisher {
public:
    KafkaFanoutPublisher(const std::string& brokers, const std::string& topic)
        : brokers_(brokers), topic_(topic) {}
    void PublishNewNote(const std::string& author_id, const std::string& note_id) override {
        (void)author_id; (void)note_id; // Implement with librdkafka
    }
private:
    std::string brokers_;
    std::string topic_;
};

class KafkaFanoutConsumer : public FanoutConsumer {
public:
    KafkaFanoutConsumer(const std::string& brokers, const std::string& topic, const std::string& group)
        : brokers_(brokers), topic_(topic), group_(group) {}
    void Start() override {}
    void Stop() override {}
private:
    std::string brokers_;
    std::string topic_;
    std::string group_;
};
#endif

} // namespace fanout
} // namespace timeline
} // namespace sonet