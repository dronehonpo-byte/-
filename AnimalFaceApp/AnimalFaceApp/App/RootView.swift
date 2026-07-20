import SwiftUI

struct RootView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        NavigationStack(path: $appState.path) {
            SplashView()
                .navigationDestination(for: Route.self) { route in
                    destination(for: route)
                }
        }
        .fullScreenCover(isPresented: $appState.showOnboarding) {
            OnboardingView()
        }
    }

    @ViewBuilder
    private func destination(for route: Route) -> some View {
        switch route {
        case .userInfo:
            UserInfoView()
        case .menu:
            DiagnosisMenuView()
        case .capture(let item):
            CaptureView(item: item)
        case .loading(let item):
            LoadingView(item: item)
        case .adGate:
            AdGateView()
        case .result:
            ResultView()
        case .paywall(let source):
            PaywallView(source: source)
        case .settings:
            SettingsView()
        case .legal(let kind):
            LegalView(kind: kind)
        }
    }
}
