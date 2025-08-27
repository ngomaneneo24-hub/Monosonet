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
    
    // MARK: - Messaging Methods
    suspend fun getConversations(userId: String): List<Conversation> {
        return suspendCancellableCoroutine { continuation ->
            try {
                val request = GetConversationsRequest.newBuilder()
                    .setUserID(userId)
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
}