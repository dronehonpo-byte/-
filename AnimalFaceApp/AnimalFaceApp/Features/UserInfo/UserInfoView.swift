import SwiftUI

/// 画面2: ユーザー情報入力（性別・年齢の任意入力・スキップ可）。
/// 今後のデータ参考用の匿名属性であり、診断結果には影響しない。
struct UserInfoView: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var environment: AppEnvironment

    @State private var gender = ""
    @State private var ageGroup = ""

    static let genders = ["女性", "男性", "その他", "回答しない"]
    static let ageGroups = ["〜12歳", "13〜17歳", "18〜24歳", "25〜29歳", "30代", "40代以上", "回答しない"]

    var body: some View {
        VStack(spacing: 24) {
            VStack(spacing: 8) {
                Text("あなたのことを教えてください")
                    .font(.title3.bold())
                Text("よりよい診断づくりの参考にします（任意・あとで変更できます）")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding(.top, 24)

            Form {
                Section("性別") {
                    Picker("性別", selection: $gender) {
                        Text("未選択").tag("")
                        ForEach(Self.genders, id: \.self) { Text($0).tag($0) }
                    }
                    .pickerStyle(.menu)
                }
                Section("年齢") {
                    Picker("年齢", selection: $ageGroup) {
                        Text("未選択").tag("")
                        ForEach(Self.ageGroups, id: \.self) { Text($0).tag($0) }
                    }
                    .pickerStyle(.menu)
                }
            }
            .scrollContentBackground(.hidden)

            VStack(spacing: 12) {
                Button {
                    appState.userGender = gender
                    appState.userAgeGroup = ageGroup
                    environment.analytics.track(.userInfoSubmitted(
                        gender: gender.isEmpty ? "skip" : gender,
                        ageGroup: ageGroup.isEmpty ? "skip" : ageGroup
                    ))
                    appState.goToMenu()
                } label: {
                    Text("診断へすすむ")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(AppConfig.Theme.primary)
                        .foregroundColor(.white)
                        .cornerRadius(16)
                }

                Button("スキップ") {
                    environment.analytics.track(.userInfoSubmitted(gender: "skip", ageGroup: "skip"))
                    appState.goToMenu()
                }
                .font(.subheadline)
                .foregroundColor(.secondary)
            }
            .padding(.horizontal, 32)
            .padding(.bottom, 24)
        }
        .background(AppConfig.Theme.background.ignoresSafeArea())
        .navigationTitle("ユーザー情報")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            gender = appState.userGender
            ageGroup = appState.userAgeGroup
        }
    }
}
