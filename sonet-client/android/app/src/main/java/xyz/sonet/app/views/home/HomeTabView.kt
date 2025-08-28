package xyz.sonet.app.views.home

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import xyz.sonet.app.viewmodels.SessionViewModel
import xyz.sonet.app.viewmodels.ThemeViewModel
import xyz.sonet.app.viewmodels.HomeViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeTabView(
    sessionViewModel: SessionViewModel,
    themeViewModel: ThemeViewModel
) {
    val homeViewModel = androidx.lifecycle.viewmodel.compose.viewModel<HomeViewModel>()
    
    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        // Custom Navigation Bar
        HomeNavigationBar(
            selectedFeed = homeViewModel.selectedFeed,
            onFeedChanged = { feed ->
                homeViewModel.selectFeed(feed)
            }
        )
        
        // Feed Content
        when {
            homeViewModel.isLoading -> {
                LoadingView()
            }
            homeViewModel.error != null -> {
                ErrorView(
                    error = homeViewModel.error!!,
                    onRetry = {
                        homeViewModel.refreshFeed()
                    }
                )
            }
            else -> {
                FeedView(
                    feed = homeViewModel.selectedFeed,
                    notes = homeViewModel.notes,
                    onRefresh = {
                        homeViewModel.refreshFeed()
                    },
                    onLoadMore = {
                        homeViewModel.loadMoreNotes()
                    }
                )
            }
        }
    }
    
    LaunchedEffect(Unit) {
        homeViewModel.loadFeed()
    }
}

@Composable
fun HomeNavigationBar(
    selectedFeed: FeedType,
    onFeedChanged: (FeedType) -> Unit
) {
    Column(
        modifier = Modifier.fillMaxWidth()
    ) {
        // Main Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Home",
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold
            )
            
            Spacer(modifier = Modifier.weight(1f))
            
            IconButton(
                onClick = { /* Open composer */ }
            ) {
                Icon(
                    imageVector = Icons.Default.Add,
                    contentDescription = "Compose",
                    tint = MaterialTheme.colorScheme.primary
                )
            }
        }
        
        // Feed Type Selector
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            items(FeedType.values()) { feedType ->
                FeedTypeButton(
                    feedType = feedType,
                    isSelected = selectedFeed == feedType,
                    onClick = {
                        onFeedChanged(feedType)
                    }
                )
            }
        }
        
        Divider()
    }
}

@Composable
fun FeedTypeButton(
    feedType: FeedType,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        colors = ButtonDefaults.buttonColors(
            containerColor = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface,
            contentColor = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
        ),
        shape = MaterialTheme.shapes.medium
    ) {
        Text(
            text = feedType.displayName,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = if (isSelected) FontWeight.Semibold else FontWeight.Medium
        )
    }
}

@Composable
fun FeedView(
    feed: FeedType,
    notes: List<SonetNote>,
    onRefresh: () -> Unit,
    onLoadMore: () -> Unit
) {
    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        items(notes) { note ->
            NoteCard(note = note)
        }
        
        // Load More Button
        if (notes.isNotEmpty()) {
            item {
                Button(
                    onClick = onLoadMore,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Load More")
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NoteCard(note: SonetNote) {
    var isLiked by remember { mutableStateOf(false) }
    var isReposted by remember { mutableStateOf(false) }
    
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // User Header
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Avatar placeholder
                Surface(
                    modifier = Modifier.size(40.dp),
                    shape = MaterialTheme.shapes.circular,
                    color = MaterialTheme.colorScheme.surfaceVariant
                ) {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = null,
                        modifier = Modifier.padding(8.dp)
                    )
                }
                
                Spacer(modifier = Modifier.width(12.dp))
                
                Column {
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = note.author.displayName,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Semibold
                        )
                        
                        if (note.author.isVerified) {
                            Spacer(modifier = Modifier.width(4.dp))
                            Icon(
                                imageVector = Icons.Default.Verified,
                                contentDescription = "Verified",
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                    
                    Text(
                        text = note.author.handle,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                
                Spacer(modifier = Modifier.weight(1f))
                
                Text(
                    text = note.timeAgo,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            
            // Note Content
            if (note.text.isNotEmpty()) {
                Text(
                    text = note.text,
                    style = MaterialTheme.typography.bodyLarge
                )
            }
            
            // Media Content placeholder
            if (note.media != null && note.media.isNotEmpty()) {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp),
                    shape = MaterialTheme.shapes.medium,
                    color = MaterialTheme.colorScheme.surfaceVariant
                ) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Image,
                            contentDescription = "Media",
                            modifier = Modifier.size(48.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
            
            // Action Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                // Reply Button
                IconButton(onClick = { /* Handle reply */ }) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.ChatBubbleOutline,
                            contentDescription = "Reply"
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("${note.replyCount}")
                    }
                }
                
                // Repost Button
                IconButton(
                    onClick = { isReposted = !isReposted }
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = if (isReposted) Icons.Default.Reply else Icons.Default.Reply,
                            contentDescription = "Repost",
                            tint = if (isReposted) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("${note.repostCount}")
                    }
                }
                
                // Like Button
                IconButton(
                    onClick = { isLiked = !isLiked }
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = if (isLiked) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                            contentDescription = "Like",
                            tint = if (isLiked) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("${note.likeCount}")
                    }
                }
                
                // Share Button
                IconButton(onClick = { /* Handle share */ }) {
                    Icon(
                        imageVector = Icons.Default.Share,
                        contentDescription = "Share"
                    )
                }
            }
        }
    }
}

@Composable
fun LoadingView() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            CircularProgressIndicator(
                modifier = Modifier.size(48.dp)
            )
            
            Text(
                text = "Loading feed...",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
fun ErrorView(
    error: Throwable,
    onRetry: () -> Unit
) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Error,
                contentDescription = null,
                modifier = Modifier.size(48.dp),
                tint = MaterialTheme.colorScheme.error
            )
            
            Text(
                text = "Something went wrong",
                style = MaterialTheme.typography.headlineSmall
            )
            
            Text(
                text = error.message ?: "An unknown error occurred",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )
            
            Button(onClick = onRetry) {
                Text("Try Again")
            }
        }
    }
}

// Data models (these would typically be in separate files)
enum class FeedType(val displayName: String) {
    FOLLOWING("Following"),
    FOR_YOU("For You"),
    TRENDING("Trending"),
    LATEST("Latest")
}

data class SonetNote(
    val id: String,
    val text: String,
    val author: SonetUser,
    val createdAt: Long,
    val likeCount: Int,
    val repostCount: Int,
    val replyCount: Int,
    val media: List<MediaItem>?,
    var isLiked: Boolean,
    var isReposted: Boolean
) {
    val timeAgo: String
        get() = "2h ago" // Simplified for now
}

data class SonetUser(
    val id: String,
    val username: String,
    val displayName: String,
    val avatarUrl: String?,
    val isVerified: Boolean,
    val createdAt: Long
) {
    val handle: String
        get() = "@$username"
}

data class MediaItem(
    val id: String,
    val url: String,
    val type: MediaType,
    val altText: String?
)

enum class MediaType {
    IMAGE, VIDEO, GIF
}