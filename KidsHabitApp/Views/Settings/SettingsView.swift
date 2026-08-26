import SwiftUI

/// 設定画面：BGM / SE の ON・OFF
struct SettingsView: View {
    @EnvironmentObject private var audioManager: AudioManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 28) {
            Text("settings.title")
                .font(.system(size: 30, weight: .heavy, design: .rounded))

            Toggle(isOn: $audioManager.isBGMEnabled) {
                Label("settings.bgm", systemImage: "music.note")
                    .font(.system(size: 22, weight: .bold, design: .rounded))
            }
            .tint(AppColor.mainGreen)

            Toggle(isOn: $audioManager.isSEEnabled) {
                Label("settings.se", systemImage: "speaker.wave.2.fill")
                    .font(.system(size: 22, weight: .bold, design: .rounded))
            }
            .tint(AppColor.mainGreen)

            Button("common.close") { dismiss() }
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .padding(.horizontal, 40)
                .padding(.vertical, 14)
                .background(Capsule().fill(AppColor.mainBlue))
        }
        .padding(40)
    }
}
