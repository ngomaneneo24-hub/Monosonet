import SwiftUI

struct SafetyView: View {
    @StateObject private var viewModel = SafetyViewModel()
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            List {
                // Content Safety Section
                Section {
                    NavigationLink("Content Filtering") {
                        ContentFilteringView(viewModel: viewModel)
                    }
                    
                    NavigationLink("Muted Words") {
                        MutedWordsView(viewModel: viewModel)
                    }
                    
                    NavigationLink("Hidden Content") {
                        HiddenContentView(viewModel: viewModel)
                    }
                    
                    NavigationLink("Sensitive Content") {
                        SensitiveContentView(viewModel: viewModel)
                    }
                } header: {
                    Text("Content Safety")
                } footer: {
                    Text("Control what content you see and how it's filtered")
                }
                
                // Account Safety Section
                Section {
                    NavigationLink("Blocked Accounts") {
                        BlockedAccountsView(viewModel: viewModel)
                    }
                    
                    NavigationLink("Muted Accounts") {
                        MutedAccountsView(viewModel: viewModel)
                    }
                    
                    NavigationLink("Restricted Accounts") {
                        RestrictedAccountsView(viewModel: viewModel)
                    }
                    
                    NavigationLink("Account Limits") {
                        AccountLimitsView(viewModel: viewModel)
                    }
                } header: {
                    Text("Account Safety")
                } footer: {
                    Text("Manage who can interact with you and your account")
                }
                
                // Reporting & Moderation Section
                Section {
                    NavigationLink("Report Settings") {
                        ReportSettingsView(viewModel: viewModel)
                    }
                    
                    NavigationLink("Moderation History") {
                        ModerationHistoryView(viewModel: viewModel)
                    }
                    
                    NavigationLink("Appeal Decisions") {
                        AppealDecisionsView(viewModel: viewModel)
                    }
                } header: {
                    Text("Reporting & Moderation")
                } footer: {
                    Text("Manage your reporting preferences and moderation history")
                }
                
                // Advanced Safety Section
                Section {
                    NavigationLink("Two-Factor Authentication") {
                        TwoFactorView()
                    }
                    
                    NavigationLink("Login Alerts") {
                        LoginAlertsView(viewModel: viewModel)
                    }
                    
                    NavigationLink("Device Management") {
                        DeviceManagementView(viewModel: viewModel)
                    }
                    
                    NavigationLink("Session Security") {
                        SessionSecurityView(viewModel: viewModel)
                    }
                } header: {
                    Text("Advanced Safety")
                } footer: {
                    Text("Enhanced security features and account protection")
                }
                
                // Emergency Section
                Section {
                    NavigationLink("Emergency Contacts") {
                        EmergencyContactsView(viewModel: viewModel)
                    }
                    
                    NavigationLink("Account Recovery") {
                        AccountRecoveryView(viewModel: viewModel)
                    }
                    
                    Button("Lock Account Temporarily") {
                        viewModel.lockAccountTemporarily()
                    }
                    .foregroundColor(.orange)
                } header: {
                    Text("Emergency Actions")
                } footer: {
                    Text("Quick actions for emergency situations")
                }
            }
            .navigationTitle("Safety")
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
            viewModel.loadSafetySettings()
        }
        .alert("Safety Update", isPresented: $viewModel.showUpdateAlert) {
            Button("OK") { }
        } message: {
            Text(viewModel.updateMessage)
        }
        .alert("Error", isPresented: $viewModel.showErrorAlert) {
            Button("OK") { viewModel.clearError() }
        } message: {
            Text(viewModel.errorMessage)
        }
        .alert("Account Locked", isPresented: $viewModel.showLockAlert) {
            Button("OK") { }
        } message: {
            Text("Your account has been temporarily locked for safety. Contact support if this was done in error.")
        }
    }
}

// MARK: - Content Filtering View
struct ContentFilteringView: View {
    @ObservedObject var viewModel: SafetyViewModel
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Content Filtering Level")
                        .font(.headline)
                    
                    Text("Choose how strictly content is filtered for you")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Picker("Filtering Level", selection: $viewModel.contentFilteringLevel) {
                    ForEach(ContentFilteringLevel.allCases, id: \.self) { level in
                        VStack(alignment: .leading) {
                            Text(level.displayName)
                            Text(level.description)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .tag(level)
                    }
                }
                .pickerStyle(.navigationLink)
                .onChange(of: viewModel.contentFilteringLevel) { _ in
                    viewModel.updateContentFilteringLevel()
                }
            } header: {
                Text("General Filtering")
            }
            
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Sensitive Content")
                        .font(.headline)
                    
