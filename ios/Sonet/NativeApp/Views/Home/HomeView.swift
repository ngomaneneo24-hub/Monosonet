import SwiftUI

struct HomeView: View {
    @StateObject private var viewModel: HomeViewModel
    @State private var showingMeatballMenu = false
    
    init(grpcClient: SonetGRPCClient) {
        _viewModel = StateObject(wrappedValue: HomeViewModel(grpcClient: grpcClient))
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Custom header with Sonet logo, search button, and meatball menu
                HomeHeader(
                    showingMeatballMenu: $showingMeatballMenu,
                    searchQuery: .constant(""),
                    onSearch: { _ in }
                )
                
                // Content
                if viewModel.isLoading {
                    LoadingView()
                } else if let error = viewModel.error {
                    ErrorView(error: error, onRetry: { viewModel.loadFeed() })
                } else if viewModel.feed.isEmpty {
                    EmptyFeedView()
                } else {
                    FeedView(
                        feed: viewModel.feed,
                        onRefresh: { viewModel.loadFeed() },
                        onLoadMore: { viewModel.loadMoreContent() }
                    )
                }
            }
            .navigationBarHidden(true)
            .background(Color(.systemBackground))
        }
        .sheet(isPresented: $showingMeatballMenu) {
            MeatballMenu(isPresented: $showingMeatballMenu)
        }
        .onAppear {
            viewModel.loadFeed()
        }
    }
}

// MARK: - Home Header
struct HomeHeader: View {
    @Binding var showingMeatballMenu: Bool
    @Binding var searchQuery: String
    let onSearch: (String) -> Void
    
    var body: some View {
        HStack {
            // Sonet logo on the left
            SonetLogo(size: .medium, color: .primary)
            
            Spacer()
            
            // Search button
            Button(action: {
                // Navigate to search
            }) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 20))
                    .foregroundColor(.primary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 20))
            }
            
            // Meatball menu on the right
            MeatballMenuButton {
                showingMeatballMenu = true
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color(.systemBackground))
        .overlay(
            Rectangle()
                .fill(Color(.separator))
                .frame(height: 0.5),
            alignment: .bottom
        )
    }
}

// MARK: - Feed View
struct FeedView: View {
    let feed: [Note]
    let onRefresh: () -> Void
    let onLoadMore: () -> Void
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(feed) { note in
                    NoteCard(note: note)
                }
                
                // Load more button
                Button("Load More") {
                    onLoadMore()
                }
                .foregroundColor(.accentColor)
                .padding(.vertical, 16)
            }
            // Avoid global horizontal padding so media can render full-bleed
            .padding(.vertical, 8)
        }
        .refreshable {
            onRefresh()
        }
    }
}

// MARK: - Note Card
struct NoteCard: View {
    let note: Note
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // User info
            HStack {
                AsyncImage(url: URL(string: note.author.avatarUrl)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Circle()
                        .fill(Color(.systemGray4))
                        .overlay(
                            Image(systemName: "person.fill")
                                .foregroundColor(.secondary)
                        )
                }
                .frame(width: 40, height: 40)
                .clipShape(Circle())
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(note.author.displayName)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.primary)
                    
                    Text("@\(note.author.username)")
                        .font(.system(size: 14))
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Text(timeAgoString)
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
            }
            
            // Content
            Text(note.content)
                .font(.system(size: 16))
                .foregroundColor(.primary)
                .multilineTextAlignment(.leading)
                .padding(.horizontal, 12)
            
            // Media (if any)
            if !note.media.isEmpty {
                // Full-bleed carousel
                MediaCarouselView(media: note.media)
            }
            
            // Actions
            HStack(spacing: 20) {
                Button(action: { /* Like */ }) {
                    HStack(spacing: 4) {
                        Image(systemName: "heart")
                            .font(.system(size: 16))
                        Text("\(note.likeCount)")
                            .font(.system(size: 14))
                    }
                    .foregroundColor(.secondary)
                }
                
                Button(action: { /* Reply */ }) {
                    HStack(spacing: 4) {
                        Image(systemName: "message")
                            .font(.system(size: 16))
                        Text("\(note.replyCount)")
                            .font(.system(size: 14))
                    }
                    .foregroundColor(.secondary)
                }
                
                Button(action: { /* Repost */ }) {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.2.squarepath")
                            .font(.system(size: 16))
                        Text("\(note.repostCount)")
                            .font(.system(size: 14))
                    }
                    .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Button(action: { /* Share */ }) {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 16))
                        .foregroundColor(.secondary)
                }
            }
            .padding(.horizontal, 0) // align with media left edge
        }
        .padding(.vertical, 8)
        .background(Color(.systemBackground))
    }
    
    private var timeAgoString: String {
        let now = Date()
        let timeInterval = now.timeIntervalSince(note.timestamp)
        
        if timeInterval < 60 {
            return "now"
        } else if timeInterval < 3600 {
            let minutes = Int(timeInterval / 60)
            return "\(minutes)m"
        } else if timeInterval < 86400 {
            let hours = Int(timeInterval / 3600)
            return "\(hours)h"
        } else if timeInterval < 2592000 {
            let days = Int(timeInterval / 86400)
            return "\(days)d"
        } else {
            let months = Int(timeInterval / 2592000)
            return "\(months)mo"
        }
    }
}

