import SwiftUI

// 型名はモジュール名 (AnimalFaceApp) との衝突を避けて Application サフィックスにしている
@main
@MainActor
struct AnimalFaceApplication: App {
    @StateObject private var appState: AppState
    @StateObject private var environment: AppEnvironment
    @StateObject private var entitlements: EntitlementManager
    @StateObject private var ads: AdsCoordinator

    init() {
        let environment = AppEnvironment()
        let entitlements = EntitlementManager()
        let ads = AdsCoordinator(analytics: environment.analytics)
        // 広告表示直前の最終ガード（課金者には絶対に出さない）
        ads.isPremiumProvider = { [weak entitlements] in entitlements?.isPremium ?? false }

        _appState = StateObject(wrappedValue: AppState())
        _environment = StateObject(wrappedValue: environment)
        _entitlements = StateObject(wrappedValue: entitlements)
        _ads = StateObject(wrappedValue: ads)
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(appState)
                .environmentObject(environment)
                .environmentObject(entitlements)
                .environmentObject(ads)
                .tint(AppConfig.Theme.primary)
                .task {
                    ads.start()
                    environment.analytics.track(.appLaunched)
                }
        }
    }
}
