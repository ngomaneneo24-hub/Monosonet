//
// Copyright (c) 2025 Neo Qiss
// All rights reserved.
//
// This software is proprietary and confidential.
// Unauthorized copying, distribution, or use is strictly prohibited.
//

#include "implementations.h"
#include <iostream>
#include <sstream>
#include <chrono>
#include <algorithm>

namespace sonet::timeline {

namespace {
    // Helper to convert system_clock::time_point to protobuf timestamp
    ::sonet::common::Timestamp ToProtoTimestamp(std::chrono::system_clock::time_point tp) {
        ::sonet::common::Timestamp result;
        auto duration = tp.time_since_epoch();
        auto seconds = std::chrono::duration_cast<std::chrono::seconds>(duration);
        auto nanos = std::chrono::duration_cast<std::chrono::nanoseconds>(duration - seconds);
        
        result.set_seconds(seconds.count());
        result.set_nanos(static_cast<int32_t>(nanos.count()));
        return result;
    }

    // Helper to convert protobuf timestamp to system_clock::time_point
    std::chrono::system_clock::time_point FromProtoTimestamp(const ::sonet::common::Timestamp& ts) {
        auto duration = std::chrono::seconds(ts.seconds()) + std::chrono::nanoseconds(ts.nanos());
        return std::chrono::system_clock::time_point(duration);
    }

    // Simple JSON-like serialization for cache data
    std::string EscapeString(const std::string& str) {
        std::string escaped;
        escaped.reserve(str.length() + 20);
        
        for (char c : str) {
            switch (c) {
                case '"': escaped += "\\\""; break;
                case '\\': escaped += "\\\\"; break;
                case '\n': escaped += "\\n"; break;
                case '\r': escaped += "\\r"; break;
                case '\t': escaped += "\\t"; break;
                default: escaped += c; break;
            }
        }
        return escaped;
    }

