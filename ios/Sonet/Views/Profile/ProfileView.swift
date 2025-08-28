import SwiftUI

struct ProfileView: View {
    @StateObject private var viewModel: ProfileViewModel
    @Environment(\.colorScheme) var colorScheme
    @Environment(\.dismiss) private var dismiss
    
    init(userId: String, grpcClient: SonetGRPCClient) {
        _viewModel = StateObject(wrappedValue: ProfileViewModel(userId: userId, grpcClient: grpcClient))
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 0) {
                    // Profile Header
                    if let profile = viewModel.userProfile {
                        ProfileHeader(
                            profile: profile,
                            isFollowing: viewModel.isFollowing,
                            isBlocked: viewModel.isBlocked,
                            onFollowToggle: { viewModel.toggleFollow() },
                            onBlock: { viewModel.blockUser() },
                            onUnblock: { viewModel.unblockUser() }
                        )
                    }
                    
                    // Profile Tabs
                    ProfileTabs(
                        selectedTab: viewModel.selectedTab,
                        onTabSelected: { viewModel.selectTab($0) }
                    )
                    
                    // Tab Content
                    TabContent(
                        selectedTab: viewModel.selectedTab,
                        posts: viewModel.posts,
                        replies: viewModel.replies,
                        media: viewModel.media,
                        likes: viewModel.likes
                    )
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarBackButtonHidden(true)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "arrow.left")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(.primary)
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    ProfileMoreButton(
                        onShare: { /* Share profile */ },
                        onReport: { /* Report user */ },
                        onBlock: { viewModel.blockUser() }
                    )
                }
            }
            .refreshable {
                viewModel.refreshProfile()
            }
            .overlay(
                Group {
                    if viewModel.isLoading {
                        LoadingView()
                    } else if let error = viewModel.error {
                        ErrorView(error: error, onRetry: { viewModel.refreshProfile() })
                    }
                }
            )
        }
    }
}

// MARK: - Profile Header
struct ProfileHeader: View {
    let profile: UserProfile
    let isFollowing: Bool
    let isBlocked: Bool
    let onFollowToggle: () -> Void
    let onBlock: () -> Void
    let onUnblock: () -> Void
    
    var body: some View {
        VStack(spacing: 0) {
            // Cover Photo
            CoverPhotoView(profile: profile)
            
            // Profile Info
            ProfileInfoView(
                profile: profile,
                isFollowing: isFollowing,
                isBlocked: isBlocked,
                onFollowToggle: onFollowToggle,
                onBlock: onBlock,
                onUnblock: onUnblock
            )
        }
    }
}

// MARK: - Cover Photo
struct CoverPhotoView: View {
    let profile: UserProfile
    
    var body: some View {
        ZStack {
            // Cover photo or gradient
            if !profile.coverPhotoUrl.isEmpty {
                AsyncImage(url: URL(string: profile.coverPhotoUrl)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    LinearGradient(
                        colors: [.blue, .purple],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                }
                .frame(height: 200)
                .clipped()
            } else {
                LinearGradient(
                    colors: [.blue, .purple],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .frame(height: 200)
            }
            
            // Avatar overlay
            VStack {
                Spacer()
                
                HStack {
                    Spacer()
                    
                    AsyncImage(url: URL(string: profile.avatarUrl)) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Circle()
                            .fill(Color(.systemGray4))
                            .overlay(
                                Image(systemName: "person.fill")
                                    .font(.system(size: 40))
                                    .foregroundColor(.secondary)
                            )
                    }
                    .frame(width: 80, height: 80)
                    .clipShape(Circle())
                    .overlay(
                        Circle()
                            .stroke(Color(.systemBackground), lineWidth: 4)
                    )
                    .offset(y: 40)
                    
                    Spacer()
                }
            }
        }
    }
}

// MARK: - Profile Info
struct ProfileInfoView: View {
    let profile: UserProfile
    let isFollowing: Bool
    let isBlocked: Bool
    let onFollowToggle: () -> Void
    let onBlock: () -> Void
    let onUnblock: () -> Void
    
