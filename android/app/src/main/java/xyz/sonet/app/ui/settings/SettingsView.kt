package xyz.sonet.app.ui.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import coil.request.ImageRequest
import xyz.sonet.app.ui.components.SonetLogo
import xyz.sonet.app.ui.components.LogoSize
import xyz.sonet.app.viewmodels.SettingsViewModel
import xyz.sonet.app.viewmodels.*

@Composable
fun SettingsView(
    modifier: Modifier = Modifier,
    viewModel: SettingsViewModel = viewModel(),
    onNavigateBack: () -> Unit = {}
) {
    val userProfile by viewModel.userProfile.collectAsState()
    val isDarkMode by viewModel.isDarkMode.collectAsState()
    val notificationsEnabled by viewModel.notificationsEnabled.collectAsState()
    val pushNotificationsEnabled by viewModel.pushNotificationsEnabled.collectAsState()
    val emailNotificationsEnabled by viewModel.emailNotificationsEnabled.collectAsState()
    val inAppNotificationsEnabled by viewModel.inAppNotificationsEnabled.collectAsState()
    val accountVisibility by viewModel.accountVisibility.collectAsState()
    val contentLanguage by viewModel.contentLanguage.collectAsState()
    val contentFiltering by viewModel.contentFiltering.collectAsState()
    val autoPlayVideos by viewModel.autoPlayVideos.collectAsState()
    val dataUsage by viewModel.dataUsage.collectAsState()
    val storageUsage by viewModel.storageUsage.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()
    val showLogoutAlert by viewModel.showLogoutAlert.collectAsState()
    val showDeleteAccountAlert by viewModel.showDeleteAccountAlert.collectAsState()
    
    LaunchedEffect(Unit) {
        viewModel.loadUserProfile()
        viewModel.loadSettings()
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = modifier
                .fillMaxSize()
                .padding(paddingValues),
            contentPadding = PaddingValues(vertical = 8.dp)
        ) {
            // Profile Section
            item {
                ProfileSection(userProfile = userProfile)
            }
            
            // Account Settings
            item {
                AccountSettingsSection(
                    accountVisibility = accountVisibility,
                    onUpdateVisibility = { viewModel.updateAccountVisibility(it) }
                )
            }
            
            // Appearance
            item {
                AppearanceSection(
                    isDarkMode = isDarkMode,
                    onToggleDarkMode = { viewModel.toggleDarkMode() }
                )
            }
            
            // Notifications
            item {
                NotificationsSection(
                    notificationsEnabled = notificationsEnabled,
                    pushNotificationsEnabled = pushNotificationsEnabled,
                    emailNotificationsEnabled = emailNotificationsEnabled,
                    inAppNotificationsEnabled = inAppNotificationsEnabled,
                    onUpdateNotifications = { viewModel.updateNotificationSettings() }
                )
            }
            
            // Content Preferences
            item {
                ContentPreferencesSection(
                    contentLanguage = contentLanguage,
                    contentFiltering = contentFiltering,
                    autoPlayVideos = autoPlayVideos,
                    onUpdateLanguage = { viewModel.updateContentLanguage(it) },
                    onUpdateFiltering = { viewModel.updateContentFiltering(it) },
                    onToggleAutoPlay = { viewModel.toggleAutoPlayVideos() }
                )
            }
            
            // Data & Storage
            item {
                DataStorageSection(
                    dataUsage = dataUsage,
                    storageUsage = storageUsage,
                    onUpdateDataUsage = { viewModel.updateDataUsage(it) },
                    onClearCache = { viewModel.clearCache() },
                    onDownloadData = { viewModel.downloadUserData() }
                )
            }
            
            // Privacy & Safety
            item {
                PrivacySafetySection()
            }
            
            // Help & Support
            item {
                HelpSupportSection()
            }
            
            // Account Actions
            item {
                AccountActionsSection(
                    onLogout = { viewModel.showLogoutAlert() },
                    onDeleteAccount = { viewModel.showDeleteAccountAlert() }
                )
            }
        }
        
        // Error Snackbar
        error?.let { errorMessage ->
            LaunchedEffect(errorMessage) {
                // Show error snackbar
            }
        }
        
        // Logout Alert
        if (showLogoutAlert) {
            AlertDialog(
                onDismissRequest = { viewModel.hideLogoutAlert() },
                title = { Text("Log Out") },
                text = { Text("Are you sure you want to log out?") },
                confirmButton = {
                    TextButton(
                        onClick = {
                            viewModel.logout()
                            viewModel.hideLogoutAlert()
                            onNavigateBack()
                        }
                    ) {
                        Text("Log Out")
                    }
                },
                dismissButton = {
                    TextButton(onClick = { viewModel.hideLogoutAlert() }) {
                        Text("Cancel")
                    }
                }
            )
        }
        
        // Delete Account Alert
        if (showDeleteAccountAlert) {
            AlertDialog(
                onDismissRequest = { viewModel.hideDeleteAccountAlert() },
                title = { Text("Delete Account") },
                text = { Text("This action cannot be undone. All your data will be permanently deleted.") },
                confirmButton = {
                    TextButton(
                        onClick = {
                            viewModel.deleteAccount()
                            viewModel.hideDeleteAccountAlert()
                            onNavigateBack()
                        }
                    ) {
                        Text("Delete")
                    }
                },
                dismissButton = {
                    TextButton(onClick = { viewModel.hideDeleteAccountAlert() }) {
                        Text("Cancel")
                    }
                }
            )
        }
    }
}

