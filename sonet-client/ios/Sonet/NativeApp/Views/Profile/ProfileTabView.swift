import SwiftUI

struct ProfileTabView: View {
    @EnvironmentObject var navigationManager: NavigationManager
    @EnvironmentObject var themeManager: ThemeManager
    @EnvironmentObject var sessionManager: SessionManager
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // Profile Header
                VStack(spacing: 16) {
                    if let user = sessionManager.currentUser {
                        // User Avatar
                        AsyncImage(url: user.avatarURL) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            Image(systemName: "person.circle.fill")
                                .foregroundColor(.gray)
                        }
                        .frame(width: 100, height: 100)
                        .clipShape(Circle())
                        
                        // User Info
                        VStack(spacing: 8) {
                            HStack {
                                Text(user.displayName)
                                    .font(.title)
                                    .fontWeight(.bold)
                                
                                if user.isVerified {
                                    Image(systemName: "checkmark.seal.fill")
                                        .foregroundColor(.blue)
                                        .font(.title2)
                                }
                            }
                            
                            Text(user.handle)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        // Sign Out Button
                        Button("Sign Out") {
                            Task {
                                await sessionManager.signOut()
                            }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.red)
                    } else {
                        // No User State
                        Image(systemName: "person.circle")
                            .font(.system(size: 60))
                            .foregroundColor(.gray)
                        
                        Text("Profile")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                        
                        Text("User profile coming soon")
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 32)
                    }
                }
                
                Spacer()
            }
            .padding(.vertical, 32)
            .navigationBarHidden(true)
        }
        .navigationViewStyle(StackNavigationViewStyle())
    }
}

struct ProfileTabView_Previews: PreviewProvider {
    static var previews: some View {
        ProfileTabView()
            .environmentObject(NavigationManager())
            .environmentObject(ThemeManager())
            .environmentObject(SessionManager())
    }
}