    var body: some View {
        VStack(spacing: 16) {
            // Avatar and action buttons
            HStack {
                Spacer()
                
                // Action buttons
                HStack(spacing: 12) {
                    // Message button
                    Button(action: { /* Navigate to messages */ }) {
                        Image(systemName: "envelope")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.primary)
                            .frame(width: 36, height: 36)
                            .background(
                                Circle()
                                    .fill(Color(.systemGray6))
                            )
                    }
                    
                    // Follow/Following button
                    Button(action: onFollowToggle) {
                        Text(isFollowing ? "Following" : "Follow")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(isFollowing ? .primary : .white)
                            .padding(.horizontal: 20)
                            .padding(.vertical: 8)
                            .background(
                                RoundedRectangle(cornerRadius: 20)
                                    .fill(isFollowing ? Color(.systemGray5) : Color.accentColor)
                            )
                    }
                }
            }
            .padding(.top, 40)
            .padding(.horizontal, 16)
            
            // User info
            VStack(spacing: 12) {
                // Name and verification
                HStack {
                    Text(profile.displayName)
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.primary)
                    
                    if profile.isVerified {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.system(size: 20))
                            .foregroundColor(.blue)
                    }
                    
                    Spacer()
                }
                
                // Username
                HStack {
                    Text("@\(profile.username)")
                        .font(.system(size: 16))
                        .foregroundColor(.secondary)
                    
                    Spacer()
                }
                
                // Bio
                if !profile.bio.isEmpty {
                    HStack {
                        Text(profile.bio)
                            .font(.system(size: 16))
                            .foregroundColor(.primary)
                            .multilineTextAlignment(.leading)
                        
                        Spacer()
                    }
                }
                
                // Stats and info
                HStack(spacing: 20) {
                    // Following
                    Button(action: { /* Navigate to following */ }) {
                        HStack(spacing: 4) {
                            Text("\(profile.followingCount)")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(.primary)
                            
                            Text("Following")
                                .font(.system(size: 16))
                                .foregroundColor(.secondary)
                        }
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    // Followers
                    Button(action: { /* Navigate to followers */ }) {
                        HStack(spacing: 4) {
                            Text("\(profile.followerCount)")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(.primary)
                            
                            Text("Followers")
                                .font(.system(size: 16))
                                .foregroundColor(.secondary)
                        }
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    Spacer()
                }
                
                // Additional info
                if !profile.location.isEmpty || !profile.website.isEmpty {
                    VStack(spacing: 8) {
                        if !profile.location.isEmpty {
                            HStack {
                                Image(systemName: "location")
                                    .font(.system(size: 14))
                                    .foregroundColor(.secondary)
                                
                                Text(profile.location)
                                    .font(.system(size: 14))
                                    .foregroundColor(.secondary)
                                
                                Spacer()
                            }
                        }
                        
                        if !profile.website.isEmpty {
                            HStack {
                                Image(systemName: "link")
                                    .font(.system(size: 14))
                                    .foregroundColor(.secondary)
                                
                                Text(profile.website)
                                    .font(.system(size: 14))
                                    .foregroundColor(.secondary)
                                
                                Spacer()
                            }
                        }
                    }
                }
                
                // Joined date
                HStack {
                    Image(systemName: "calendar")
                        .font(.system(size: 14))
                        .foregroundColor(.secondary)
                    
                    Text("Joined \(profile.createdAt.date.formatted(date: .abbreviated, time: .omitted))")
                        .font(.system(size: 14))
                        .foregroundColor(.secondary)
                    
                    Spacer()
                }
            }
            .padding(.horizontal, 16)
        }
    }
}

// MARK: - Profile Tabs
struct ProfileTabs: View {
    let selectedTab: ProfileViewModel.ProfileTab
    let onTabSelected: (ProfileViewModel.ProfileTab) -> Void
    
    var body: some View {
        VStack(spacing: 0) {
            // Tab buttons
            HStack(spacing: 0) {
                ForEach(ProfileViewModel.ProfileTab.allCases, id: \.self) { tab in
                    ProfileTabButton(
                        tab: tab,
                        isSelected: selectedTab == tab,
                        onTap: { onTabSelected(tab) }
                    )
                }
            }
            
            // Tab indicator
            Rectangle()
                .fill(Color.accentColor)
                .frame(height: 2)
                .frame(maxWidth: .infinity)
                .offset(x: getTabIndicatorOffset())
                .animation(.easeInOut(duration: 0.3), value: selectedTab)
        }
        .background(Color(.systemBackground))
    }
    
