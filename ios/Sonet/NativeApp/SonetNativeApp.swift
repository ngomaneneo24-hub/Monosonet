import SwiftUI
import UIKit

@main
struct SonetNativeApp: App {
    @StateObject private var appState = AppState()
    @StateObject private var sessionManager = SessionManager()
    @StateObject private var navigationManager = NavigationManager()
    @StateObject private var themeManager = ThemeManager()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .environmentObject(sessionManager)
                .environmentObject(navigationManager)
                .environmentObject(themeManager)
                .preferredColorScheme(themeManager.colorScheme)
                .onAppear {
                    setupApp()
                }
        }
    }
    
    private func setupApp() {
        // Initialize core services
        sessionManager.initialize()
        themeManager.initialize()
        
        // Setup background tasks and notifications
        setupBackgroundTasks()
    }
    
    private func setupBackgroundTasks() {
        // Configure background app refresh, notifications, etc.
    }
}

// MARK: - Main Content View
struct ContentView: View {
    @EnvironmentObject var sessionManager: SessionManager
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        Group {
            if sessionManager.isAuthenticated {
                MainTabView()
            } else {
                AuthenticationView()
            }
        }
        .animation(.easeInOut(duration: 0.3), value: sessionManager.isAuthenticated)
    }
}

// MARK: - Main Tab View
struct MainTabView: View {
    @EnvironmentObject var navigationManager: NavigationManager
    @EnvironmentObject var themeManager: ThemeManager
    
    var body: some View {
        TabView(selection: $navigationManager.selectedTab) {
            HomeTabView()
                .tabItem {
                    IconView(AppIcons.home)
                    Text("Home")
                }
                .tag(Tab.home)
            
            VideoFeedView(grpcClient: SonetGRPCClient(configuration: .development))
                .tabItem {
                    IconView(AppIcons.video)
                    Text("Video")
                }
                .tag(Tab.video)
            
            MessagesTabView()
                .tabItem {
                    IconView(AppIcons.messages)
                    Text("Messages")
                }
                .tag(Tab.messages)
            
            NotificationsTabView()
                .tabItem {
                    IconView(AppIcons.notifications)
                    Text("Notifications")
                }
                .tag(Tab.notifications)
            
            ProfileTabView()
                .tabItem {
                    IconView(AppIcons.profile)
                    Text("Profile")
                }
                .tag(Tab.profile)
        }
        .accentColor(themeManager.accentColor)
        .onAppear {
            setupTabBarAppearance()
        }
    }
    
    private func setupTabBarAppearance() {
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = themeManager.tabBarBackgroundColor
        
        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }
}

// MARK: - Tab Enumeration
enum Tab: Int, CaseIterable {
    case home = 0
    case video = 1
    case messages = 2
    case notifications = 3
    case profile = 4
}