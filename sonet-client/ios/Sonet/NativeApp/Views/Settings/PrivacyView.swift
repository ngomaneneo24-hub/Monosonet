import SwiftUI

struct PrivacyView: View {
    @StateObject private var viewModel = PrivacyViewModel()
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            List {
                // Account Privacy Section
                Section {
                    NavigationLink("Account Privacy") {
                        AccountPrivacyView(viewModel: viewModel)
                    }
                    
                    NavigationLink("Profile Privacy") {
                        ProfilePrivacyView(viewModel: viewModel)
                    }
                    
                    NavigationLink("Content Privacy") {
                        ContentPrivacyView(viewModel: viewModel)
                    }
                } header: {
                    Text("Privacy Controls")
                } footer: {
                    Text("Control who can see your account, profile, and content")
                }
                
                // Discovery Section
                Section {
                    NavigationLink("Discoverability") {
                        DiscoverabilityView(viewModel: viewModel)
                    }
                    
                    NavigationLink("Search & Tags") {
                        SearchAndTagsView(viewModel: viewModel)
                    }
                    
                    NavigationLink("Location Privacy") {
                        LocationPrivacyView(viewModel: viewModel)
                    }
                } header: {
                    Text("Discovery & Search")
                } footer: {
                    Text("Control how others can find and discover you")
                }
                
                // Interaction Privacy Section
                Section {
                    NavigationLink("Who Can Contact You") {
                        ContactPrivacyView(viewModel: viewModel)
                    }
                    
                    NavigationLink("Who Can Follow You") {
                        FollowPrivacyView(viewModel: viewModel)
                    }
                    
                    NavigationLink("Mention & Tag Controls") {
                        MentionTagControlsView(viewModel: viewModel)
                    }
                } header: {
                    Text("Interaction Controls")
                } footer: {
                    Text("Control who can interact with you and how")
                }
                
                // Data & Analytics Section
                Section {
                    NavigationLink("Data Sharing") {
                        DataSharingView(viewModel: viewModel)
                    }
                    
                    NavigationLink("Analytics & Insights") {
                        AnalyticsPrivacyView(viewModel: viewModel)
                    }
                    
                    NavigationLink("Third-Party Apps") {
                        ThirdPartyAppsView(viewModel: viewModel)
                    }
                } header: {
                    Text("Data & Analytics")
                } footer: {
                    Text("Control how your data is used and shared")
                }
                
                // Privacy History Section
                Section {
                    NavigationLink("Privacy Changes History") {
                        PrivacyHistoryView(viewModel: viewModel)
                    }
                    
                    NavigationLink("Data Export") {
                        DataExportView(viewModel: viewModel)
                    }
                    
                    NavigationLink("Account Deletion") {
                        AccountDeletionView(viewModel: viewModel)
                    }
                } header: {
                    Text("Privacy Management")
                } footer: {
                    Text("View your privacy history and manage your data")
                }
            }
            .navigationTitle("Privacy")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
        .onAppear {
            viewModel.loadPrivacySettings()
        }
        .alert("Privacy Update", isPresented: $viewModel.showUpdateAlert) {
            Button("OK") { }
        } message: {
            Text(viewModel.updateMessage)
        }
        .alert("Error", isPresented: $viewModel.showErrorAlert) {
            Button("OK") { viewModel.clearError() }
        } message: {
            Text(viewModel.errorMessage)
        }
    }
}

// MARK: - Account Privacy View
struct AccountPrivacyView: View {
    @ObservedObject var viewModel: PrivacyViewModel
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Account Visibility")
                        .font(.headline)
                    
                    Text("Control who can see your account exists and basic information")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Picker("Account Visibility", selection: $viewModel.accountVisibility) {
                    ForEach(AccountVisibility.allCases, id: \.self) { visibility in
                        VStack(alignment: .leading) {
                            Text(visibility.displayName)
                            Text(visibility.description)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .tag(visibility)
                    }
                }
                .pickerStyle(.navigationLink)
                .onChange(of: viewModel.accountVisibility) { _ in
                    viewModel.updateAccountVisibility()
                }
            } header: {
                Text("Account Settings")
            }
            
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Email Privacy")
                        .font(.headline)
                    
