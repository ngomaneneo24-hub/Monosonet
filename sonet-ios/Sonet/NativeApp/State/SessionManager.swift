import Foundation
import SwiftUI
import Combine
import Security

@MainActor
class SessionManager: ObservableObject {
    // MARK: - Published Properties
    @Published var isAuthenticated = false
    @Published var currentUser: SonetUser?
    @Published var isAuthenticating = false
    @Published var authenticationError: AuthenticationError?
    
    // MARK: - Private Properties
    private var cancellables = Set<AnyCancellable>()
    private let keychainService = "xyz.sonet.app"
    private let userDefaults = UserDefaults.standard
    private let grpcClient: SonetGRPCClient
    
    // MARK: - Initialization
    init() {
        // Initialize gRPC client with development configuration
        self.grpcClient = SonetGRPCClient(configuration: .development)
        
        setupSessionPersistence()
        loadStoredSession()
    }
    
    // MARK: - Public Methods
    func initialize() {
        // Check for existing valid session
        validateStoredSession()
    }
    
    func authenticate(username: String, password: String) async throws {
        isAuthenticating = true
        authenticationError = nil
        
        do {
            // Perform authentication with Sonet API
            let user = try await performAuthentication(username: username, password: password)
            
            // Store session securely
            try await storeSession(user: user)
            
            // Update state
            currentUser = user
            isAuthenticated = true
            
            // Clear any previous errors
            authenticationError = nil
            
        } catch {
            authenticationError = AuthenticationError.invalidCredentials
            throw error
        } finally {
            isAuthenticating = false
        }
    }
    
    func signOut() async {
        do {
            // Clear stored session
            try await clearStoredSession()
            
            // Clear current user
            currentUser = nil
            isAuthenticated = false
            
            // Reset any cached data
            await clearCachedData()
            
        } catch {
            print("Error during sign out: \(error)")
        }
    }
    
    func refreshSession() async throws {
        guard let user = currentUser else {
            throw AuthenticationError.noActiveSession
        }
        
        do {
            let refreshedUser = try await performSessionRefresh(for: user)
            currentUser = refreshedUser
            try await storeSession(user: refreshedUser)
        } catch {
            // If refresh fails, sign out the user
            await signOut()
            throw error
        }
    }
    
    // MARK: - Private Methods
    private func setupSessionPersistence() {
        // Setup keychain access
    }
    
    private func loadStoredSession() {
        // Load stored session from keychain/user defaults
        if let userData = userDefaults.data(forKey: "currentUser"),
           let user = try? JSONDecoder().decode(SonetUser.self, from: userData) {
            currentUser = user
            isAuthenticated = true
        }
    }
    
    private func validateStoredSession() {
        // Validate stored session token
        guard let user = currentUser else { return }
        
        Task {
            do {
                try await refreshSession()
            } catch {
                await signOut()
            }
        }
    }
    
    private func performAuthentication(username: String, password: String) async throws -> SonetUser {
        do {
            // Use gRPC client for authentication
            let userProfile = try await grpcClient.authenticate(email: username, password: password)
            
            // Convert UserProfile to SonetUser
            return SonetUser(
                id: userProfile.userId,
                username: userProfile.username,
                displayName: userProfile.displayName,
                avatarURL: URL(string: userProfile.avatarUrl),
                isVerified: userProfile.isVerified,
                createdAt: userProfile.createdAt.date
            )
        } catch {
            print("gRPC authentication failed: \(error)")
            throw AuthenticationError.invalidCredentials
        }
    }
    
    private func performSessionRefresh(for user: SonetUser) async throws -> SonetUser {
        // Simulate session refresh
        try await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
        
        // Return refreshed user (in real implementation, this would update tokens)
        return user
    }
    
    private func storeSession(user: SonetUser) async throws {
        // Store user data in UserDefaults
        if let userData = try? JSONEncoder().encode(user) {
            userDefaults.set(userData, forKey: "currentUser")
        }
        
        // Store sensitive data in keychain
        try await storeInKeychain(key: "authToken", value: "mock_token")
    }
    
    private func clearStoredSession() async throws {
        // Clear user data
        userDefaults.removeObject(forKey: "currentUser")
        
        // Clear keychain data
        try await clearKeychain()
    }
    
    private func clearCachedData() async {
        // Clear any cached feed data, images, etc.
    }
    
    private func storeInKeychain(key: String, value: String) async throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key,
            kSecValueData as String: value.data(using: .utf8)!
        ]
        
        SecItemDelete(query as CFDictionary)
        
        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw KeychainError.saveFailed
        }
    }
    
    private func clearKeychain() async throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService
        ]
        
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.deleteFailed
        }
    }
}

// MARK: - Sonet User Model
struct SonetUser: Codable, Identifiable, Equatable {
    let id: String
    let username: String
    let displayName: String
    let avatarURL: URL?
    let isVerified: Bool
    let createdAt: Date
    
    var handle: String {
        "@\(username)"
    }
}

// MARK: - Authentication Error Types
enum AuthenticationError: LocalizedError, Identifiable {
    case invalidCredentials
    case networkError
    case serverError
    case noActiveSession
    case sessionExpired
    case unknown
    
    var id: String {
        switch self {
        case .invalidCredentials: return "invalid_credentials"
        case .networkError: return "network_error"
        case .serverError: return "server_error"
        case .noActiveSession: return "no_active_session"
        case .sessionExpired: return "session_expired"
        case .unknown: return "unknown"
        }
    }
    
    var errorDescription: String? {
        switch self {
        case .invalidCredentials:
            return "Invalid username or password"
        case .networkError:
            return "Network connection error"
        case .serverError:
            return "Server error, please try again"
        case .noActiveSession:
            return "No active session"
        case .sessionExpired:
            return "Session expired, please log in again"
        case .unknown:
            return "An unknown error occurred"
        }
    }
}

// MARK: - Keychain Error Types
enum KeychainError: LocalizedError {
    case saveFailed
    case loadFailed
    case deleteFailed
    
    var errorDescription: String? {
        switch self {
        case .saveFailed:
            return "Failed to save to keychain"
        case .loadFailed:
            return "Failed to load from keychain"
        case .deleteFailed:
            return "Failed to delete from keychain"
        }
    }
}