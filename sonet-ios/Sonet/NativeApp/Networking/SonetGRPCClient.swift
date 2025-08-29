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
    private var videoServiceClient: VideoServiceClient?
    private var notificationServiceClient: NotificationServiceClient?
    private var followServiceClient: FollowServiceClient?
    private var mediaServiceClient: MediaServiceClient?
    
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
        videoServiceClient = VideoServiceClient(channel: channel)
        notificationServiceClient = NotificationServiceClient(channel: channel)
        followServiceClient = FollowServiceClient(channel: channel)
        mediaServiceClient = MediaServiceClient(channel: channel)
    }
    
    private func testConnection() {
        Task {
            do {
                let response = try await userServiceClient?.ping(.init())
                await MainActor.run {
                    isConnected = true
                    connectionError = nil
                }
                print("gRPC connection established successfully")
            } catch {
                await MainActor.run {
                    isConnected = false
                    connectionError = "Connection test failed: \(error.localizedDescription)"
                }
                print("gRPC connection test failed: \(error)")
            }
        }
    }

    // MARK: - Media Upload (streaming)
    @discardableResult
    func uploadMedia(ownerId: String, filename: String, mimeType: String, data: Data, progress: ((Double) -> Void)? = nil) async throws -> UploadResponse {
        guard let client = mediaServiceClient else {
            throw SonetError.serviceUnavailable
        }
        #if canImport(UIKit)
        #endif
    // Client-streaming upload: init + chunks
    let options = try await authCallOptions()
    let call = client.upload(callOptions: options)
        // Send init
        var initMsg = UploadRequest()
        var initPayload = UploadInit()
        initPayload.ownerUserID = ownerId
        initPayload.type = .mediaTypeImage
        initPayload.originalFilename = filename
        initPayload.mimeType = mimeType
        initMsg.payload = .init(initPayload)
        try await call.sendMessage(initMsg)

        // Send chunks
        let chunkSize = 64 * 1024
        var sent = 0
        while sent < data.count {
            let end = min(sent + chunkSize, data.count)
            let chunkData = data[sent..<end]
            var chunk = UploadChunk()
            chunk.content = Data(chunkData)
            var chunkReq = UploadRequest()
            chunkReq.payload = .chunk(chunk)
            try await call.sendMessage(chunkReq)
            sent = end
            progress?(Double(sent) / Double(data.count))
        }
        try await call.sendEnd()
        let response = try await call.response
        return response
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

    // New: loginUser returns tokens + session info
    func loginUser(email: String, password: String) async throws -> LoginUserResponse {
        guard let client = userServiceClient else {
            throw SonetError.serviceUnavailable
        }

        let credentials = AuthCredentials.with {
            $0.email = email
            $0.password = password
        }

        let request = LoginUserRequest.with {
            $0.credentials = credentials
            $0.deviceName = "mobile"
        }

        return try await client.loginUser(request)
    }

    func refreshToken(refreshToken: String) async throws -> RefreshTokenResponse {
        guard let client = userServiceClient else {
            throw SonetError.serviceUnavailable
        }

        let request = RefreshTokenRequest.with {
            $0.refreshToken = refreshToken
        }

        return try await client.refreshToken(request)
    }

    // MARK: - Keychain + Auth helpers
    private let keychainService = "xyz.sonet.app"

    private func getFromKeychain(key: String) async throws -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key,
            kSecReturnData as String: kCFBooleanTrue!,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecSuccess, let data = item as? Data, let str = String(data: data, encoding: .utf8) {
            return str
        }
        return nil
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

    private func authCallOptions() async throws -> CallOptions? {
        if let token = try await getFromKeychain(key: "accessToken"), !token.isEmpty {
            var headers = HPACKHeaders()
            headers.add(name: "authorization", value: "Bearer \(token)")
            return CallOptions(customMetadata: headers)
        }
        return nil
    }

    /// Generic helper: run a call with auth header, on UNAUTHENTICATED attempt a refresh and retry once.
    private func callWithAuthRetry<T>(_ call: @escaping (CallOptions?) async throws -> T) async throws -> T {
        do {
            let options = try await authCallOptions()
            return try await call(options)
        } catch {
            // Check for gRPC unauthenticated
            if let status = error as? GRPCStatus, status.code == .unauthenticated {
                // Try refreshing token
                guard let refresh = try await getFromKeychain(key: "refreshToken") else {
                    throw error
                }
                let resp = try await refreshToken(refreshToken: refresh)
                // Persist new tokens
                try await storeInKeychain(key: "accessToken", value: resp.accessToken)
                if let newRefresh = resp.refreshToken, !newRefresh.isEmpty {
                    try await storeInKeychain(key: "refreshToken", value: newRefresh)
                }
                // Retry once with new access token
                let newOptions = try await authCallOptions()
                return try await call(newOptions)
            }
            throw error
        }
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
    
    // MARK: - Video Service Methods
    func getVideos(tab: VideoTab, page: Int, pageSize: Int) async throws -> GetVideosResponse {
        return try await callWithAuthRetry { options in
            guard let client = videoServiceClient else {
                throw SonetError.serviceUnavailable
            }

            let request = GetVideosRequest.with {
                $0.tab = tab
                $0.page = UInt32(page)
                $0.pageSize = UInt32(pageSize)
            }

            return try await client.getVideos(request, callOptions: options)
        }
    }
    
    func getVideoFeed(feedType: String, algorithm: String, page: Int, pageSize: Int) async throws -> VideoFeedResponse {
        return try await callWithAuthRetry { options in
            guard let client = videoServiceClient else {
                throw SonetError.serviceUnavailable
            }

            let request = VideoFeedRequest.with {
                $0.feedType = feedType
                $0.algorithm = algorithm
                $0.pagination = PaginationRequest.with {
                    $0.page = UInt32(page)
                    $0.pageSize = UInt32(pageSize)
                }
            }

            return try await client.getVideoFeed(request, callOptions: options)
        }
    }
    
    func getPersonalizedFeed(userId: String, feedType: String, page: Int, pageSize: Int) async throws -> VideoFeedResponse {
        return try await callWithAuthRetry { options in
            guard let client = videoServiceClient else {
                throw SonetError.serviceUnavailable
            }

            let baseRequest = VideoFeedRequest.with {
                $0.feedType = feedType
                $0.algorithm = "ml_ranking"
                $0.pagination = PaginationRequest.with {
                    $0.page = UInt32(page)
                    $0.pageSize = UInt32(pageSize)
                }
            }

            let request = PersonalizedFeedRequest.with {
                $0.userID = userId
                $0.baseRequest = baseRequest
            }

            return try await client.getPersonalizedFeed(request, callOptions: options)
        }
    }
    
    func trackVideoEngagement(userId: String, videoId: String, eventType: String, durationMs: UInt32? = nil, completionRate: Double? = nil) async throws -> EngagementResponse {
        guard let client = videoServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = EngagementEvent.with {
            $0.userID = userId
            $0.videoID = videoId
            $0.eventType = eventType
            $0.timestamp = ISO8601DateFormatter().string(from: Date())
            if let durationMs = durationMs {
                $0.durationMs = durationMs
            }
            if let completionRate = completionRate {
                $0.completionRate = completionRate
            }
        }
        
        return try await client.trackEngagement(request)
    }
    
    func streamVideoFeed(feedType: String, algorithm: String) -> AsyncThrowingStream<VideoFeedUpdate, Error> {
        guard let client = videoServiceClient else {
            return AsyncThrowingStream { continuation in
                continuation.finish(throwing: SonetError.serviceUnavailable)
            }
        }
        
        let request = VideoFeedRequest.with {
            $0.feedType = feedType
            $0.algorithm = algorithm
        }
        
        return AsyncThrowingStream { continuation in
            Task {
                do {
                    let stream = client.streamVideoFeed(request)
                    for try await update in stream {
                        continuation.yield(update)
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
        }
    }
    
    // MARK: - Video Interaction Methods
    func toggleVideoLike(videoId: String, userId: String, isLiked: Bool) async throws -> ToggleVideoLikeResponse {
        guard let client = videoServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = ToggleVideoLikeRequest.with {
            $0.videoID = videoId
            $0.userID = userId
            $0.isLiked = isLiked
        }
        
        return try await client.toggleVideoLike(request)
    }
    
    func toggleFollow(userId: String, targetUserId: String, isFollowing: Bool) async throws -> ToggleFollowResponse {
        guard let client = followServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = ToggleFollowRequest.with {
            $0.userID = userId
            $0.targetUserID = targetUserId
            $0.isFollowing = isFollowing
        }
        
        return try await client.toggleFollow(request)
    }
    
    // MARK: - Note Methods
    func getHomeTimeline(page: Int, pageSize: Int) async throws -> [TimelineItem] {
        return try await callWithAuthRetry { options in
            guard let client = timelineServiceClient else {
                throw SonetError.serviceUnavailable
            }

            let request = GetTimelineRequest.with {
                $0.algorithm = .hybrid
                $0.page = UInt32(page)
                $0.pageSize = UInt32(pageSize)
            }

            let response = try await client.getHomeTimeline(request, callOptions: options)
            return response.items
        }
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
    
    func createNote(content: String, authorId: String, mediaUrls: [String] = [], hashtags: [String] = []) async throws -> CreateNoteResponse {
        return try await callWithAuthRetry { options in
            guard let client = noteServiceClient else {
                throw SonetError.serviceUnavailable
            }

            let request = CreateNoteRequest.with {
                $0.content = content
                $0.authorID = authorId
                $0.mediaUrls = mediaUrls
                $0.hashtags = hashtags
            }

            return try await client.createNote(request, callOptions: options)
        }
    }
    
    func likeNote(noteId: String, userId: String) async throws -> LikeNoteResponse {
        return try await callWithAuthRetry { options in
            guard let client = noteServiceClient else {
                throw SonetError.serviceUnavailable
            }

            let request = LikeNoteRequest.with {
                $0.noteID = noteId
                $0.userID = userId
            }

            return try await client.likeNote(request, callOptions: options)
        }
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
    
    // Removed HTTP fallback now that gRPC is available
    
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
    
    func searchHashtags(query: String, page: Int, pageSize: Int) async throws -> [String] {
        guard let client = searchServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = SearchHashtagsRequest.with {
            $0.query = query
            $0.page = UInt32(page)
            $0.pageSize = UInt32(pageSize)
        }
        
        let response = try await client.searchHashtags(request)
        return response.hashtags
    }
    
    // MARK: - Messaging Methods
    func getConversations(userId: String, page: Int, pageSize: Int) async throws -> [Conversation] {
        guard let client = messagingServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = GetConversationsRequest.with {
            $0.userID = userId
            $0.page = UInt32(page)
            $0.pageSize = UInt32(pageSize)
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
    
    func sendMessage(conversationId: String, senderId: String, content: String, messageType: MessageType = .text) async throws -> SendMessageResponse {
        guard let client = messagingServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = SendMessageRequest.with {
            $0.conversationID = conversationId
            $0.senderID = senderId
            $0.content = content
            $0.messageType = messageType
        }
        
        return try await client.sendMessage(request)
    }
    
    func sendTypingIndicator(conversationId: String, userId: String, isTyping: Bool) async throws -> SendTypingIndicatorResponse {
        guard let client = messagingServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = TypingIndicatorRequest.with {
            $0.conversationID = conversationId
            $0.userID = userId
            $0.isTyping = isTyping
        }
        
        return try await client.sendTypingIndicator(request)
    }
    
    func markConversationAsRead(conversationId: String, userId: String) async throws -> MarkConversationAsReadResponse {
        guard let client = messagingServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = MarkConversationAsReadRequest.with {
            $0.conversationID = conversationId
            $0.userID = userId
        }
        
        return try await client.markConversationAsRead(request)
    }
    
    func deleteMessage(messageId: String) async throws -> DeleteMessageResponse {
        guard let client = messagingServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = DeleteMessageRequest.with {
            $0.messageID = messageId
        }
        
        return try await client.deleteMessage(request)
    }
    
    func createGroup(name: String, creatorId: String, memberIds: [String]) async throws -> CreateGroupResponse {
        guard let client = messagingServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = CreateGroupRequest.with {
            $0.name = name
            $0.creatorID = creatorId
            $0.memberIDs = memberIds
        }
        
        return try await client.createGroup(request)
    }
    
    func messageStream() -> AsyncThrowingStream<Message, Error> {
        guard let client = messagingServiceClient else {
            return AsyncThrowingStream { continuation in
                continuation.finish(throwing: SonetError.serviceUnavailable)
            }
        }
        
        return AsyncThrowingStream { continuation in
            Task {
                do {
                    let request = MessageStreamRequest.with {
                        $0.userID = "current_user" // This should be passed from the caller
                    }
                    
                    let stream = client.messageStream(request)
                    for try await message in stream {
                        continuation.yield(message)
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
        }
    }
    
    // MARK: - Notification Methods
    func getNotifications(page: Int, pageSize: Int) async throws -> [NotificationItem] {
        guard let client = notificationServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = GetNotificationsRequest.with {
            $0.page = UInt32(page)
            $0.pageSize = UInt32(pageSize)
        }
        
        let response = try await client.getNotifications(request)
        return response.notifications
    }
    
    func markNotificationAsRead(notificationId: String) async throws -> MarkNotificationAsReadResponse {
        guard let client = notificationServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = MarkNotificationAsReadRequest.with {
            $0.notificationID = notificationId
        }
        
        return try await client.markNotificationAsRead(request)
    }
    
    func markAllNotificationsAsRead() async throws -> MarkAllNotificationsAsReadResponse {
        guard let client = notificationServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = MarkAllNotificationsAsReadRequest()
        return try await client.markAllNotificationsAsRead(request)
    }
    
    func deleteNotification(notificationId: String) async throws -> DeleteNotificationResponse {
        guard let client = notificationServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = DeleteNotificationRequest.with {
            $0.notificationID = notificationId
        }
        
        return try await client.deleteNotification(request)
    }
    
    func clearAllNotifications() async throws -> ClearAllNotificationsResponse {
        guard let client = notificationServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = ClearAllNotificationsRequest()
        return try await client.clearAllNotifications(request)
    }
    
    func checkForAppUpdates() async throws -> AppUpdateInfo {
        guard let client = notificationServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = CheckForUpdatesRequest()
        let response = try await client.checkForUpdates(request)
        return response.updateInfo
    }
    
    func updateNotificationPreferences(preferences: NotificationPreferences) async throws -> UpdateNotificationPreferencesResponse {
        guard let client = notificationServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = UpdateNotificationPreferencesRequest.with {
            $0.preferences = preferences
        }
        
        return try await client.updateNotificationPreferences(request)
    }
    
    func notificationStream() -> AsyncThrowingStream<NotificationItem, Error> {
        guard let client = notificationServiceClient else {
            return AsyncThrowingStream { continuation in
                continuation.finish(throwing: SonetError.serviceUnavailable)
            }
        }
        
        return AsyncThrowingStream { continuation in
            Task {
                do {
                    let request = NotificationStreamRequest.with {
                        $0.userID = "current_user" // This should be passed from the caller
                    }
                    
                    let stream = client.notificationStream(request)
                    for try await notification in stream {
                        continuation.yield(notification)
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
        }
    }
    
    // MARK: - Profile Methods
    func getUserProfile(userId: String) async throws -> UserProfile {
        guard let client = userServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = GetUserProfileRequest.with {
            $0.userID = userId
        }
        
        let response = try await client.getUserProfile(request)
        return response.userProfile
    }
    
    func getUserPosts(userId: String, page: Int, pageSize: Int) async throws -> [Note] {
        guard let client = noteServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = GetUserPostsRequest.with {
            $0.userID = userId
            $0.page = UInt32(page)
            $0.pageSize = UInt32(pageSize)
        }
        
        let response = try await client.getUserPosts(request)
        return response.notes
    }
    
    func getUserReplies(userId: String, page: Int, pageSize: Int) async throws -> [Note] {
        guard let client = noteServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = GetUserRepliesRequest.with {
            $0.userID = userId
            $0.page = UInt32(page)
            $0.pageSize = UInt32(pageSize)
        }
        
        let response = try await client.getUserReplies(request)
        return response.notes
    }
    
    func getUserMedia(userId: String, page: Int, pageSize: Int) async throws -> [Note] {
        guard let client = noteServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = GetUserMediaRequest.with {
            $0.userID = userId
            $0.page = UInt32(page)
            $0.pageSize = UInt32(pageSize)
        }
        
        let response = try await client.getUserMedia(request)
        return response.notes
    }
    
    func getUserLikes(userId: String, page: Int, pageSize: Int) async throws -> [Note] {
        guard let client = noteServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = GetUserLikesRequest.with {
            $0.userID = userId
            $0.page = UInt32(page)
            $0.pageSize = UInt32(pageSize)
        }
        
        let response = try await client.getUserLikes(request)
        return response.notes
    }
    
    func blockUser(userId: String, targetUserId: String) async throws -> BlockUserResponse {
        guard let client = userServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = BlockUserRequest.with {
            $0.userID = userId
            $0.targetUserID = targetUserId
        }
        
        return try await client.blockUser(request)
    }
    
    func unblockUser(userId: String, targetUserId: String) async throws -> UnblockUserResponse {
        guard let client = userServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = UnblockUserRequest.with {
            $0.userID = userId
            $0.targetUserID = targetUserId
        }
        
        return try await client.unblockUser(request)
    }
    
    // MARK: - Settings Methods
    func updateNotificationPreferences(request: UpdateNotificationPreferencesRequest) async throws -> UpdateNotificationPreferencesResponse {
        guard let client = notificationServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        return try await client.updateNotificationPreferences(request)
    }
    
    func updatePrivacySettings(request: UpdatePrivacySettingsRequest) async throws -> UpdatePrivacySettingsResponse {
        guard let client = userServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        return try await client.updatePrivacySettings(request)
    }
    
    func updateContentPreferences(request: UpdateContentPreferencesRequest) async throws -> UpdateContentPreferencesResponse {
        guard let client = userServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        return try await client.updateContentPreferences(request)
    }
    
    func getStorageUsage() async throws -> StorageUsage {
        guard let client = mediaServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = GetStorageUsageRequest()
        let response = try await client.getStorageUsage(request)
        return response.storageUsage
    }
    
    func clearCache() async throws -> ClearCacheResponse {
        guard let client = mediaServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = ClearCacheRequest()
        return try await client.clearCache(request)
    }
    
    func exportUserData() async throws -> ExportUserDataResponse {
        guard let client = userServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = ExportUserDataRequest()
        return try await client.exportUserData(request)
    }

    // MARK: - Media Like (gRPC)
    func toggleMediaLike(mediaId: String, userId: String, isLiked: Bool) async throws -> Int {
        guard let client = mediaServiceClient else {
            throw SonetError.serviceUnavailable
        }
        let request = ToggleMediaLikeRequest.with {
            $0.mediaID = mediaId
            $0.userID = userId
            $0.isLiked = isLiked
        }
        let resp = try await client.toggleMediaLike(request)
        return Int(resp.likeCount)
    }
    
    func deleteAccount() async throws -> DeleteAccountResponse {
        guard let client = userServiceClient else {
            throw SonetError.serviceUnavailable
        }
        
        let request = DeleteAccountRequest()
        return try await client.deleteAccount(request)
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
    case videoNotFound
    case userNotFound
    case permissionDenied
    case invalidRequest
    case serverError
    
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
        case .videoNotFound:
            return "Video not found"
        case .userNotFound:
            return "User not found"
        case .permissionDenied:
            return "Permission denied"
        case .invalidRequest:
            return "Invalid request"
        case .serverError:
            return "Server error occurred"
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

// MARK: - Video Tab Enum
enum VideoTab: String, CaseIterable {
    case forYou = "for_you"
    case trending = "trending"
    case following = "following"
    case discover = "discover"
    
    var grpcType: sonet.services.VideoTab {
        switch self {
        case .forYou: return .VIDEO_TAB_FOR_YOU
        case .trending: return .VIDEO_TAB_TRENDING
        case .following: return .VIDEO_TAB_FOLLOWING
        case .discover: return .VIDEO_TAB_DISCOVER
        }
    }
}