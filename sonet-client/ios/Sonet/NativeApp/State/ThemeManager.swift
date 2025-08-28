import Foundation
import SwiftUI
import Combine

@MainActor
class ThemeManager: ObservableObject {
    // MARK: - Published Properties
    @Published var colorScheme: ColorScheme = .light
    @Published var isDarkMode: Bool = false
    @Published var accentColor: Color = .blue
    @Published var backgroundColor: Color = .white
    @Published var textColor: Color = .black
    @Published var secondaryTextColor: Color = .gray
    
    // MARK: - Private Properties
    private var cancellables = Set<AnyCancellable>()
    private let userDefaults = UserDefaults.standard
    private let themeKey = "selectedTheme"
    
    // MARK: - Computed Properties
    var tabBarBackgroundColor: UIColor {
        isDarkMode ? UIColor.systemBackground : UIColor.systemBackground
    }
    
    var navigationBarBackgroundColor: UIColor {
        isDarkMode ? UIColor.systemBackground : UIColor.systemBackground
    }
    
    // MARK: - Initialization
    init() {
        loadSavedTheme()
        setupThemeObservers()
    }
    
    // MARK: - Public Methods
    func initialize() {
        // Apply system theme if no saved preference
        if userDefaults.object(forKey: themeKey) == nil {
            applySystemTheme()
        }
    }
    
    func setTheme(_ theme: AppTheme) {
        switch theme {
        case .light:
            colorScheme = .light
            isDarkMode = false
            applyLightTheme()
        case .dark:
            colorScheme = .dark
            isDarkMode = true
            applyDarkTheme()
        case .system:
            applySystemTheme()
        }
        
        saveTheme(theme)
    }
    
    func toggleTheme() {
        let newTheme: AppTheme = isDarkMode ? .light : .dark
        setTheme(newTheme)
    }
    
    // MARK: - Private Methods
    private func loadSavedTheme() {
        if let themeRawValue = userDefaults.string(forKey: themeKey),
           let theme = AppTheme(rawValue: themeRawValue) {
            setTheme(theme)
        } else {
            applySystemTheme()
        }
    }
    
    private func saveTheme(_ theme: AppTheme) {
        userDefaults.set(theme.rawValue, forKey: themeKey)
    }
    
    private func setupThemeObservers() {
        // Observe system theme changes
        NotificationCenter.default.publisher(for: .traitCollectionDidChange)
            .sink { [weak self] _ in
                self?.handleSystemThemeChange()
            }
            .store(in: &cancellables)
    }
    
    private func handleSystemThemeChange() {
        // Only apply system theme if user hasn't manually selected one
        if userDefaults.string(forKey: themeKey) == AppTheme.system.rawValue {
            applySystemTheme()
        }
    }
    
    private func applySystemTheme() {
        let systemColorScheme = UITraitCollection.current.userInterfaceStyle
        
        switch systemColorScheme {
        case .dark:
            colorScheme = .dark
            isDarkMode = true
            applyDarkTheme()
        case .light:
            colorScheme = .light
            isDarkMode = false
            applyLightTheme()
        case .unspecified:
            // Default to light theme
            colorScheme = .light
            isDarkMode = false
            applyLightTheme()
        @unknown default:
            colorScheme = .light
            isDarkMode = false
            applyLightTheme()
        }
    }
    
    private func applyLightTheme() {
        backgroundColor = .white
        textColor = .black
        secondaryTextColor = .gray
        accentColor = .blue
    }
    
    private func applyDarkTheme() {
        backgroundColor = Color(.systemBackground)
        textColor = Color(.label)
        secondaryTextColor = Color(.secondaryLabel)
        accentColor = .blue
    }
}

// MARK: - App Theme Enum
enum AppTheme: String, CaseIterable {
    case light = "light"
    case dark = "dark"
    case system = "system"
    
    var displayName: String {
        switch self {
        case .light: return "Light"
        case .dark: return "Dark"
        case .system: return "System"
        }
    }
    
    var iconName: String {
        switch self {
        case .light: return "sun.max"
        case .dark: return "moon"
        case .system: return "gear"
        }
    }
}

// MARK: - Color Extensions
extension Color {
    static let sonetPrimary = Color("SonetPrimary")
    static let sonetSecondary = Color("SonetSecondary")
    static let sonetBackground = Color("SonetBackground")
    static let sonetSurface = Color("SonetSurface")
    static let sonetError = Color("SonetError")
    static let sonetSuccess = Color("SonetSuccess")
    static let sonetWarning = Color("SonetWarning")
    
    // Semantic colors
    static let sonetTextPrimary = Color("SonetTextPrimary")
    static let sonetTextSecondary = Color("SonetTextSecondary")
    static let sonetTextTertiary = Color("SonetTextTertiary")
    
    // Interactive colors
    static let sonetInteractive = Color("SonetInteractive")
    static let sonetInteractivePressed = Color("SonetInteractivePressed")
    static let sonetInteractiveDisabled = Color("SonetInteractiveDisabled")
}

// MARK: - Theme Presets
struct ThemePreset {
    let name: String
    let primaryColor: Color
    let secondaryColor: Color
    let backgroundColor: Color
    let surfaceColor: Color
    
    static let defaultTheme = ThemePreset(
        name: "Default",
        primaryColor: .blue,
        secondaryColor: .gray,
        backgroundColor: .white,
        surfaceColor: Color(.systemGray6)
    )
    
    static let darkTheme = ThemePreset(
        name: "Dark",
        primaryColor: .blue,
        secondaryColor: .gray,
        backgroundColor: Color(.systemBackground),
        surfaceColor: Color(.systemGray6)
    )
    
    static let blueTheme = ThemePreset(
        name: "Blue",
        primaryColor: .blue,
        secondaryColor: .cyan,
        backgroundColor: .white,
        surfaceColor: Color(.systemBlue).opacity(0.1)
    )
    
    static let greenTheme = ThemePreset(
        name: "Green",
        primaryColor: .green,
        secondaryColor: .mint,
        backgroundColor: .white,
        surfaceColor: Color(.systemGreen).opacity(0.1)
    )
    
    static let purpleTheme = ThemePreset(
        name: "Purple",
        primaryColor: .purple,
        secondaryColor: .pink,
        backgroundColor: .white,
        surfaceColor: Color(.systemPurple).opacity(0.1)
    )
    
    static let allThemes: [ThemePreset] = [
        .defaultTheme,
        .darkTheme,
        .blueTheme,
        .greenTheme,
        .purpleTheme
    ]
}