                    Text("Control who can see your email address")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Picker("Email Visibility", selection: $viewModel.emailVisibility) {
                    ForEach(EmailVisibility.allCases, id: \.self) { visibility in
                        Text(visibility.displayName).tag(visibility)
                    }
                }
                .pickerStyle(.navigationLink)
                .onChange(of: viewModel.emailVisibility) { _ in
                    viewModel.updateEmailVisibility()
                }
            } header: {
                Text("Contact Information")
            }
            
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Phone Number Privacy")
                        .font(.headline)
                    
                    Text("Control who can see your phone number")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Picker("Phone Visibility", selection: $viewModel.phoneVisibility) {
                    ForEach(PhoneVisibility.allCases, id: \.self) { visibility in
                        Text(visibility.displayName).tag(visibility)
                    }
                }
                .pickerStyle(.navigationLink)
                .onChange(of: viewModel.phoneVisibility) { _ in
                    viewModel.updatePhoneVisibility()
                }
            } header: {
                Text("Phone Settings")
            }
        }
        .navigationTitle("Account Privacy")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Done") { dismiss() }
            }
        }
    }
}

// MARK: - Profile Privacy View
struct ProfilePrivacyView: View {
    @ObservedObject var viewModel: PrivacyViewModel
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Profile Picture Privacy")
                        .font(.headline)
                    
                    Text("Control who can see your profile picture")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Picker("Profile Picture Visibility", selection: $viewModel.profilePictureVisibility) {
                    ForEach(ProfilePictureVisibility.allCases, id: \.self) { visibility in
                        Text(visibility.displayName).tag(visibility)
                    }
                }
                .pickerStyle(.navigationLink)
                .onChange(of: viewModel.profilePictureVisibility) { _ in
                    viewModel.updateProfilePictureVisibility()
                }
            } header: {
                Text("Profile Media")
            }
            
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Bio Privacy")
                        .font(.headline)
                    
                    Text("Control who can see your bio and description")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Picker("Bio Visibility", selection: $viewModel.bioVisibility) {
                    ForEach(BioVisibility.allCases, id: \.self) { visibility in
                        Text(visibility.displayName).tag(visibility)
                    }
                }
                .pickerStyle(.navigationLink)
                .onChange(of: viewModel.bioVisibility) { _ in
                    viewModel.updateBioVisibility()
                }
            } header: {
                Text("Profile Information")
            }
            
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Follower Count Privacy")
                        .font(.headline)
                    
                    Text("Control who can see your follower and following counts")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Picker("Follower Count Visibility", selection: $viewModel.followerCountVisibility) {
                    ForEach(FollowerCountVisibility.allCases, id: \.self) { visibility in
                        Text(visibility.displayName).tag(visibility)
                    }
                }
                .pickerStyle(.navigationLink)
                .onChange(of: viewModel.followerCountVisibility) { _ in
                    viewModel.updateFollowerCountVisibility()
                }
            } header: {
                Text("Social Metrics")
            }
        }
        .navigationTitle("Profile Privacy")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Done") { dismiss() }
            }
        }
    }
}

// MARK: - Content Privacy View
struct ContentPrivacyView: View {
    @ObservedObject var viewModel: PrivacyViewModel
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Post Privacy")
                        .font(.headline)
                    
                    Text("Control who can see your posts and content")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Picker("Default Post Privacy", selection: $viewModel.defaultPostPrivacy) {
                    ForEach(PostPrivacy.allCases, id: \.self) { privacy in
                        VStack(alignment: .leading) {
                            Text(privacy.displayName)
                            Text(privacy.description)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .tag(privacy)
                    }
                }
                .pickerStyle(.navigationLink)
                .onChange(of: viewModel.defaultPostPrivacy) { _ in
                    viewModel.updateDefaultPostPrivacy()
                }
            } header: {
                Text("Content Settings")
            }
            
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Media Privacy")
                        .font(.headline)
                    
                    Text("Control who can see your photos and videos")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Picker("Media Visibility", selection: $viewModel.mediaVisibility) {
                    ForEach(MediaVisibility.allCases, id: \.self) { visibility in
                        Text(visibility.displayName).tag(visibility)
                    }
                }
                .pickerStyle(.navigationLink)
                .onChange(of: viewModel.mediaVisibility) { _ in
                    viewModel.updateMediaVisibility()
                }
            } header: {
                Text("Media Content")
            }
            
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Story Privacy")
                        .font(.headline)
                    
                    Text("Control who can see your stories")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Picker("Story Privacy", selection: $viewModel.storyPrivacy) {
                    ForEach(StoryPrivacy.allCases, id: \.self) { privacy in
                        Text(privacy.displayName).tag(privacy)
                    }
                }
                .pickerStyle(.navigationLink)
                .onChange(of: viewModel.storyPrivacy) { _ in
                    viewModel.updateStoryPrivacy()
                }
            } header: {
                Text("Stories")
            }
        }
        .navigationTitle("Content Privacy")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Done") { dismiss() }
            }
        }
    }
}

// MARK: - Privacy Enums
enum AccountVisibility: String, CaseIterable {
    case public = "public"
    case friends = "friends"
    case private = "private"
    
