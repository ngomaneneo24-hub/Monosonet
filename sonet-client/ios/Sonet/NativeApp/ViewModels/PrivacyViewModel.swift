import Foundation
import Combine

@MainActor
class PrivacyViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var accountVisibility: AccountVisibility = .public
    @Published var emailVisibility: EmailVisibility = .private
    @Published var phoneVisibility: PhoneVisibility = .private
    @Published var profilePictureVisibility: ProfilePictureVisibility = .public
    @Published var bioVisibility: BioVisibility = .public
    @Published var followerCountVisibility: FollowerCountVisibility = .public
    @Published var defaultPostPrivacy: PostPrivacy = .public
    @Published var mediaVisibility: MediaVisibility = .public
    @Published var storyPrivacy: StoryPrivacy = .public
    
    // MARK: - UI State
    @Published var isLoading = false
    @Published var showUpdateAlert = false
    @Published var showErrorAlert = false
    @Published var updateMessage = ""
    @Published var errorMessage = ""
    
    // MARK: - Private Properties
    private let grpcClient: SonetGRPCClient
    private let userDefaults = UserDefaults.standard
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    init(grpcClient: SonetGRPCClient = SonetGRPCClient(configuration: .development)) {
        self.grpcClient = grpcClient
        loadLocalSettings()
    }
    
    // MARK: - Public Methods
    func loadPrivacySettings() {
        Task {
            await loadPrivacySettingsFromServer()
        }
    }
    
    func updateAccountVisibility() {
        Task {
            await updatePrivacySetting(type: .accountVisibility, value: accountVisibility.rawValue)
        }
    }
    
    func updateEmailVisibility() {
        Task {
            await updatePrivacySetting(type: .emailVisibility, value: emailVisibility.rawValue)
        }
    }
    
    func updatePhoneVisibility() {
        Task {
            await updatePrivacySetting(type: .phoneVisibility, value: phoneVisibility.rawValue)
        }
    }
    
    func updateProfilePictureVisibility() {
        Task {
            await updatePrivacySetting(type: .profilePictureVisibility, value: profilePictureVisibility.rawValue)
        }
    }
    
    func updateBioVisibility() {
        Task {
            await updatePrivacySetting(type: .bioVisibility, value: bioVisibility.rawValue)
        }
    }
    
    func updateFollowerCountVisibility() {
        Task {
            await updatePrivacySetting(type: .followerCountVisibility, value: followerCountVisibility.rawValue)
        }
    }
    
    func updateDefaultPostPrivacy() {
        Task {
            await updatePrivacySetting(type: .defaultPostPrivacy, value: defaultPostPrivacy.rawValue)
        }
    }
    
    func updateMediaVisibility() {
        Task {
            await updatePrivacySetting(type: .mediaVisibility, value: mediaVisibility.rawValue)
        }
    }
    
    func updateStoryPrivacy() {
        Task {
            await updatePrivacySetting(type: .storyPrivacy, value: storyPrivacy.rawValue)
        }
    }
    
    func clearError() {
        errorMessage = ""
        showErrorAlert = false
    }
    
    // MARK: - Private Methods
    private func loadLocalSettings() {
        // Load settings from UserDefaults as fallback
        if let accountVisibilityString = userDefaults.string(forKey: "privacy_account_visibility"),
           let visibility = AccountVisibility(rawValue: accountVisibilityString) {
            accountVisibility = visibility
        }
        
        if let emailVisibilityString = userDefaults.string(forKey: "privacy_email_visibility"),
           let visibility = EmailVisibility(rawValue: emailVisibilityString) {
            emailVisibility = visibility
        }
        
        if let phoneVisibilityString = userDefaults.string(forKey: "privacy_phone_visibility"),
           let visibility = PhoneVisibility(rawValue: phoneVisibilityString) {
            phoneVisibility = visibility
        }
        
        if let profilePictureVisibilityString = userDefaults.string(forKey: "privacy_profile_picture_visibility"),
           let visibility = ProfilePictureVisibility(rawValue: profilePictureVisibilityString) {
            profilePictureVisibility = visibility
        }
        
        if let bioVisibilityString = userDefaults.string(forKey: "privacy_bio_visibility"),
           let visibility = BioVisibility(rawValue: bioVisibilityString) {
            bioVisibility = visibility
        }
        
        if let followerCountVisibilityString = userDefaults.string(forKey: "privacy_follower_count_visibility"),
           let visibility = FollowerCountVisibility(rawValue: followerCountVisibilityString) {
            followerCountVisibility = visibility
        }
        
        if let defaultPostPrivacyString = userDefaults.string(forKey: "privacy_default_post_privacy"),
           let privacy = PostPrivacy(rawValue: defaultPostPrivacyString) {
            defaultPostPrivacy = privacy
        }
        
        if let mediaVisibilityString = userDefaults.string(forKey: "privacy_media_visibility"),
           let visibility = MediaVisibility(rawValue: mediaVisibilityString) {
            mediaVisibility = visibility
        }
        
        if let storyPrivacyString = userDefaults.string(forKey: "privacy_story_privacy"),
           let privacy = StoryPrivacy(rawValue: storyPrivacyString) {
            storyPrivacy = privacy
        }
    }
    
    private func loadPrivacySettingsFromServer() async {
        isLoading = true
        
        do {
            let request = GetPrivacySettingsRequest.newBuilder()
                .setUserId("current_user")
                .build()
            
            let response = try await grpcClient.getPrivacySettings(request: request)
            
            if response.success {
                await MainActor.run {
                    updatePrivacySettingsFromResponse(response.settings)
                    showUpdateAlert = true
                    updateMessage = "Privacy settings loaded successfully"
                }
            } else {
                await MainActor.run {
                    errorMessage = response.errorMessage
                    showErrorAlert = true
                }
            }
        } catch {
            await MainActor.run {
                errorMessage = "Failed to load privacy settings: \(error.localizedDescription)"
                showErrorAlert = true
            }
        }
        
        await MainActor.run {
            isLoading = false
        }
    }
    
    private func updatePrivacySetting(type: PrivacySettingType, value: String) async {
        do {
            let request = UpdatePrivacySettingRequest.newBuilder()
                .setUserId("current_user")
                .setSettingType(type.rawValue)
                .setValue(value)
                .build()
            
            let response = try await grpcClient.updatePrivacySetting(request: request)
            
            if response.success {
                await MainActor.run {
                    saveLocalSetting(type: type, value: value)
                    showUpdateAlert = true
                    updateMessage = "Privacy setting updated successfully"
                }
            } else {
                await MainActor.run {
                    errorMessage = response.errorMessage
                    showErrorAlert = true
                }
            }
        } catch {
            await MainActor.run {
                errorMessage = "Failed to update privacy setting: \(error.localizedDescription)"
                showErrorAlert = true
            }
        }
    }
    
    private func updatePrivacySettingsFromResponse(_ settings: GRPCPrivacySettings) {
        if let accountVisibility = AccountVisibility(rawValue: settings.accountVisibility) {
            self.accountVisibility = accountVisibility
        }
        
        if let emailVisibility = EmailVisibility(rawValue: settings.emailVisibility) {
            self.emailVisibility = emailVisibility
        }
        
        if let phoneVisibility = PhoneVisibility(rawValue: settings.phoneVisibility) {
            self.phoneVisibility = phoneVisibility
        }
        
        if let profilePictureVisibility = ProfilePictureVisibility(rawValue: settings.profilePictureVisibility) {
            self.profilePictureVisibility = profilePictureVisibility
        }
        
        if let bioVisibility = BioVisibility(rawValue: settings.bioVisibility) {
            self.bioVisibility = bioVisibility
        }
        
        if let followerCountVisibility = FollowerCountVisibility(rawValue: settings.followerCountVisibility) {
            self.followerCountVisibility = followerCountVisibility
        }
        
        if let defaultPostPrivacy = PostPrivacy(rawValue: settings.defaultPostPrivacy) {
            self.defaultPostPrivacy = defaultPostPrivacy
        }
        
        if let mediaVisibility = MediaVisibility(rawValue: settings.mediaVisibility) {
            self.mediaVisibility = mediaVisibility
        }
        
        if let storyPrivacy = StoryPrivacy(rawValue: settings.storyPrivacy) {
            self.storyPrivacy = storyPrivacy
        }
        
        // Save to local storage
        saveAllLocalSettings()
    }
    
    private func saveLocalSetting(type: PrivacySettingType, value: String) {
        let key = "privacy_\(type.rawValue)"
        userDefaults.set(value, forKey: key)
    }
    
    private func saveAllLocalSettings() {
        saveLocalSetting(type: .accountVisibility, value: accountVisibility.rawValue)
        saveLocalSetting(type: .emailVisibility, value: emailVisibility.rawValue)
        saveLocalSetting(type: .phoneVisibility, value: phoneVisibility.rawValue)
        saveLocalSetting(type: .profilePictureVisibility, value: profilePictureVisibility.rawValue)
        saveLocalSetting(type: .bioVisibility, value: bioVisibility.rawValue)
        saveLocalSetting(type: .followerCountVisibility, value: followerCountVisibility.rawValue)
        saveLocalSetting(type: .defaultPostPrivacy, value: defaultPostPrivacy.rawValue)
        saveLocalSetting(type: .mediaVisibility, value: mediaVisibility.rawValue)
        saveLocalSetting(type: .storyPrivacy, value: storyPrivacy.rawValue)
    }
}

