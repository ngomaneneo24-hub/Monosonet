package xyz.sonet.app.views.profile

import androidx.compose.runtime.Composable
import xyz.sonet.app.ui.profile.ProfileView

@Composable
fun ProfileTabView(
    sessionViewModel: xyz.sonet.app.viewmodels.SessionViewModel,
    themeViewModel: xyz.sonet.app.viewmodels.ThemeViewModel
) {
    // For now, show a demo profile. In a real app, this would be the current user's ID
    ProfileView(userId = "demo_user_123")
}