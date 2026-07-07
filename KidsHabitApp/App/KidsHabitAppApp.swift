import SwiftUI

@main
struct KidsHabitAppApp: App {
    @StateObject private var purchaseManager = PurchaseManager.shared
    @StateObject private var audioManager = AudioManager.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(purchaseManager)
                .environmentObject(audioManager)
                .statusBarHidden(true)
                .persistentSystemOverlays(.hidden)
                .task {
                    await purchaseManager.checkEntitlements()
                    purchaseManager.startTransactionListener()
                }
        }
    }
}
