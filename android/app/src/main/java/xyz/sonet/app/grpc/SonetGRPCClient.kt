package xyz.sonet.app.grpc

import android.content.Context
import io.grpc.ManagedChannel
import io.grpc.ManagedChannelBuilder
import io.grpc.stub.StreamObserver
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import xyz.sonet.app.grpc.proto.*
import xyz.sonet.app.grpc.proto.UserServiceGrpc
import xyz.sonet.app.grpc.proto.NoteServiceGrpc
import xyz.sonet.app.grpc.proto.TimelineServiceGrpc
import xyz.sonet.app.grpc.proto.SearchServiceGrpc
import xyz.sonet.app.grpc.proto.MessagingServiceGrpc
import xyz.sonet.app.grpc.proto.VideoServiceGrpc
import xyz.sonet.app.grpc.proto.NotificationServiceGrpc
import xyz.sonet.app.grpc.proto.FollowServiceGrpc
import xyz.sonet.app.grpc.proto.MediaServiceGrpc
import java.util.concurrent.TimeUnit

class SonetGRPCClient(
    private val context: Context,
    private val configuration: SonetConfiguration
) {
    
    // MARK: - Properties
    private var channel: ManagedChannel? = null
    private var userServiceClient: UserServiceGrpc.UserServiceBlockingStub? = null
    private var noteServiceClient: NoteServiceGrpc.NoteServiceBlockingStub? = null
    private var timelineServiceClient: TimelineServiceGrpc.TimelineServiceBlockingStub? = null
    private var searchServiceClient: SearchServiceGrpc.SearchServiceBlockingStub? = null
    private var messagingServiceClient: MessagingServiceGrpc.MessagingServiceBlockingStub? = null
    private var videoServiceClient: VideoServiceGrpc.VideoServiceBlockingStub? = null
    private var notificationServiceClient: NotificationServiceGrpc.NotificationServiceBlockingStub? = null
    private var followServiceClient: FollowServiceGrpc.FollowServiceBlockingStub? = null
    private var mediaServiceClient: MediaServiceGrpc.MediaServiceBlockingStub? = null
    
    // MARK: - Initialization
    init {
        setupConnection()
    }
    
    // MARK: - Connection Setup
    private fun setupConnection() {
        try {
            val channelBuilder = ManagedChannelBuilder
                .forAddress(configuration.host, configuration.port)
                .keepAliveTime(30, TimeUnit.SECONDS)
                .keepAliveTimeout(5, TimeUnit.SECONDS)
                .maxInboundMessageSize(1024 * 1024) // 1MB
            
            if (configuration.useTLS) {
                channelBuilder.useTransportSecurity()
            } else {
                channelBuilder.usePlaintext()
            }
            
            channel = channelBuilder.build()
            setupServiceClients()
            testConnection()
            
        } catch (error: Exception) {
            println("gRPC Connection Error: $error")
        }
    }
    
    private fun setupServiceClients() {
        channel?.let { channel ->
            userServiceClient = UserServiceGrpc.newBlockingStub(channel)
            noteServiceClient = NoteServiceGrpc.newBlockingStub(channel)
            timelineServiceClient = TimelineServiceGrpc.newBlockingStub(channel)
            searchServiceClient = SearchServiceGrpc.newBlockingStub(channel)
            messagingServiceClient = MessagingServiceGrpc.newBlockingStub(channel)
            videoServiceClient = VideoServiceGrpc.newBlockingStub(channel)
            notificationServiceClient = NotificationServiceGrpc.newBlockingStub(channel)
            followServiceClient = FollowServiceGrpc.newBlockingStub(channel)
            mediaServiceClient = MediaServiceGrpc.newBlockingStub(channel)
        }
    }
    
    private fun testConnection() {
        // Test connection with a simple ping
        try {
            val request = PingRequest.newBuilder().build()
            val response = userServiceClient?.ping(request)
            println("gRPC connection established successfully")
        } catch (error: Exception) {
            println("gRPC connection test failed: $error")
        }
    }
    
    // MARK: - Authentication Methods
    suspend fun authenticate(email: String, password: String): UserProfile {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = AuthRequest.newBuilder()
                    .setEmail(email)
                    .setPassword(password)
                    .setSessionType(SessionType.MOBILE)
                    .build()
                
                val response = userServiceClient?.authenticate(request)
                    ?: throw Exception("User service client not available")
                
                continuation.resume(response.userProfile)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun registerUser(username: String, email: String, password: String): UserProfile {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = RegisterUserRequest.newBuilder()
                    .setUsername(username)
                    .setEmail(email)
                    .setPassword(password)
                    .build()
                
                val response = userServiceClient?.registerUser(request)
                    ?: throw Exception("User service client not available")
                
                continuation.resume(response.userProfile)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun refreshSession(sessionId: String): Session {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = RefreshSessionRequest.newBuilder()
                    .setSessionID(sessionId)
                    .build()
                
                val response = userServiceClient?.refreshSession(request)
                    ?: throw Exception("User service client not available")
                
                continuation.resume(response.session)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    // MARK: - Video Service Methods
    suspend fun getVideos(tab: VideoTab, page: Int, pageSize: Int): GetVideosResponse {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = GetVideosRequest.newBuilder()
                    .setTab(tab.grpcType)
                    .setPage(page.toLong())
                    .setPageSize(pageSize.toLong())
                    .build()
                
                val response = videoServiceClient?.getVideos(request)
                    ?: throw Exception("Video service client not available")
                
                continuation.resume(response)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun getVideoFeed(feedType: String, algorithm: String, page: Int, pageSize: Int): VideoFeedResponse {
        return suspendCancellableCoroutine { continuation ->
            try {
                val paginationRequest = PaginationRequest.newBuilder()
                    .setPage(page.toLong())
                    .setPageSize(pageSize.toLong())
                    .build()
                
                val request = VideoFeedRequest.newBuilder()
                    .setFeedType(feedType)
                    .setAlgorithm(algorithm)
                    .setPagination(paginationRequest)
                    .build()
                
                val response = videoServiceClient?.getVideoFeed(request)
                    ?: throw Exception("Video service client not available")
                
                continuation.resume(response)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun getPersonalizedFeed(userId: String, feedType: String, page: Int, pageSize: Int): VideoFeedResponse {
        return suspendCancellableCoroutine { continuation ->
            try {
                val paginationRequest = PaginationRequest.newBuilder()
                    .setPage(page.toLong())
                    .setPageSize(pageSize.toLong())
                    .build()
                
                val baseRequest = VideoFeedRequest.newBuilder()
                    .setFeedType(feedType)
                    .setAlgorithm("ml_ranking")
                    .setPagination(paginationRequest)
                    .build()
                
                val request = PersonalizedFeedRequest.newBuilder()
                    .setUserId(userId)
                    .setBaseRequest(baseRequest)
                    .build()
                
                val response = videoServiceClient?.getPersonalizedFeed(request)
                    ?: throw Exception("Video service client not available")
                
                continuation.resume(response)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun trackVideoEngagement(userId: String, videoId: String, eventType: String, durationMs: Long? = null, completionRate: Double? = null): EngagementResponse {
        return suspendCancellableCoroutine { continuation ->
            try {
                val requestBuilder = EngagementEvent.newBuilder()
                    .setUserId(userId)
                    .setVideoId(videoId)
                    .setEventType(eventType)
                    .setTimestamp(java.time.Instant.now().toString())
                
                durationMs?.let { requestBuilder.setDurationMs(it) }
                completionRate?.let { requestBuilder.setCompletionRate(it) }
                
                val request = requestBuilder.build()
                
                val response = videoServiceClient?.trackEngagement(request)
                    ?: throw Exception("Video service client not available")
                
                continuation.resume(response)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    fun streamVideoFeed(feedType: String, algorithm: String): Flow<VideoFeedUpdate> = flow {
        try {
            val request = VideoFeedRequest.newBuilder()
                .setFeedType(feedType)
                .setAlgorithm(algorithm)
                .build()
            
            val stream = videoServiceClient?.streamVideoFeed(request)
                ?: throw Exception("Video service client not available")
            
            // Note: This is a simplified implementation. In production, you'd want to handle
            // the streaming response properly with proper lifecycle management
            stream.forEach { update ->
                emit(update)
            }
        } catch (error: Exception) {
            throw error
        }
    }
    
    // MARK: - Video Interaction Methods
    suspend fun toggleVideoLike(videoId: String, userId: String, isLiked: Boolean): ToggleVideoLikeResponse {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = ToggleVideoLikeRequest.newBuilder()
                    .setVideoId(videoId)
                    .setUserId(userId)
                    .setIsLiked(isLiked)
                    .build()
                
                val response = videoServiceClient?.toggleVideoLike(request)
                    ?: throw Exception("Video service client not available")
                
                continuation.resume(response)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun toggleFollow(userId: String, targetUserId: String, isFollowing: Boolean): ToggleFollowResponse {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = ToggleFollowRequest.newBuilder()
                    .setUserId(userId)
                    .setTargetUserId(targetUserId)
                    .setIsFollowing(isFollowing)
                    .build()
                
                val response = followServiceClient?.toggleFollow(request)
                    ?: throw Exception("Follow service client not available")
                
                continuation.resume(response)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    // MARK: - Note Methods
    suspend fun getHomeTimeline(page: Int, pageSize: Int): List<TimelineItem> {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = GetTimelineRequest.newBuilder()
                    .setAlgorithm(TimelineAlgorithm.HYBRID)
                    .setPage(page.toLong())
                    .setPageSize(pageSize.toLong())
                    .build()
                
                val response = timelineServiceClient?.getHomeTimeline(request)
                    ?: throw Exception("Timeline service client not available")
                
                continuation.resume(response.itemsList)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }

    // Removed HTTP fallback now that gRPC is available

    suspend fun toggleMediaLike(mediaId: String, userId: String, isLiked: Boolean): ToggleMediaLikeResponse {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = ToggleMediaLikeRequest.newBuilder()
                    .setMediaId(mediaId)
                    .setUserId(userId)
                    .setIsLiked(isLiked)
                    .build()
                val response = mediaServiceClient?.toggleMediaLike(request)
                    ?: throw Exception("Media service client not available")
                continuation.resume(response)
            } catch (e: Exception) {
                continuation.resumeWithException(e)
            }
        }
    }
    
    suspend fun getNotesBatch(noteIds: List<String>): List<Note> {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = GetNotesBatchRequest.newBuilder()
                    .addAllNoteIds(noteIds)
                    .build()
                
                val response = noteServiceClient?.getNotesBatch(request)
                    ?: throw Exception("Note service client not available")
                
                continuation.resume(response.notesList)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun createNote(content: String, authorId: String, mediaUrls: List<String> = emptyList(), hashtags: List<String> = emptyList()): CreateNoteResponse {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = CreateNoteRequest.newBuilder()
                    .setContent(content)
                    .setAuthorId(authorId)
                    .addAllMediaUrls(mediaUrls)
                    .addAllHashtags(hashtags)
                    .build()
                
                val response = noteServiceClient?.createNote(request)
                    ?: throw Exception("Note service client not available")
                
                continuation.resume(response)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun likeNote(noteId: String, userId: String): LikeNoteResponse {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = LikeNoteRequest.newBuilder()
                    .setNoteID(noteId)
                    .setUserID(userId)
                    .build()
                
                val response = noteServiceClient?.likeNote(request)
                    ?: throw Exception("Note service client not available")
                
                continuation.resume(response)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun unlikeNote(noteId: String, userId: String): UnlikeNoteResponse {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = UnlikeNoteRequest.newBuilder()
                    .setNoteID(noteId)
                    .setUserID(userId)
                    .build()
                
                val response = noteServiceClient?.unlikeNote(request)
                    ?: throw Exception("Note service client not available")
                
                continuation.resume(response)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    // MARK: - Search Methods
    suspend fun searchUsers(query: String, page: Int, pageSize: Int): List<UserProfile> {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = SearchUsersRequest.newBuilder()
                    .setQuery(query)
                    .setPage(page.toLong())
                    .setPageSize(pageSize.toLong())
                    .build()
                
                val response = searchServiceClient?.searchUsers(request)
                    ?: throw Exception("Search service client not available")
                
                continuation.resume(response.usersList)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun searchNotes(query: String, page: Int, pageSize: Int): List<Note> {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = SearchNotesRequest.newBuilder()
                    .setQuery(query)
                    .setPage(page.toLong())
                    .setPageSize(pageSize.toLong())
                    .build()
                
                val response = searchServiceClient?.searchNotes(request)
                    ?: throw Exception("Search service client not available")
                
                continuation.resume(response.notesList)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun searchHashtags(query: String, page: Int, pageSize: Int): List<String> {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = SearchHashtagsRequest.newBuilder()
                    .setQuery(query)
                    .setPage(page.toLong())
                    .setPageSize(pageSize.toLong())
                    .build()
                
                val response = searchServiceClient?.searchHashtags(request)
                    ?: throw Exception("Search service client not available")
                
                continuation.resume(response.hashtagsList)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    // MARK: - Messaging Methods
    suspend fun getConversations(userId: String, page: Int, pageSize: Int): List<Conversation> {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = GetConversationsRequest.newBuilder()
                    .setUserID(userId)
                    .setPage(page.toLong())
                    .setPageSize(pageSize.toLong())
                    .build()
                
                val response = messagingServiceClient?.getConversations(request)
                    ?: throw Exception("Messaging service client not available")
                
                continuation.resume(response.conversationsList)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun getMessages(conversationId: String, page: Int, pageSize: Int): List<Message> {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = GetMessagesRequest.newBuilder()
                    .setConversationID(conversationId)
                    .setPage(page.toLong())
                    .setPageSize(pageSize.toLong())
                    .build()
                
                val response = messagingServiceClient?.getMessages(request)
                    ?: throw Exception("Messaging service client not available")
                
                continuation.resume(response.messagesList)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun sendMessage(conversationId: String, senderId: String, content: String, messageType: MessageType = MessageType.TEXT): SendMessageResponse {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = SendMessageRequest.newBuilder()
                    .setConversationID(conversationId)
                    .setSenderID(senderId)
                    .setContent(content)
                    .setMessageType(messageType)
                    .build()
                
                val response = messagingServiceClient?.sendMessage(request)
                    ?: throw Exception("Messaging service client not available")
                
                continuation.resume(response)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun sendTypingIndicator(conversationId: String, userId: String, isTyping: Boolean): SendTypingIndicatorResponse {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = TypingIndicatorRequest.newBuilder()
                    .setConversationID(conversationId)
                    .setUserID(userId)
                    .setIsTyping(isTyping)
                    .build()
                
                val response = messagingServiceClient?.sendTypingIndicator(request)
                    ?: throw Exception("Messaging service client not available")
                
                continuation.resume(response)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun markConversationAsRead(conversationId: String, userId: String): MarkConversationAsReadResponse {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = MarkConversationAsReadRequest.newBuilder()
                    .setConversationID(conversationId)
                    .setUserID(userId)
                    .build()
                
                val response = messagingServiceClient?.markConversationAsRead(request)
                    ?: throw Exception("Messaging service client not available")
                
                continuation.resume(response)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun deleteMessage(messageId: String): DeleteMessageResponse {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = DeleteMessageRequest.newBuilder()
                    .setMessageID(messageId)
                    .build()
                
                val response = messagingServiceClient?.deleteMessage(request)
                    ?: throw Exception("Messaging service client not available")
                
                continuation.resume(response)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun createGroup(name: String, creatorId: String, memberIds: List<String>): CreateGroupResponse {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = CreateGroupRequest.newBuilder()
                    .setName(name)
                    .setCreatorID(creatorId)
                    .addAllMemberIDs(memberIds)
                    .build()
                
                val response = messagingServiceClient?.createGroup(request)
                    ?: throw Exception("Messaging service client not available")
                
                continuation.resume(response)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    fun messageStream(): Flow<Message> = flow {
        try {
            val request = MessageStreamRequest.newBuilder()
                .setUserID("current_user") // This should be passed from the caller
                .build()
            
            val stream = messagingServiceClient?.messageStream(request)
                ?: throw Exception("Messaging service client not available")
            
            // Note: This is a simplified implementation. In production, you'd want to handle
            // the streaming response properly with proper lifecycle management
            stream.forEach { message ->
                emit(message)
            }
        } catch (error: Exception) {
            throw error
        }
    }
    
    // MARK: - Notification Methods
    suspend fun getNotifications(page: Int, pageSize: Int): List<NotificationItem> {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = GetNotificationsRequest.newBuilder()
                    .setPage(page.toLong())
                    .setPageSize(pageSize.toLong())
                    .build()
                
                val response = notificationServiceClient?.getNotifications(request)
                    ?: throw Exception("Notification service client not available")
                
                continuation.resume(response.notificationsList)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun markNotificationAsRead(notificationId: String): MarkNotificationAsReadResponse {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = MarkNotificationAsReadRequest.newBuilder()
                    .setNotificationID(notificationId)
                    .build()
                
                val response = notificationServiceClient?.markNotificationAsRead(request)
                    ?: throw Exception("Notification service client not available")
                
                continuation.resume(response)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun markAllNotificationsAsRead(): MarkAllNotificationsAsReadResponse {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = MarkAllNotificationsAsReadRequest.newBuilder().build()
                
                val response = notificationServiceClient?.markAllNotificationsAsRead(request)
                    ?: throw Exception("Notification service client not available")
                
                continuation.resume(response)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun deleteNotification(notificationId: String): DeleteNotificationResponse {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = DeleteNotificationRequest.newBuilder()
                    .setNotificationID(notificationId)
                    .build()
                
                val response = notificationServiceClient?.deleteNotification(request)
                    ?: throw Exception("Notification service client not available")
                
                continuation.resume(response)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun clearAllNotifications(): ClearAllNotificationsResponse {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = ClearAllNotificationsRequest.newBuilder().build()
                
                val response = notificationServiceClient?.clearAllNotifications(request)
                    ?: throw Exception("Notification service client not available")
                
                continuation.resume(response)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun checkForAppUpdates(): AppUpdateInfo {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = CheckForUpdatesRequest.newBuilder().build()
                
                val response = notificationServiceClient?.checkForUpdates(request)
                    ?: throw Exception("Notification service client not available")
                
                continuation.resume(response.updateInfo)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun updateNotificationPreferences(preferences: NotificationPreferences): UpdateNotificationPreferencesResponse {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = UpdateNotificationPreferencesRequest.newBuilder()
                    .setPreferences(preferences)
                    .build()
                
                val response = notificationServiceClient?.updateNotificationPreferences(request)
                    ?: throw Exception("Notification service client not available")
                
                continuation.resume(response)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    fun notificationStream(): Flow<NotificationItem> = flow {
        try {
            val request = NotificationStreamRequest.newBuilder()
                .setUserID("current_user") // This should be passed from the caller
                .build()
            
            val stream = notificationServiceClient?.notificationStream(request)
                ?: throw Exception("Notification service client not available")
            
            // Note: This is a simplified implementation. In production, you'd want to handle
            // the streaming response properly with proper lifecycle management
            stream.forEach { notification ->
                emit(notification)
            }
        } catch (error: Exception) {
            throw error
        }
    }
    
    // MARK: - Profile Methods
    suspend fun getUserProfile(userId: String): UserProfile {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = GetUserProfileRequest.newBuilder()
                    .setUserID(userId)
                    .build()
                
                val response = userServiceClient?.getUserProfile(request)
                    ?: throw Exception("User service client not available")
                
                continuation.resume(response.userProfile)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun getUserPosts(userId: String, page: Int, pageSize: Int): List<Note> {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = GetUserPostsRequest.newBuilder()
                    .setUserID(userId)
                    .setPage(page.toLong())
                    .setPageSize(pageSize.toLong())
                    .build()
                
                val response = noteServiceClient?.getUserPosts(request)
                    ?: throw Exception("Note service client not available")
                
                continuation.resume(response.notesList)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun getUserReplies(userId: String, page: Int, pageSize: Int): List<Note> {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = GetUserRepliesRequest.newBuilder()
                    .setUserID(userId)
                    .setPage(page.toLong())
                    .setPageSize(pageSize.toLong())
                    .build()
                
                val response = noteServiceClient?.getUserReplies(request)
                    ?: throw Exception("Note service client not available")
                
                continuation.resume(response.notesList)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun getUserMedia(userId: String, page: Int, pageSize: Int): List<Note> {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = GetUserMediaRequest.newBuilder()
                    .setUserID(userId)
                    .setPage(page.toLong())
                    .setPageSize(pageSize.toLong())
                    .build()
                
                val response = noteServiceClient?.getUserMedia(request)
                    ?: throw Exception("Note service client not available")
                
                continuation.resume(response.notesList)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun getUserLikes(userId: String, page: Int, pageSize: Int): List<Note> {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = GetUserLikesRequest.newBuilder()
                    .setUserID(userId)
                    .setPage(page.toLong())
                    .setPageSize(pageSize.toLong())
                    .build()
                
                val response = noteServiceClient?.getUserLikes(request)
                    ?: throw Exception("Note service client not available")
                
                continuation.resume(response.notesList)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun blockUser(userId: String, targetUserId: String): BlockUserResponse {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = BlockUserRequest.newBuilder()
                    .setUserID(userId)
                    .setTargetUserID(targetUserId)
                    .build()
                
                val response = userServiceClient?.blockUser(request)
                    ?: throw Exception("User service client not available")
                
                continuation.resume(response)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun unblockUser(userId: String, targetUserId: String): UnblockUserResponse {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = UnblockUserRequest.newBuilder()
                    .setUserID(userId)
                    .setTargetUserID(targetUserId)
                    .build()
                
                val response = userServiceClient?.unblockUser(request)
                    ?: throw Exception("User service client not available")
                
                continuation.resume(response)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    // MARK: - Settings Methods
    suspend fun updateNotificationPreferences(request: UpdateNotificationPreferencesRequest): UpdateNotificationPreferencesResponse {
        return suspendCancellableCoroutine { continuation ->
            try {
                val response = notificationServiceClient?.updateNotificationPreferences(request)
                    ?: throw Exception("Notification service client not available")
                
                continuation.resume(response)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun updatePrivacySettings(request: UpdatePrivacySettingsRequest): UpdatePrivacySettingsResponse {
        return suspendCancellableCoroutine { continuation ->
            try {
                val response = userServiceClient?.updatePrivacySettings(request)
                    ?: throw Exception("User service client not available")
                
                continuation.resume(response)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun updateContentPreferences(request: UpdateContentPreferencesRequest): UpdateContentPreferencesResponse {
        return suspendCancellableCoroutine { continuation ->
            try {
                val response = userServiceClient?.updateContentPreferences(request)
                    ?: throw Exception("User service client not available")
                
                continuation.resume(response)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun getStorageUsage(): StorageUsage {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = GetStorageUsageRequest.newBuilder().build()
                
                val response = mediaServiceClient?.getStorageUsage(request)
                    ?: throw Exception("Media service client not available")
                
                continuation.resume(response.storageUsage)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun clearCache(): ClearCacheResponse {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = ClearCacheRequest.newBuilder().build()
                
                val response = mediaServiceClient?.clearCache(request)
                    ?: throw Exception("Media service client not available")
                
                continuation.resume(response)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun exportUserData(): ExportUserDataResponse {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = ExportUserDataRequest.newBuilder().build()
                
                val response = userServiceClient?.exportUserData(request)
                    ?: throw Exception("User service client not available")
                
                continuation.resume(response)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    suspend fun deleteAccount(): DeleteAccountResponse {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = DeleteAccountRequest.newBuilder().build()
                
                val response = userServiceClient?.deleteAccount(request)
                    ?: throw Exception("User service client not available")
                
                continuation.resume(response)
                
            } catch (error: Exception) {
                continuation.resumeWithException(error)
            }
        }
    }
    
    // MARK: - Cleanup
    fun shutdown() {
        try {
            channel?.shutdown()?.awaitTermination(5, TimeUnit.SECONDS)
        } catch (error: Exception) {
            println("Error shutting down gRPC channel: $error")
        }
    }
}

// MARK: - Configuration
data class SonetConfiguration(
    val host: String,
    val port: Int,
    val useTLS: Boolean,
    val timeout: Long
) {
    companion object {
        val development = SonetConfiguration(
            host = "localhost",
            port = 50051,
            useTLS = false,
            timeout = 30L
        )
        
        val staging = SonetConfiguration(
            host = "staging.sonet.app",
            port = 443,
            useTLS = true,
            timeout = 30L
        )
        
        val production = SonetConfiguration(
            host = "api.sonet.app",
            port = 443,
            useTLS = true,
            timeout = 30L
        )
    }
}

// MARK: - Error Types
sealed class SonetError : Exception() {
    object ServiceUnavailable : SonetError() {
        override val message: String = "Service is currently unavailable"
    }
    
    object AuthenticationFailed : SonetError() {
        override val message: String = "Authentication failed"
    }
    
    object NetworkError : SonetError() {
        override val message: String = "Network connection error"
    }
    
    object InvalidResponse : SonetError() {
        override val message: String = "Invalid response from server"
    }
    
    object RateLimited : SonetError() {
        override val message: String = "Too many requests, please try again later"
    }
    
    object VideoNotFound : SonetError() {
        override val message: String = "Video not found"
    }
    
    object UserNotFound : SonetError() {
        override val message: String = "User not found"
    }
    
    object PermissionDenied : SonetError() {
        override val message: String = "Permission denied"
    }
    
    object InvalidRequest : SonetError() {
        override val message: String = "Invalid request"
    }
    
    object ServerError : SonetError() {
        override val message: String = "Server error occurred"
    }
}

// MARK: - Video Tab Enum
enum class VideoTab(
    val value: String,
    val displayName: String
) {
    FOR_YOU("for_you", "For You"),
    TRENDING("trending", "Trending"),
    FOLLOWING("following", "Following"),
    DISCOVER("discover", "Discover");
    
    val grpcType: xyz.sonet.app.grpc.proto.VideoTab
        get() = when (this) {
            FOR_YOU -> xyz.sonet.app.grpc.proto.VideoTab.VIDEO_TAB_FOR_YOU
            TRENDING -> xyz.sonet.app.grpc.proto.VideoTab.VIDEO_TAB_TRENDING
            FOLLOWING -> xyz.sonet.app.grpc.proto.VideoTab.VIDEO_TAB_FOLLOWING
            DISCOVER -> xyz.sonet.app.grpc.proto.VideoTab.VIDEO_TAB_DISCOVER
        }
}