    private func getTabIndicatorOffset() -> CGFloat {
        let tabWidth = UIScreen.main.bounds.width / CGFloat(ProfileViewModel.ProfileTab.allCases.count)
        let selectedIndex = CGFloat(ProfileViewModel.ProfileTab.allCases.firstIndex(of: selectedTab) ?? 0)
        return (selectedIndex * tabWidth) - (UIScreen.main.bounds.width / 2) + (tabWidth / 2)
    }
}

// MARK: - Profile Tab Button
struct ProfileTabButton: View {
    let tab: ProfileViewModel.ProfileTab
    let isSelected: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 8) {
                Image(systemName: tab.icon)
                    .font(.system(size: 20, weight: .medium))
                    .foregroundColor(isSelected ? .accentColor : .secondary)
                
                Text(tab.rawValue)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(isSelected ? .accentColor : .secondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Tab Content
struct TabContent: View {
    let selectedTab: ProfileViewModel.ProfileTab
    let posts: [Note]
    let replies: [Note]
    let media: [Note]
    let likes: [Note]
    
    var body: some View {
        Group {
            switch selectedTab {
            case .posts:
                ProfilePostsView(posts: posts)
            case .replies:
                ProfileRepliesView(replies: replies)
            case .media:
                ProfileMediaView(media: media)
            case .likes:
                ProfileLikesView(likes: likes)
            }
        }
        .padding(.top, 16)
    }
}

// MARK: - Profile Posts View
struct ProfilePostsView: View {
    let posts: [Note]
    
    var body: some View {
        if posts.isEmpty {
            EmptyStateView(
                icon: "bubble.left",
                title: "No posts yet",
                message: "When \("User") posts, they'll show up here."
            )
        } else {
            LazyVStack(spacing: 0) {
                ForEach(posts, id: \.noteId) { post in
                    ProfileNoteRow(note: post)
                }
            }
        }
    }
}

// MARK: - Profile Replies View
struct ProfileRepliesView: View {
    let replies: [Note]
    
    var body: some View {
        if replies.isEmpty {
            EmptyStateView(
                icon: "arrowshape.turn.up.left",
                title: "No replies yet",
                message: "When \("User") replies, they'll show up here."
            )
        } else {
            LazyVStack(spacing: 0) {
                ForEach(replies, id: \.noteId) { reply in
                    ProfileNoteRow(note: reply)
                }
            }
        }
    }
}

// MARK: - Profile Media View
struct ProfileMediaView: View {
    let media: [Note]
    
    var body: some View {
        if media.isEmpty {
            EmptyStateView(
                icon: "photo",
                title: "No media yet",
                message: "When \("User") posts photos or videos, they'll show up here."
            )
        } else {
            LazyVStack(spacing: 0) {
                ForEach(media, id: \.noteId) { mediaNote in
                    ProfileNoteRow(note: mediaNote)
                }
            }
        }
    }
}

// MARK: - Profile Likes View
struct ProfileLikesView: View {
    let likes: [Note]
    
    var body: some View {
        if likes.isEmpty {
            EmptyStateView(
                icon: "heart",
                title: "No likes yet",
                message: "Likes from \("User") will show up here."
            )
        } else {
            LazyVStack(spacing: 0) {
                ForEach(likes, id: \.noteId) { likedNote in
                    ProfileNoteRow(note: likedNote)
                }
            }
        }
    }
}

// MARK: - Profile Note Row
struct ProfileNoteRow: View {
    let note: Note
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack(spacing: 12) {
                // Author avatar
                AsyncImage(url: URL(string: "")) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Circle()
                        .fill(Color(.systemGray4))
                        .overlay(
                            Image(systemName: "person.fill")
                                .font(.system(size: 16))
                                .foregroundColor(.secondary)
                        )
                }
                .frame(width: 32, height: 32)
                .clipShape(Circle())
                
                // Author info
                VStack(alignment: .leading, spacing: 2) {
                    Text("User") // This would come from a separate user lookup
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.primary)
                    
                    Text(timeAgoString)
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                // More options
                Button(action: { /* Show more options */ }) {
                    Image(systemName: "ellipsis")
                        .font(.system(size: 14))
                        .foregroundColor(.secondary)
                }
                .buttonStyle(PlainButtonStyle())
            }
            
            // Content
            Text(note.content)
                .font(.system(size: 15))
                .foregroundColor(.primary)
                .lineLimit(3)
                .multilineTextAlignment(.leading)
            
            // Media preview
            if !note.media.isEmpty {
                MediaPreviewView(media: note.media)
            }
            
            // Engagement
            EngagementRow(note: note)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color(.systemBackground))
    }
    
    private var timeAgoString: String {
        let now = Date()
        let noteDate = note.createdAt.date
        let timeInterval = now.timeIntervalSince(noteDate)
        
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

// MARK: - Media Preview View
struct MediaPreviewView: View {
    let media: [MediaItem]
    
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(media.prefix(3), id: \.mediaId) { mediaItem in
                    AsyncImage(url: URL(string: mediaItem.url)) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Rectangle()
                            .fill(Color(.systemGray4))
                            .overlay(
                                Image(systemName: "photo")
                                    .font(.system(size: 20))
                                    .foregroundColor(.secondary)
                            )
                    }
                    .frame(width: 80, height: 80)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
            .padding(.horizontal, 16)
        }
    }
}

