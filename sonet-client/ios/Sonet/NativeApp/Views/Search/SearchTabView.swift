import SwiftUI

struct SearchTabView: View {
    @EnvironmentObject var navigationManager: NavigationManager
    @EnvironmentObject var themeManager: ThemeManager
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // Search Header
                VStack(spacing: 16) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 60))
                        .foregroundColor(.blue)
                    
                    Text("Search")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    Text("Search functionality coming soon")
                        .font(.body)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                }
                
                Spacer()
            }
            .padding(.vertical, 32)
            .navigationBarHidden(true)
        }
        .navigationViewStyle(StackNavigationViewStyle())
    }
}

struct SearchTabView_Previews: PreviewProvider {
    static var previews: some View {
        SearchTabView()
            .environmentObject(NavigationManager())
            .environmentObject(ThemeManager())
    }
}