import Foundation
import SwiftUI
import Combine

@MainActor
class HomeViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var selectedFeed: FeedType = .following
    @Published var notes: [SonetNote] = []
    @Published var isLoading = false
    @Published var error: Error?
    @Published var hasMoreContent = true
    
    // MARK: - Private Properties
    private var cancellables = Set<AnyCancellable>()
    private var currentPage = 0
    private let pageSize = 20
    private var isLoadingMore = false
    
    // MARK: - Initialization
    init() {
        setupFeedObservers()
    }
    
    // MARK: - Public Methods
    func loadFeed() {
        guard !isLoading else { return }
        
        isLoading = true
        error = nil
        currentPage = 0
        
        Task {
            do {
                let newNotes = try await fetchNotes(for: selectedFeed, page: currentPage)
                notes = newNotes
                hasMoreContent = newNotes.count >= pageSize
            } catch {
                self.error = error
            }
            
            isLoading = false
        }
    }
    
    func refreshFeed() {
        loadFeed()
    }
    
    func loadMoreNotes() {
        guard !isLoadingMore && hasMoreContent else { return }
        
        isLoadingMore = true
        currentPage += 1
        
        Task {
            do {
                let moreNotes = try await fetchNotes(for: selectedFeed, page: currentPage)
                notes.append(contentsOf: moreNotes)
                hasMoreContent = moreNotes.count >= pageSize
            } catch {
                // Don't show error for load more, just log it
                print("Failed to load more notes: \(error)")
            }
            
            isLoadingMore = false
        }
    }
    
    func selectFeed(_ feed: FeedType) {
        selectedFeed = feed
        loadFeed()
    }
    
    // MARK: - Private Methods
    private func setupFeedObservers() {
        // Observe feed changes and reload if needed
        $selectedFeed
            .dropFirst() // Skip initial value
            .sink { [weak self] _ in
                self?.loadFeed()
            }
            .store(in: &cancellables)
    }
    
    private func fetchNotes(for feed: FeedType, page: Int) async throws -> [SonetNote] {
        // Simulate API call - replace with actual Sonet API
        try await Task.sleep(nanoseconds: 1_000_000_000) // 1 second
        
        // Generate mock notes for demonstration
        return generateMockNotes(for: feed, page: page)
    }
    
    private func generateMockNotes(for feed: FeedType, page: Int) -> [SonetNote] {
        let startIndex = page * pageSize
        var mockNotes: [SonetNote] = []
        
        for i in 0..<pageSize {
            let noteIndex = startIndex + i
            
            // Create mock author
            let author = SonetUser(
                id: "user_\(noteIndex)",
                username: "user\(noteIndex)",
                displayName: "User \(noteIndex)",
                avatarURL: URL(string: "https://picsum.photos/100/100?random=\(noteIndex)"),
                isVerified: noteIndex % 5 == 0, // Every 5th user is verified
                createdAt: Date().addingTimeInterval(-Double(noteIndex * 3600))
            )
            
            // Create mock note content
            let noteTexts = [
                "Just had an amazing day exploring the city! 🌆 #adventure #citylife",
                "Working on some exciting new projects. Can't wait to share more details! 💻",
                "Beautiful sunset this evening. Nature never fails to amaze me. 🌅",
                "Great conversation with friends today. Good company makes everything better. 👥",
                "Learning something new every day. Growth mindset is key! 📚",
                "Coffee and code - the perfect combination for productivity! ☕️",
                "Sometimes you need to take a step back to see the bigger picture. 🎯",
                "Grateful for all the amazing people in my life. 🙏",
                "New ideas are flowing today. Creativity is a beautiful thing! 💡",
                "Taking time to appreciate the little moments. Life is made of these. ✨"
            ]
            
            let noteText = noteTexts[noteIndex % noteTexts.count]
            
            // Create mock media (some notes have media, some don't)
            let media: [MediaItem]? = noteIndex % 3 == 0 ? [
                MediaItem(
                    id: "media_\(noteIndex)_1",
                    url: URL(string: "https://picsum.photos/400/300?random=\(noteIndex * 2)")!,
                    type: .image,
                    altText: "Random image \(noteIndex)"
                )
            ] : nil
            
            // Create mock note
            let note = SonetNote(
                id: "note_\(noteIndex)",
                text: noteText,
                author: author,
                createdAt: Date().addingTimeInterval(-Double(noteIndex * 1800)), // 30 min intervals
                likeCount: Int.random(in: 0...100),
                repostCount: Int.random(in: 0...50),
                replyCount: Int.random(in: 0...25),
                media: media,
                isLiked: false,
                isReposted: false
            )
            
            mockNotes.append(note)
        }
        
        return mockNotes
    }
}

// MARK: - Feed Type
enum FeedType: String, CaseIterable {
    case following = "following"
    case forYou = "for_you"
    case trending = "trending"
    case latest = "latest"
    
    var displayName: String {
        switch self {
        case .following: return "Following"
        case .forYou: return "For You"
        case .trending: return "Trending"
        case .latest: return "Latest"
        }
    }
    
    var iconName: String {
        switch self {
        case .following: return "person.2"
        case .forYou: return "sparkles"
        case .trending: return "chart.line.uptrend.xyaxis"
        case .latest: return "clock"
        }
    }
}

// MARK: - Sonet Note Model
struct SonetNote: Identifiable, Codable, Equatable {
    let id: String
    let text: String
    let author: SonetUser
    let createdAt: Date
    let likeCount: Int
    let repostCount: Int
    let replyCount: Int
    let media: [MediaItem]?
    var isLiked: Bool
    var isReposted: Bool
    
    var timeAgo: String {
        createdAt.timeAgoDisplay()
    }
}

// MARK: - Media Item Model
struct MediaItem: Identifiable, Codable, Equatable {
    let id: String
    let url: URL
    let type: MediaType
    let altText: String?
    
    enum MediaType: String, Codable, CaseIterable {
        case image = "image"
        case video = "video"
        case gif = "gif"
    }
}

// MARK: - Date Extension
extension Date {
    func timeAgoDisplay() -> String {
        let now = Date()
        let timeInterval = now.timeIntervalSince(self)
        
        let minute: TimeInterval = 60
        let hour: TimeInterval = minute * 60
        let day: TimeInterval = hour * 24
        let week: TimeInterval = day * 7
        let month: TimeInterval = day * 30
        let year: TimeInterval = day * 365
        
        switch timeInterval {
        case 0..<minute:
            return "Just now"
        case minute..<hour:
            let minutes = Int(timeInterval / minute)
            return "\(minutes)m ago"
        case hour..<day:
            let hours = Int(timeInterval / hour)
            return "\(hours)h ago"
        case day..<week:
            let days = Int(timeInterval / day)
            return "\(days)d ago"
        case week..<month:
            let weeks = Int(timeInterval / week)
            return "\(weeks)w ago"
        case month..<year:
            let months = Int(timeInterval / month)
            return "\(months)mo ago"
        default:
            let years = Int(timeInterval / year)
            return "\(years)y ago"
        }
    }
}