// MARK: - Engagement Row
struct EngagementRow: View {
    let note: Note
    
    var body: some View {
        HStack(spacing: 20) {
            // Like button
            Button(action: { /* Toggle like */ }) {
                HStack(spacing: 6) {
                    Image(systemName: note.engagement.isLiked ? "heart.fill" : "heart")
                        .font(.system(size: 14))
                        .foregroundColor(note.engagement.isLiked ? .red : .secondary)
                    
                    Text("\(note.engagement.likeCount)")
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                }
            }
            .buttonStyle(PlainButtonStyle())
            
            // Reply button
            Button(action: { /* Navigate to reply */ }) {
                HStack(spacing: 6) {
                    Image(systemName: "bubble.left")
                        .font(.system(size: 14))
                        .foregroundColor(.secondary)
                    
                    Text("\(note.engagement.replyCount)")
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                }
            }
            .buttonStyle(PlainButtonStyle())
            
            // Repost button
            Button(action: { /* Toggle repost */ }) {
                HStack(spacing: 6) {
                    Image(systemName: note.engagement.isReposted ? "arrow.2.squarepath.fill" : "arrow.2.squarepath")
                        .font(.system(size: 14))
                        .foregroundColor(note.engagement.isReposted ? .green : .secondary)
                    
                    Text("\(note.engagement.repostCount)")
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                }
            }
            .buttonStyle(PlainButtonStyle())
            
            Spacer()
            
            // Share button
            Button(action: { /* Share note */ }) {
                Image(systemName: "square.and.arrow.up")
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
            }
            .buttonStyle(PlainButtonStyle())
        }
        .padding(.horizontal, 16)
    }
}

// MARK: - Profile More Button
struct ProfileMoreButton: View {
    let onShare: () -> Void
    let onReport: () -> Void
    let onBlock: () -> Void
    
    @State private var showingActionSheet = false
    
    var body: some View {
        Button(action: { showingActionSheet = true }) {
            Image(systemName: "ellipsis")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(.primary)
        }
        .actionSheet(isPresented: $showingActionSheet) {
            ActionSheet(
                title: Text("Profile Options"),
                buttons: [
                    .default(Text("Share Profile"), action: onShare),
                    .destructive(Text("Report User"), action: onReport),
                    .destructive(Text("Block User"), action: onBlock),
                    .cancel()
                ]
            )
        }
    }
}

// MARK: - Empty State View
struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 48))
                .foregroundColor(.secondary)
            
            Text(title)
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.primary)
            
            Text(message)
                .font(.system(size: 16))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground))
    }
}

// MARK: - Loading View
struct LoadingView: View {
    var body: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
            
            Text("Loading profile...")
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
            
            Text("Profile Error")
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

// MARK: - Preview
struct ProfileView_Previews: PreviewProvider {
    static var previews: some View {
        ProfileView(
            userId: "user123",
            grpcClient: SonetGRPCClient(configuration: .development)
        )
    }
}