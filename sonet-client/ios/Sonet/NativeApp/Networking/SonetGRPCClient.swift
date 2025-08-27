import Foundation
import GRPC
import NIO
import NIOHTTP1
import NIOTransportServices

// MARK: - Sonet gRPC Client
class SonetGRPCClient: ObservableObject {
    // MARK: - Published Properties
    @Published var isConnected = false
    @Published var connectionError: String?
    
    // MARK: - Private Properties
    private var channel: GRPCChannel?
    private let group = PlatformSupport.makeEventLoopGroup(loopCount: 1)
    private let configuration: SonetConfiguration
    
    // MARK: - Service Clients
    private var userServiceClient: UserServiceClient?
    private var noteServiceClient: NoteServiceClient?
    private var timelineServiceClient: TimelineServiceClient?
    private var messagingServiceClient: MessagingServiceClient?
    private var searchServiceClient: SearchServiceClient?
    
    // MARK: - Initialization
    init(configuration: SonetConfiguration) {
        self.configuration = configuration
        setupConnection()
    }
    
    deinit {
        try? channel?.close().wait()
        try? group.syncShutdownGracefully()
    }
    
    // MARK: - Connection Setup
    private func setupConnection() {
        do {
            let channel = try GRPCChannelPool.with(
                target: .hostAndPort(configuration.host, configuration.port),
                transportSecurity: configuration.useTLS ? .tls(GRPCTLSConfiguration.makeClientConfigurationBackedByNIOSSL()) : .plaintext,
                eventLoopGroup: group
            )
            
            self.channel = channel
            setupServiceClients()
            testConnection()
            
        } catch {
            connectionError = "Failed to create gRPC channel: \(error.localizedDescription)"
            print("gRPC Connection Error: \(error)")
        }
    }
    
    private func setupServiceClients() {
        guard let channel = channel else { return }
        
        userServiceClient = UserServiceClient(channel: channel)
        noteServiceClient = NoteServiceClient(channel: channel)
        timelineServiceClient = TimelineServiceClient(channel: channel)
        messagingServiceClient = MessagingServiceClient(channel: channel)
        searchServiceClient = SearchServiceClient(channel: channel)
    }
    
    private func testConnection() {
        // Test connection with a simple call
        Task {
            do {
                let response = try await userServiceClient?.ping(.init())
                isConnected = true
                connectionError = nil
                print("gRPC connection established successfully")
            } catch {
                isConnected = false
                connectionError = "Connection test failed: \(error.localizedDescription)"
                print("gRPC connection test failed: \(error)")
            }
        }
    }
    
    // MARK: - Authentication Methods
    func authenticate(email: String, password: String) async throws -> UserProfile {
        guard let client = userServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = AuthRequest.with {
            $0.email = email
            $0.password = password
            $0.sessionType = .mobile
        }
        
        let response = try await client.authenticate(request)
        return response.userProfile
    }
    
    func registerUser(username: String, email: String, password: String) async throws -> UserProfile {
        guard let client = userServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = RegisterUserRequest.with {
            $0.username = username
            $0.email = email
            $0.password = password
        }
        
        let response = try await client.registerUser(request)
        return response.userProfile
    }
    
    func refreshSession(sessionId: String) async throws -> Session {
        guard let client = userServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = RefreshSessionRequest.with {
            $0.sessionID = sessionId
        }
        
        let response = try await client.refreshSession(request)
        return response.session
    }
    
    // MARK: - Note Methods
    func getHomeTimeline(page: Int, pageSize: Int) async throws -> [TimelineItem] {
        guard let client = timelineServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = GetTimelineRequest.with {
            $0.algorithm = .hybrid
            $0.page = UInt32(page)
            $0.pageSize = UInt32(pageSize)
        }
        
        let response = try await client.getHomeTimeline(request)
        return response.items
    }
    
    func getNotesBatch(noteIds: [String]) async throws -> [Note] {
        guard let client = noteServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = GetNotesBatchRequest.with {
            $0.noteIds = noteIds
        }
        
        let response = try await client.getNotesBatch(request)
        return response.notes
    }
    
    func likeNote(noteId: String, userId: String) async throws -> LikeNoteResponse {
        guard let client = noteServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = LikeNoteRequest.with {
            $0.noteID = noteId
            $0.userID = userId
        }
        
        return try await client.likeNote(request)
    }
    
    func unlikeNote(noteId: String, userId: String) async throws -> UnlikeNoteResponse {
        guard let client = noteServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = UnlikeNoteRequest.with {
            $0.noteID = noteId
            $0.userID = userId
        }
        
        return try await client.unlikeNote(request)
    }
    
    // MARK: - Search Methods
    func searchUsers(query: String, page: Int, pageSize: Int) async throws -> [UserProfile] {
        guard let client = searchServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = SearchUsersRequest.with {
            $0.query = query
            $0.page = UInt32(page)
            $0.pageSize = UInt32(pageSize)
        }
        
        let response = try await client.searchUsers(request)
        return response.users
    }
    
    func searchNotes(query: String, page: Int, pageSize: Int) async throws -> [Note] {
        guard let client = searchServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = SearchNotesRequest.with {
            $0.query = query
            $0.page = UInt32(page)
            $0.pageSize = UInt32(pageSize)
        }
        
        let response = try await client.searchNotes(request)
        return response.notes
    }
    
    // MARK: - Messaging Methods
    func getConversations(userId: String) async throws -> [Conversation] {
        guard let client = messagingServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = GetConversationsRequest.with {
            $0.userID = userId
        }
        
        let response = try await client.getConversations(request)
        return response.conversations
    }
    
    func getMessages(conversationId: String, page: Int, pageSize: Int) async throws -> [Message] {
        guard let client = messagingServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = GetMessagesRequest.with {
            $0.conversationID = conversationId
            $0.page = UInt32(page)
            $0.pageSize = UInt32(pageSize)
        }
        
        let response = try await client.getMessages(request)
        return response.messages
    }
}

// MARK: - Configuration
struct SonetConfiguration {
    let host: String
    let port: Int
    let useTLS: Bool
    let timeout: TimeInterval
    
    static let development = SonetConfiguration(
        host: "localhost",
        port: 50051,
        useTLS: false,
        timeout: 30.0
    )
    
    static let staging = SonetConfiguration(
        host: "staging.sonet.app",
        port: 443,
        useTLS: true,
        timeout: 30.0
    )
    
    static let production = SonetConfiguration(
        host: "api.sonet.app",
        port: 443,
        useTLS: true,
        timeout: 30.0
    )
}

// MARK: - Error Types
enum SonetError: LocalizedError {
    case serviceUnavailable
    case authenticationFailed
    case networkError
    case invalidResponse
    case rateLimited
    
    var errorDescription: String? {
        switch self {
        case .serviceUnavailable:
            return "Service is currently unavailable"
        case .authenticationFailed:
            return "Authentication failed"
        case .networkError:
            return "Network connection error"
        case .invalidResponse:
            return "Invalid response from server"
        case .rateLimited:
            return "Too many requests, please try again later"
        }
    }
}

// MARK: - Protocol Buffer Extensions
extension UserProfile {
    var displayName: String {
        return self.displayName.isEmpty ? self.username : self.displayName
    }
    
    var isVerified: Bool {
        return self.isVerified
    }
    
    var avatarURL: URL? {
        return URL(string: self.avatarURL)
    }
}

extension Note {
    var text: String {
        return self.content
    }
    
    var author: UserProfile {
        return self.author
    }
    
    var createdAt: Date {
        return Date(timeIntervalSince1970: TimeInterval(self.createdAt.seconds))
    }
}