// MARK: - Profile Section
@Composable
fun ProfileSection(userProfile: UserProfile?) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = "Profile",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                AsyncImage(
                    model = ImageRequest.Builder(LocalContext.current)
                        .data(userProfile?.avatarUrl ?: "")
                        .crossfade(true)
                        .build(),
                    contentDescription = "Profile picture",
                    modifier = Modifier
                        .size(60.dp)
                        .clip(CircleShape),
                    contentScale = ContentScale.Crop,
                    error = {
                        Box(
                            modifier = Modifier
                                .size(60.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.surfaceVariant),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Person,
                                contentDescription = "Profile placeholder",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                )
                
                Column {
                    Text(
                        text = userProfile?.displayName ?: "Loading...",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    
                    Text(
                        text = "@${userProfile?.username ?: "username"}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                
                Spacer(modifier = Modifier.weight(1f))
                
                OutlinedButton(
                    onClick = { /* Navigate to edit profile */ }
                ) {
                    Text("Edit")
                }
            }
        }
    }
}

// MARK: - Account Settings Section
@Composable
fun AccountSettingsSection(
    accountVisibility: AccountVisibility,
    onUpdateVisibility: (AccountVisibility) -> Unit
) {
    SettingsSection(
        title = "Account",
        subtitle = "Control who can see your profile and posts"
    ) {
        SettingsItem(
            icon = Icons.Default.Person,
            title = "Account Information",
            onClick = { /* Navigate to account info */ }
        )
        
        SettingsItem(
            icon = Icons.Default.Security,
            title = "Security",
            onClick = { /* Navigate to SecurityView */ }
        )
        
        SettingsItem(
            icon = Icons.Default.Lock,
            title = "Two-Factor Authentication",
            onClick = { /* Navigate to 2FA */ }
        )
        
        SettingsItem(
            icon = Icons.Default.Link,
            title = "Connected Accounts",
            onClick = { /* Navigate to connected accounts */ }
        )
        
        // Account Visibility Picker
        Column(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            Text(
                text = "Account Visibility",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurface
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            AccountVisibility.values().forEach { visibility ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    RadioButton(
                        selected = accountVisibility == visibility,
                        onClick = { onUpdateVisibility(visibility) }
                    )
                    
                    Column(
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(
                            text = visibility.displayName,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        
                        Text(
                            text = visibility.description,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}

// MARK: - Appearance Section
@Composable
fun AppearanceSection(
    isDarkMode: Boolean,
    onToggleDarkMode: () -> Unit
) {
    SettingsSection(
        title = "Appearance",
        subtitle = "Customize how Sonet looks and feels"
    ) {
        SettingsToggleItem(
            icon = Icons.Default.DarkMode,
            title = "Dark Mode",
            checked = isDarkMode,
            onCheckedChange = { onToggleDarkMode() }
        )
        
        SettingsItem(
            icon = Icons.Default.Palette,
            title = "Theme",
            onClick = { /* Navigate to theme */ }
        )
        
        SettingsItem(
            icon = Icons.Default.TextFields,
            title = "Font Size",
            onClick = { /* Navigate to font size */ }
        )
        
        SettingsItem(
            icon = Icons.Default.ColorLens,
            title = "Color Scheme",
            onClick = { /* Navigate to color scheme */ }
        )
    }
}

// MARK: - Notifications Section
@Composable
fun NotificationsSection(
    notificationsEnabled: Boolean,
    pushNotificationsEnabled: Boolean,
    emailNotificationsEnabled: Boolean,
    inAppNotificationsEnabled: Boolean,
    onUpdateNotifications: () -> Unit
) {
    SettingsSection(
        title = "Notifications",
        subtitle = "Choose how you want to be notified"
    ) {
        SettingsToggleItem(
            icon = Icons.Default.Notifications,
            title = "Notifications",
            checked = notificationsEnabled,
            onCheckedChange = { onUpdateNotifications() }
        )
        
        if (notificationsEnabled) {
            SettingsToggleItem(
                icon = Icons.Default.NotificationsActive,
                title = "Push Notifications",
                checked = pushNotificationsEnabled,
                onCheckedChange = { onUpdateNotifications() }
            )
            
            SettingsToggleItem(
                icon = Icons.Default.Email,
                title = "Email Notifications",
                checked = emailNotificationsEnabled,
                onCheckedChange = { onUpdateNotifications() }
            )
            
            SettingsToggleItem(
                icon = Icons.Default.NotificationsNone,
                title = "In-App Notifications",
                checked = inAppNotificationsEnabled,
                onCheckedChange = { onUpdateNotifications() }
            )
            
            SettingsItem(
                icon = Icons.Default.Settings,
                title = "Notification Preferences",
                onClick = { /* Navigate to notification preferences */ }
            )
        }
    }
}

// MARK: - Content Preferences Section
@Composable
fun ContentPreferencesSection(
    contentLanguage: String,
    contentFiltering: ContentFiltering,
    autoPlayVideos: Boolean,
    onUpdateLanguage: (String) -> Unit,
    onUpdateFiltering: (ContentFiltering) -> Unit,
    onToggleAutoPlay: () -> Unit
) {
    val languages = listOf("English", "Spanish", "French", "German", "Italian", "Portuguese", "Russian", "Chinese", "Japanese", "Korean")
    
    SettingsSection(
        title = "Content",
        subtitle = "Control what content you see and how it's displayed"
    ) {
        // Language Picker
        SettingsDropdownItem(
            icon = Icons.Default.Language,
            title = "Language",
            value = contentLanguage,
            options = languages,
            onValueChange = { onUpdateLanguage(it) }
        )
        
        // Content Filtering Picker
        SettingsDropdownItem(
            icon = Icons.Default.FilterList,
            title = "Content Filtering",
            value = contentFiltering.displayName,
            options = ContentFiltering.values().map { it.displayName },
            onValueChange = { 
                val filtering = ContentFiltering.values().find { it.displayName == it } ?: ContentFiltering.MODERATE
                onUpdateFiltering(filtering)
            }
        )
        
        SettingsToggleItem(
            icon = Icons.Default.PlayArrow,
            title = "Auto-play Videos",
            checked = autoPlayVideos,
            onCheckedChange = { onToggleAutoPlay() }
        )
        
        SettingsItem(
            icon = Icons.Default.Settings,
            title = "Content Preferences",
            onClick = { /* Navigate to content preferences */ }
        )
    }
}

// MARK: - Data & Storage Section
@Composable
fun DataStorageSection(
    dataUsage: DataUsage,
    storageUsage: StorageUsage,
    onUpdateDataUsage: (DataUsage) -> Unit,
    onClearCache: () -> Unit,
    onDownloadData: () -> Unit
) {
    SettingsSection(
        title = "Data & Storage",
        subtitle = "Manage your data usage and storage"
    ) {
        // Data Usage Picker
        SettingsDropdownItem(
            icon = Icons.Default.DataUsage,
            title = "Data Usage",
            value = dataUsage.displayName,
            options = DataUsage.values().map { it.displayName },
            onValueChange = { 
                val usage = DataUsage.values().find { it.displayName == it } ?: DataUsage.STANDARD
                onUpdateDataUsage(usage)
            }
        )
        
        // Storage Usage
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
            )
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Storage",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium
                    )
                    
                    Text(
                        text = "${formatBytes(storageUsage.usedStorage)} of ${formatBytes(storageUsage.totalStorage)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                
                Spacer(modifier = Modifier.height(8.dp))
                
                LinearProgressIndicator(
                    progress = (storageUsage.usagePercentage / 100).toFloat(),
                    modifier = Modifier.fillMaxWidth()
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Cache: ${formatBytes(storageUsage.cacheSize)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    
                    TextButton(onClick = onClearCache) {
                        Text("Clear")
                    }
                }
            }
        }
        
        Button(
            onClick = onDownloadData,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            Icon(Icons.Default.Download, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Download Your Data")
        }
    }
}

// MARK: - Privacy & Safety Section
@Composable
fun PrivacySafetySection() {
    SettingsSection(
        title = "Privacy & Safety",
        subtitle = "Control your privacy and safety settings"
    ) {
        SettingsItem(
            icon = Icons.Default.PrivacyTip,
            title = "Privacy",
            onClick = { /* TODO: navigate("privacy/location") or show privacy root */ }
        )
        
        SettingsItem(
            icon = Icons.Default.Security,
            title = "Safety",
            onClick = { /* Navigate to safety */ }
        )
        
        SettingsItem(
            icon = Icons.Default.Block,
            title = "Blocked Accounts",
            onClick = { /* Navigate to blocked accounts */ }
        )
        
        SettingsItem(
            icon = Icons.Default.VolumeOff,
            title = "Muted Accounts",
            onClick = { /* Navigate to muted accounts */ }
        )
        
        SettingsItem(
            icon = Icons.Default.VisibilityOff,
            title = "Content You've Hidden",
            onClick = { /* Navigate to hidden content */ }
        )
    }
}

// MARK: - Help & Support Section
@Composable
fun HelpSupportSection() {
    SettingsSection(
        title = "Help & Support",
        subtitle = "Get help and learn more about Sonet"
    ) {
        SettingsItem(
            icon = Icons.Default.Help,
            title = "Help Center",
            onClick = { /* Navigate to help center */ }
        )
        
        SettingsItem(
            icon = Icons.Default.Support,
            title = "Contact Support",
            onClick = { /* Navigate to contact support */ }
        )
        
        SettingsItem(
            icon = Icons.Default.Report,
            title = "Report a Problem",
            onClick = { /* Navigate to report problem */ }
        )
        
        SettingsItem(
            icon = Icons.Default.Description,
            title = "Terms of Service",
            onClick = { /* Navigate to terms */ }
        )
        
        SettingsItem(
            icon = Icons.Default.Policy,
            title = "Privacy Policy",
            onClick = { /* Navigate to privacy policy */ }
        )
        
        SettingsItem(
            icon = Icons.Default.Info,
            title = "About Sonet",
            onClick = { /* Navigate to about */ }
        )
    }
}

// MARK: - Account Actions Section
@Composable
fun AccountActionsSection(
    onLogout: () -> Unit,
    onDeleteAccount: () -> Unit
) {
    SettingsSection(
        title = "Account Actions",
        subtitle = "These actions cannot be undone"
    ) {
        Button(
            onClick = onLogout,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.error
            )
        ) {
            Icon(Icons.Default.Logout, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Log Out")
        }
        
        Button(
            onClick = onDeleteAccount,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.error
            )
        ) {
            Icon(Icons.Default.DeleteForever, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Delete Account")
        }
    }
}

// MARK: - Helper Components
@Composable
fun SettingsSection(
    title: String,
    subtitle: String,
    content: @Composable () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            content()
        }
    }
}

@Composable
fun SettingsItem(
    icon: ImageVector,
    title: String,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
        color = Color.Transparent
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(24.dp)
            )
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Text(
                text = title,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.weight(1f)
            )
            
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = "Navigate",
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

@Composable
fun SettingsToggleItem(
    icon: ImageVector,
    title: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
        color = Color.Transparent
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(24.dp)
            )
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Text(
                text = title,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.weight(1f)
            )
            
            Switch(
                checked = checked,
                onCheckedChange = onCheckedChange
            )
        }
    }
}

@Composable
fun SettingsDropdownItem(
    icon: ImageVector,
    title: String,
    value: String,
    options: List<String>,
    onValueChange: (String) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
        color = Color.Transparent
    ) {
        Column {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(24.dp)
                )
                
                Spacer(modifier = Modifier.width(16.dp))
                
                Text(
                    text = title,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.weight(1f)
                )
                
                Text(
                    text = value,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                
                IconButton(onClick = { expanded = true }) {
                    Icon(Icons.Default.ArrowDropDown, contentDescription = "Expand")
                }
            }
            
            DropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false }
            ) {
                options.forEach { option ->
                    DropdownMenuItem(
                        text = { Text(option) },
                        onClick = {
                            onValueChange(option)
                            expanded = false
                        }
                    )
                }
            }
        }
    }
}