                    Text("Control how sensitive content is handled")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Toggle("Show Sensitive Content", isOn: $viewModel.showSensitiveContent)
                    .onChange(of: viewModel.showSensitiveContent) { _ in
                        viewModel.updateSensitiveContentSetting()
                    }
                
                Toggle("Warn Before Showing", isOn: $viewModel.warnBeforeSensitiveContent)
                    .onChange(of: viewModel.warnBeforeSensitiveContent) { _ in
                        viewModel.updateSensitiveContentWarning()
                    }
            } header: {
                Text("Sensitive Content")
            }
            
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Language Filtering")
                        .font(.headline)
                    
                    Text("Filter content based on language preferences")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Toggle("Filter Profanity", isOn: $viewModel.filterProfanity)
                    .onChange(of: viewModel.filterProfanity) { _ in
                        viewModel.updateProfanityFilter()
                    }
                
                Toggle("Filter Hate Speech", isOn: $viewModel.filterHateSpeech)
                    .onChange(of: viewModel.filterHateSpeech) { _ in
                        viewModel.updateHateSpeechFilter()
                    }
                
                Toggle("Filter Violence", isOn: $viewModel.filterViolence)
                    .onChange(of: viewModel.filterViolence) { _ in
                        viewModel.updateViolenceFilter()
                    }
            } header: {
                Text("Language & Content")
            }
        }
        .navigationTitle("Content Filtering")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Done") { dismiss() }
            }
        }
    }
}

// MARK: - Muted Words View
struct MutedWordsView: View {
    @ObservedObject var viewModel: SafetyViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var newWord = ""
    
    var body: some View {
        List {
            Section {
                HStack {
                    TextField("Add muted word", text: $newWord)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                    
                    Button("Add") {
                        if !newWord.isEmpty {
                            viewModel.addMutedWord(newWord)
                            newWord = ""
                        }
                    }
                    .disabled(newWord.isEmpty)
                }
            } header: {
                Text("Add Muted Word")
            }
            
            Section {
                if viewModel.mutedWords.isEmpty {
                    Text("No muted words")
                        .foregroundColor(.secondary)
                        .italic()
                } else {
                    ForEach(viewModel.mutedWords, id: \.self) { word in
                        HStack {
                            Text(word)
                            Spacer()
                            Button("Remove") {
                                viewModel.removeMutedWord(word)
                            }
                            .foregroundColor(.red)
                        }
                    }
                }
            } header: {
                Text("Muted Words")
            } footer: {
                Text("Posts containing these words will be hidden from your timeline")
            }
        }
        .navigationTitle("Muted Words")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Done") { dismiss() }
            }
        }
    }
}

// MARK: - Hidden Content View
struct HiddenContentView: View {
    @ObservedObject var viewModel: SafetyViewModel
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        List {
            Section {
                Toggle("Hide Muted Users' Content", isOn: $viewModel.hideMutedUsersContent)
                    .onChange(of: viewModel.hideMutedUsersContent) { _ in
                        viewModel.updateHideMutedUsersContent()
                    }
                
                Toggle("Hide Blocked Users' Content", isOn: $viewModel.hideBlockedUsersContent)
                    .onChange(of: viewModel.hideBlockedUsersContent) { _ in
                        viewModel.updateHideBlockedUsersContent()
                    }
                
                Toggle("Hide Sensitive Media", isOn: $viewModel.hideSensitiveMedia)
                    .onChange(of: viewModel.hideSensitiveMedia) { _ in
                        viewModel.updateHideSensitiveMedia()
                    }
            } header: {
                Text("Content Hiding")
            } footer: {
                Text("Control what content is automatically hidden from your view")
            }
            
            Section {
                NavigationLink("Hidden Posts") {
                    HiddenPostsView(viewModel: viewModel)
                }
                
                NavigationLink("Hidden Users") {
                    HiddenUsersView(viewModel: viewModel)
                }
                
                NavigationLink("Hidden Hashtags") {
                    HiddenHashtagsView(viewModel: viewModel)
                }
            } header: {
                Text("Hidden Items")
            } footer: {
                Text("View and manage content you've manually hidden")
            }
        }
        .navigationTitle("Hidden Content")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Done") { dismiss() }
            }
        }
    }
}

// MARK: - Sensitive Content View
struct SensitiveContentView: View {
    @ObservedObject var viewModel: SafetyViewModel
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Sensitive Content Handling")
                        .font(.headline)
                    
                    Text("Choose how sensitive content is displayed")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Picker("Display Mode", selection: $viewModel.sensitiveContentDisplayMode) {
                    ForEach(SensitiveContentDisplayMode.allCases, id: \.self) { mode in
                        VStack(alignment: .leading) {
                            Text(mode.displayName)
                            Text(mode.description)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .tag(mode)
                    }
                }
                .pickerStyle(.navigationLink)
                .onChange(of: viewModel.sensitiveContentDisplayMode) { _ in
                    viewModel.updateSensitiveContentDisplayMode()
                }
            } header: {
                Text("Display Settings")
            }
            