// MARK: - Media Carousel View
import AVKit

struct MediaCarouselView: View {
    let media: [MediaItem]

    @State private var currentIndex: Int = 0

    var body: some View {
        VStack(spacing: 8) {
            // Full-bleed pager
            TabView(selection: $currentIndex) {
                ForEach(Array(media.enumerated()), id: \._0) { index, item in
                    MediaPage(item: item)
                        .frame(maxWidth: .infinity)
                        .aspectRatio(1, contentMode: .fit)
                        .clipped()
                        .tag(index)
                }
            }
            .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
            .frame(maxWidth: .infinity)
            .listRowInsets(EdgeInsets())
            .padding(.horizontal, 0)

            // Page indicator aligned to media edges
            HStack(spacing: 6) {
                ForEach(0..<media.count, id: \.self) { i in
                    Circle()
                        .fill(i == currentIndex ? Color.primary : Color.secondary.opacity(0.4))
                        .frame(width: 6, height: 6)
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 12)
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 0)
    }
}

private struct MediaPage: View {
    let item: MediaItem
    @State private var player: AVPlayer?
    @State private var isPlaying: Bool = false
    @State private var isMuted: Bool = true

    var body: some View {
        Group {
            if item.type == .video, let url = URL(string: item.url) {
                ZStack {
                    VideoPlayer(player: player)
                        .onAppear {
                            if player == nil {
                                let p = AVPlayer(url: url)
                                p.actionAtItemEnd = .none
                                p.isMuted = true
                                player = p
                                player?.play()
                                isPlaying = true
                                NotificationCenter.default.addObserver(forName: .AVPlayerItemDidPlayToEndTime, object: p.currentItem, queue: .main) { _ in
                                    p.seek(to: .zero)
                                    p.play()
                                }
                            } else {
                                player?.play()
                                isPlaying = true
                            }
                        }
                        .onDisappear {
                            player?.pause()
                            isPlaying = false
                        }

                    // Minimal overlay gesture: tap toggles mute/unmute
                    Color.clear.contentShape(Rectangle())
                        .onTapGesture {
                            isMuted.toggle()
                            player?.isMuted = isMuted
                        }
                }
            } else if let url = URL(string: item.url) {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .scaledToFill()
                } placeholder: {
                    ProgressView().progressViewStyle(.circular)
                }
            } else {
                Color.gray.opacity(0.1)
            }
        }
    }
}

// MARK: - Loading View
struct LoadingView: View {
    var body: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
            
            Text("Loading your feed...")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground))
    }
}

// MARK: - Error View
struct ErrorView: View {
    let error: String
    let onRetry: () -> Void
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundColor(.orange)
            
            Text("Error")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.primary)
            
            Text(error)
                .font(.system(size: 16))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            
            Button("Try Again", action: onRetry)
                .foregroundColor(.white)
                .padding(.horizontal, 24)
                .padding(.vertical, 12)
                .background(
                    RoundedRectangle(cornerRadius: 20)
                        .fill(Color.accentColor)
                )
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground))
    }
}

// MARK: - Empty Feed View
struct EmptyFeedView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "newspaper")
                .font(.system(size: 60))
                .foregroundColor(.secondary)
            
            Text("No posts yet")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.primary)
            
            Text("Follow some people to see their posts in your feed")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground))
    }
}

// MARK: - Preview
struct HomeView_Previews: PreviewProvider {
    static var previews: some View {
        HomeView(
            grpcClient: SonetGRPCClient(configuration: .development)
        )
    }
}