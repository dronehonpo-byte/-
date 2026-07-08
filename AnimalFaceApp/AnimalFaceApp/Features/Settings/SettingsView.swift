import SwiftUI

/// 画面9: 設定。プラン確認・復元購入・ユーザー情報・お問い合わせ・規約リンク。
struct SettingsView: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var environment: AppEnvironment
    @EnvironmentObject private var entitlements: EntitlementManager

    @State private var isRestoring = false
    @State private var restoreMessage: String?

    var body: some View {
        Form {
            Section("プラン") {
                HStack {
                    Text("現在のプラン")
                    Spacer()
                    Text(entitlements.isPremium ? "プレミアム✨" : "無料プラン")
                        .foregroundColor(.secondary)
                }
                if !entitlements.isPremium {
                    Button("プレミアムプランを見る") {
                        environment.analytics.track(.paywallShown(source: "settings"))
                        appState.path.append(.paywall(.settings))
                    }
                }
                Button {
                    Task { await restore() }
                } label: {
                    HStack {
                        Text("購入を復元する")
                        if isRestoring {
                            Spacer()
                            ProgressView()
                        }
                    }
                }
                .disabled(isRestoring)
            }

            Section("ユーザー情報（任意）") {
                Picker("性別", selection: $appState.userGender) {
                    Text("未選択").tag("")
                    ForEach(UserInfoView.genders, id: \.self) { Text($0).tag($0) }
                }
                Picker("年齢", selection: $appState.userAgeGroup) {
                    Text("未選択").tag("")
                    ForEach(UserInfoView.ageGroups, id: \.self) { Text($0).tag($0) }
                }
            }

            Section("サポート") {
                Link("お問い合わせ", destination: AppConfig.contactURL)
                Button("利用規約") {
                    appState.path.append(.legal(.terms))
                }
                Button("プライバシーポリシー") {
                    appState.path.append(.legal(.privacy))
                }
            }

            Section {
                HStack {
                    Text("バージョン")
                    Spacer()
                    Text(appVersion)
                        .foregroundColor(.secondary)
                }
            } footer: {
                Text("撮影・選択された写真は端末内でのみ解析され、診断後すぐに破棄されます。保存や外部送信は行いません。")
            }
        }
        .navigationTitle("設定")
        .navigationBarTitleDisplayMode(.inline)
        .alert("復元購入", isPresented: .init(
            get: { restoreMessage != nil },
            set: { if !$0 { restoreMessage = nil } }
        )) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(restoreMessage ?? "")
        }
    }

    private var appVersion: String {
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String
        return version ?? "-"
    }

    private func restore() async {
        isRestoring = true
        defer { isRestoring = false }
        environment.analytics.track(.restoreTapped)
        do {
            try await entitlements.restorePurchases()
            restoreMessage = entitlements.isPremium
                ? "購入を復元しました🎉"
                : AppConfig.ErrorText.restoreNothing
        } catch {
            restoreMessage = AppConfig.ErrorText.purchaseFailed
        }
    }
}