            Section {
                Toggle("Blur Sensitive Images", isOn: $viewModel.blurSensitiveImages)
                    .onChange(of: viewModel.blurSensitiveImages) { _ in
                        viewModel.updateBlurSensitiveImages()
                    }
                
                Toggle("Mute Sensitive Videos", isOn: $viewModel.muteSensitiveVideos)
                    .onChange(of: viewModel.muteSensitiveVideos) { _ in
                        viewModel.updateMuteSensitiveVideos()
                    }
                
                Toggle("Show Content Warnings", isOn: $viewModel.showContentWarnings)
                    .onChange(of: viewModel.showContentWarnings) { _ in
                        viewModel.updateShowContentWarnings()
                    }
            } header: {
                Text("Media Handling")
            }
        }
        .navigationTitle("Sensitive Content")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Done") { dismiss() }
            }
        }
    }
}

// MARK: - Safety Enums
enum ContentFilteringLevel: String, CaseIterable {
    case off = "off"
    case low = "low"
    case medium = "medium"
    case high = "high"
    
    var displayName: String {
        switch self {
        case .off: return "Off"
        case .low: return "Low"
        case .medium: return "Medium"
        case .high: return "High"
        }
    }
    
    var description: String {
        switch self {
        case .off: return "No content filtering"
        case .low: return "Minimal filtering for obvious violations"
        case .medium: return "Standard filtering for most content"
        case .high: return "Aggressive filtering for maximum safety"
        }
    }
}

enum SensitiveContentDisplayMode: String, CaseIterable {
    case always = "always"
    case withWarning = "with_warning"
    case blurred = "blurred"
    case hidden = "hidden"
    
    var displayName: String {
        switch self {
        case .always: return "Always Show"
        case .withWarning: return "Show with Warning"
        case .blurred: return "Show Blurred"
        case .hidden: return "Hide Completely"
        }
    }
    
    var description: String {
        switch self {
        case .always: return "Show all content without restrictions"
        case .withWarning: return "Show content with a warning message"
        case .blurred: return "Show content but blur sensitive parts"
        case .hidden: return "Hide sensitive content completely"
        }
    }
}

// MARK: - Placeholder Views (to be implemented)
struct BlockedAccountsView: View {
    @ObservedObject var viewModel: SafetyViewModel
    
    var body: some View {
        Text("Blocked Accounts")
            .navigationTitle("Blocked Accounts")
    }
}

struct MutedAccountsView: View {
    @ObservedObject var viewModel: SafetyViewModel
    
    var body: some View {
        Text("Muted Accounts")
            .navigationTitle("Muted Accounts")
    }
}

struct RestrictedAccountsView: View {
    var body: some View {
        Text("Restricted Accounts")
            .navigationTitle("Restricted Accounts")
    }
}

struct AccountLimitsView: View {
    var body: some View {
        Text("Account Limits")
            .navigationTitle("Account Limits")
    }
}

struct ReportSettingsView: View {
    var body: some View {
        Text("Report Settings")
            .navigationTitle("Report Settings")
    }
}

struct ModerationHistoryView: View {
    var body: some View {
        Text("Moderation History")
            .navigationTitle("Moderation History")
    }
}

struct AppealDecisionsView: View {
    var body: some View {
        Text("Appeal Decisions")
            .navigationTitle("Appeal Decisions")
    }
}

struct LoginAlertsView: View {
    var body: some View {
        Text("Login Alerts")
            .navigationTitle("Login Alerts")
    }
}

struct DeviceManagementView: View {
    var body: some View {
        Text("Device Management")
            .navigationTitle("Device Management")
    }
}

struct SessionSecurityView: View {
    var body: some View {
        Text("Session Security")
            .navigationTitle("Session Security")
    }
}

struct EmergencyContactsView: View {
    var body: some View {
        Text("Emergency Contacts")
            .navigationTitle("Emergency Contacts")
    }
}

struct AccountRecoveryView: View {
    var body: some View {
        Text("Account Recovery")
            .navigationTitle("Account Recovery")
    }
}

struct HiddenPostsView: View {
    var body: some View {
        Text("Hidden Posts")
            .navigationTitle("Hidden Posts")
    }
}

struct HiddenUsersView: View {
    var body: some View {
        Text("Hidden Users")
            .navigationTitle("Hidden Users")
    }
}

struct HiddenHashtagsView: View {
    var body: some View {
        Text("Hidden Hashtags")
            .navigationTitle("Hidden Hashtags")
    }
}