// MARK: - Privacy Setting Types
enum PrivacySettingType: String, CaseIterable {
    case accountVisibility = "account_visibility"
    case emailVisibility = "email_visibility"
    case phoneVisibility = "phone_visibility"
    case profilePictureVisibility = "profile_picture_visibility"
    case bioVisibility = "bio_visibility"
    case followerCountVisibility = "follower_count_visibility"
    case defaultPostPrivacy = "default_post_privacy"
    case mediaVisibility = "media_visibility"
    case storyPrivacy = "story_privacy"
}

// MARK: - gRPC Request/Response Models (Placeholder - replace with actual gRPC types)
struct GetPrivacySettingsRequest {
    let userId: String
    
    static func newBuilder() -> GetPrivacySettingsRequestBuilder {
        return GetPrivacySettingsRequestBuilder()
    }
}

class GetPrivacySettingsRequestBuilder {
    private var userId: String = ""
    
    func setUserId(_ userId: String) -> GetPrivacySettingsRequestBuilder {
        self.userId = userId
        return self
    }
    
    func build() -> GetPrivacySettingsRequest {
        return GetPrivacySettingsRequest(userId: userId)
    }
}

struct GetPrivacySettingsResponse {
    let success: Bool
    let settings: GRPCPrivacySettings
    let errorMessage: String
}