// MARK: - Helper Functions
private fun formatBytes(bytes: Long): String {
    val formatter = java.text.NumberFormat.getNumberInstance()
    return when {
        bytes < 1024 -> "$bytes B"
        bytes < 1024 * 1024 -> "${formatter.format(bytes / 1024.0)} KB"
        bytes < 1024 * 1024 * 1024 -> "${formatter.format(bytes / (1024.0 * 1024.0))} MB"
        else -> "${formatter.format(bytes / (1024.0 * 1024.0 * 1024.0))} GB"
    }
}

private enum class SettingsSubpage {
    SECURITY,
    TWO_FACTOR,
    CONNECTED_ACCOUNTS,
    NOTIFICATION_PREFERENCES,
    CONTENT_PREFERENCES,
    PRIVACY,
    SAFETY,
    BLOCKED_ACCOUNTS,
    MUTED_ACCOUNTS,
    HIDDEN_CONTENT,
    HELP_CENTER,
    CONTACT_SUPPORT,
    REPORT_PROBLEM,
    TERMS,
    PRIVACY_POLICY,
    ABOUT
}

@Composable
private fun SimpleSettingsPage(
    title: String,
    onNavigateBack: () -> Unit,
    content: @Composable ColumnScope.() -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(title) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            content()
        }
    }
}

@Composable
private fun TwoFactorSettingsView(onNavigateBack: () -> Unit) {
    SimpleSettingsPage(title = "Two-Factor Authentication", onNavigateBack = onNavigateBack) {
        Text("Two-Factor Authentication setup is coming soon.", style = MaterialTheme.typography.bodyMedium)
        Text("You will be able to enable app-based codes and manage backup codes here.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}