    var displayName: String {
        switch self {
        case .public: return "Public"
        case .friends: return "Friends Only"
        case .private: return "Private"
        }
    }
    
    var description: String {
        switch self {
        case .public: return "Anyone can see your account"
        case .friends: return "Only your friends can see your account"
        case .private: return "Only you can see your account"
        }
    }
}

enum EmailVisibility: String, CaseIterable {
    case public = "public"
    case friends = "friends"
    case private = "private"
    
    var displayName: String {
        switch self {
        case .public: return "Public"
        case .friends: return "Friends Only"
        case .private: return "Private"
        }
    }
}

enum PhoneVisibility: String, CaseIterable {
    case public = "public"
    case friends = "friends"
    case private = "private"
    
    var displayName: String {
        switch self {
        case .public: return "Public"
        case .friends: return "Friends Only"
        case .private: return "Private"
        }
    }
}

enum ProfilePictureVisibility: String, CaseIterable {
    case public = "public"
    case friends = "friends"
    case private = "private"
    
    var displayName: String {
        switch self {
        case .public: return "Public"
        case .friends: return "Friends Only"
        case .private: return "Private"
        }
    }
}

enum BioVisibility: String, CaseIterable {
    case public = "public"
    case friends = "friends"
    case private = "private"
    
    var displayName: String {
        switch self {
        case .public: return "Public"
        case .friends: return "Friends Only"
        case .private: return "Private"
        }
    }
}

enum FollowerCountVisibility: String, CaseIterable {
    case public = "public"
    case friends = "friends"
    case private = "private"
    
    var displayName: String {
        switch self {
        case .public: return "Public"
        case .friends: return "Friends Only"
        case .private: return "Private"
        }
    }
}

enum PostPrivacy: String, CaseIterable {
    case public = "public"
    case friends = "friends"
    case private = "private"
    
    var displayName: String {
        switch self {
        case .public: return "Public"
        case .friends: return "Friends Only"
        case .private: return "Private"
        }
    }
    
    var description: String {
        switch self {
        case .public: return "Anyone can see your posts"
        case .friends: return "Only your friends can see your posts"
        case .private: return "Only you can see your posts"
        }
    }
}

enum MediaVisibility: String, CaseIterable {
    case public = "public"
    case friends = "friends"
    case private = "private"
    
    var displayName: String {
        switch self {
        case .public: return "Public"
        case .friends: return "Friends Only"
        case .private: return "Private"
        }
    }
}

enum StoryPrivacy: String, CaseIterable {
    case public = "public"
    case friends = "friends"
    case private = "private"
    
    var displayName: String {
        switch self {
        case .public: return "Public"
        case .friends: return "Friends Only"
        case .private: return "Private"
        }
    }
}

// MARK: - Placeholder Views (to be implemented)
struct DiscoverabilityView: View {
    var body: some View {
        Text("Discoverability Settings")
            .navigationTitle("Discoverability")
    }
}

struct SearchAndTagsView: View {
    var body: some View {
        Text("Search & Tags Settings")
            .navigationTitle("Search & Tags")
    }
}

struct LocationPrivacyView: View {
    var body: some View {
        Text("Location Privacy Settings")
            .navigationTitle("Location Privacy")
    }
}

struct ContactPrivacyView: View {
    var body: some View {
        Text("Contact Privacy Settings")
            .navigationTitle("Contact Privacy")
    }
}

struct FollowPrivacyView: View {
    var body: some View {
        Text("Follow Privacy Settings")
            .navigationTitle("Follow Privacy")
    }
}

struct MentionTagControlsView: View {
    var body: some View {
        Text("Mention & Tag Controls")
            .navigationTitle("Mention & Tags")
    }
}

struct DataSharingView: View {
    var body: some View {
        Text("Data Sharing Settings")
            .navigationTitle("Data Sharing")
    }
}

struct AnalyticsPrivacyView: View {
    var body: some View {
        Text("Analytics Privacy Settings")
            .navigationTitle("Analytics Privacy")
    }
}

struct ThirdPartyAppsView: View {
    var body: some View {
        Text("Third-Party Apps")
            .navigationTitle("Third-Party Apps")
    }
}

struct PrivacyHistoryView: View {
    var body: some View {
        Text("Privacy Changes History")
            .navigationTitle("Privacy History")
    }
}

struct DataExportView: View {
    var body: some View {
        Text("Data Export")
            .navigationTitle("Data Export")
    }
}

struct AccountDeletionView: View {
    var body: some View {
        Text("Account Deletion")
            .navigationTitle("Account Deletion")
    }
}