struct UpdatePrivacySettingRequest {
    let userId: String
    let settingType: String
    let value: String
    
    static func newBuilder() -> UpdatePrivacySettingRequestBuilder {
        return UpdatePrivacySettingRequestBuilder()
    }
}

class UpdatePrivacySettingRequestBuilder {
    private var userId: String = ""
    private var settingType: String = ""
    private var value: String = ""
    
    func setUserId(_ userId: String) -> UpdatePrivacySettingRequestBuilder {
        self.userId = userId
        return self
    }
    
    func setSettingType(_ settingType: String) -> UpdatePrivacySettingRequestBuilder {
        self.settingType = settingType
        return self
    }
    
    func setValue(_ value: String) -> UpdatePrivacySettingRequestBuilder {
        self.value = value
        return self
    }
    
    func build() -> UpdatePrivacySettingRequest {
        return UpdatePrivacySettingRequest(userId: userId, settingType: settingType, value: value)
    }
}

struct UpdatePrivacySettingResponse {
    let success: Bool
    let errorMessage: String
}

struct GRPCPrivacySettings {
    let accountVisibility: String
    let emailVisibility: String
    let phoneVisibility: String
    let profilePictureVisibility: String
    let bioVisibility: String
    let followerCountVisibility: String
    let defaultPostPrivacy: String
    let mediaVisibility: String
    let storyPrivacy: String
}