    std::string UnescapeString(const std::string& str) {
        std::string unescaped;
        unescaped.reserve(str.length());
        
        for (size_t i = 0; i < str.length(); ++i) {
            if (str[i] == '\\' && i + 1 < str.length()) {
                switch (str[i + 1]) {
                    case '"': unescaped += '"'; ++i; break;
                    case '\\': unescaped += '\\'; ++i; break;
                    case 'n': unescaped += '\n'; ++i; break;
                    case 'r': unescaped += '\r'; ++i; break;
                    case 't': unescaped += '\t'; ++i; break;
                    default: unescaped += str[i]; break;
                }
            } else {
                unescaped += str[i];
            }
        }
        return unescaped;
    }
}

// ============= REDIS TIMELINE CACHE IMPLEMENTATION =============

RedisTimelineCache::RedisTimelineCache(const std::string& redis_host, int redis_port)
    : redis_host_(redis_host), redis_port_(redis_port) {
    
    // TODO: Initialize Redis connection
    // For now, use in-memory fallback
    redis_available_ = false;
    
    std::cout << "Redis Timeline Cache initialized (fallback mode - Redis at " 
              << redis_host_ << ":" << redis_port_ << " not available)" << std::endl;
}

bool RedisTimelineCache::GetTimeline(
    const std::string& user_id,
    std::vector<RankedTimelineItem>& items
) {
    std::lock_guard<std::mutex> lock(memory_cache_mutex_);
    
    auto it = memory_timeline_cache_.find(user_id);
    if (it != memory_timeline_cache_.end()) {
        items = it->second;
        std::cout << "Cache HIT for user " << user_id << ": " << items.size() << " items" << std::endl;
        return true;
    }
    
    std::cout << "Cache MISS for user " << user_id << std::endl;
    return false;
}

void RedisTimelineCache::SetTimeline(
    const std::string& user_id,
    const std::vector<RankedTimelineItem>& items,
    std::chrono::seconds ttl
) {
    std::lock_guard<std::mutex> lock(memory_cache_mutex_);
    
    memory_timeline_cache_[user_id] = items;
    
    std::cout << "Timeline cached for user " << user_id << ": " << items.size() 
              << " items (TTL: " << ttl.count() << "s)" << std::endl;
    
    // TODO: Set TTL for in-memory cache as well
    // For production, implement Redis SETEX command
}

void RedisTimelineCache::InvalidateTimeline(const std::string& user_id) {
    std::lock_guard<std::mutex> lock(memory_cache_mutex_);
    
    auto erased = memory_timeline_cache_.erase(user_id);
    if (erased > 0) {
        std::cout << "Timeline invalidated for user " << user_id << std::endl;
    }
    
    // TODO: Redis DEL command
}

void RedisTimelineCache::InvalidateAuthorTimelines(const std::string& author_id) {
    std::lock_guard<std::mutex> lock(memory_cache_mutex_);
    
    // In production, this would use Redis SET operations to track author->followers mapping
    // For now, clear all timelines (inefficient but functional)
    
    int invalidated = 0;
    for (auto it = memory_timeline_cache_.begin(); it != memory_timeline_cache_.end();) {
        // Check if any timeline item is from this author
        bool has_author_content = false;
        for (const auto& item : it->second) {
            if (item.note.author_id() == author_id) {
                has_author_content = true;
                break;
            }
        }
        
        if (has_author_content) {
            it = memory_timeline_cache_.erase(it);
            invalidated++;
        } else {
            ++it;
        }
    }
    
    std::cout << "Invalidated " << invalidated << " timelines due to author " << author_id << " update" << std::endl;
}

bool RedisTimelineCache::GetUserProfile(
    const std::string& user_id,
    UserEngagementProfile& profile
) {
    std::lock_guard<std::mutex> lock(memory_cache_mutex_);
    
    auto it = memory_profile_cache_.find(user_id);
    if (it != memory_profile_cache_.end()) {
        profile = it->second;
        return true;
    }
    
    return false;
}

void RedisTimelineCache::SetUserProfile(
    const std::string& user_id,
    const UserEngagementProfile& profile
) {
    std::lock_guard<std::mutex> lock(memory_cache_mutex_);
    
    memory_profile_cache_[user_id] = profile;
    
    std::cout << "User profile cached for " << user_id << std::endl;
}

std::chrono::system_clock::time_point RedisTimelineCache::GetLastRead(const std::string& user_id) {
    std::lock_guard<std::mutex> lock(memory_cache_mutex_);
    
    auto it = memory_lastread_cache_.find(user_id);
    if (it != memory_lastread_cache_.end()) {
        return it->second;
    }
    
    // Return epoch if no last read time found
    return std::chrono::system_clock::time_point{};
}

void RedisTimelineCache::SetLastRead(const std::string& user_id, std::chrono::system_clock::time_point timestamp) {
    std::lock_guard<std::mutex> lock(memory_cache_mutex_);
    
    memory_lastread_cache_[user_id] = timestamp;
    
    std::cout << "Last read time updated for user " << user_id << std::endl;
}

// ============= SERIALIZATION METHODS =============

std::string RedisTimelineCache::SerializeTimelineItems(const std::vector<RankedTimelineItem>& items) {
    std::ostringstream oss;
    oss << "[";
    
    for (size_t i = 0; i < items.size(); ++i) {
        if (i > 0) oss << ",";
        
        const auto& item = items[i];
        oss << "{"
            << "\"note_id\":\"" << EscapeString(item.note.id()) << "\","
            << "\"author_id\":\"" << EscapeString(item.note.author_id()) << "\","
            << "\"content\":\"" << EscapeString(item.note.content()) << "\","
            << "\"source\":" << static_cast<int>(item.source) << ","
            << "\"final_score\":" << item.final_score << ","
            << "\"injection_reason\":\"" << EscapeString(item.injection_reason) << "\","
            << "\"created_at\":" << item.note.created_at().seconds()
            << "}";
    }
    
    oss << "]";
    return oss.str();
}

std::vector<RankedTimelineItem> RedisTimelineCache::DeserializeTimelineItems(const std::string& data) {
    std::vector<RankedTimelineItem> items;
    
    // TODO: Implement proper JSON parsing
    // For now, return empty vector as placeholder
    // In production, use a JSON library like nlohmann/json or rapidjson
    
    return items;
}

std::string RedisTimelineCache::SerializeUserProfile(const UserEngagementProfile& profile) {
    std::ostringstream oss;
    oss << "{"
        << "\"user_id\":\"" << EscapeString(profile.user_id) << "\","
        << "\"avg_session_length_minutes\":" << profile.avg_session_length_minutes << ","
        << "\"daily_engagement_score\":" << profile.daily_engagement_score << ","
        << "\"last_updated\":" << std::chrono::duration_cast<std::chrono::seconds>(
               profile.last_updated.time_since_epoch()).count()
        << "}";
    
    return oss.str();
}

UserEngagementProfile RedisTimelineCache::DeserializeUserProfile(const std::string& data) {
    UserEngagementProfile profile;
    
    // TODO: Implement proper JSON parsing
    // For now, return empty profile as placeholder
    
    return profile;
}

// ============= KEY GENERATION METHODS =============

std::string RedisTimelineCache::TimelineKey(const std::string& user_id) {
    return "timeline:" + user_id;
}

std::string RedisTimelineCache::ProfileKey(const std::string& user_id) {
    return "profile:" + user_id;
}

std::string RedisTimelineCache::LastReadKey(const std::string& user_id) {
    return "lastread:" + user_id;
}

std::string RedisTimelineCache::AuthorFollowersKey(const std::string& author_id) {
    return "followers:" + author_id;
}

} // namespace sonet::timeline
