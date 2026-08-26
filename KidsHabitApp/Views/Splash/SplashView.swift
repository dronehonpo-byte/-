import SwiftUI

/// スプラッシュ画面：ロゴ＋キャラクターアニメーション（2.5秒後に自動遷移）
struct SplashView: View {
    let onFinish: () -> Void
    @State private var bounce = false
    @State private var appear = false

    var body: some View {
        ZStack {
            AppColor.mainYellow.opacity(0.3).ignoresSafeArea()

            VStack(spacing: 24) {
                // キャラクター（プレースホルダー：SF Symbol）
                Image(systemName: "face.smiling.inverse")
                    .font(.system(size: 100))
                    .foregroundStyle(AppColor.mainPink)
                    .offset(y: bounce ? -20 : 0)
                    .animation(.easeInOut(duration: 0.5).repeatForever(autoreverses: true), value: bounce)

                Text("きっずしゅうかん")
                    .font(.system(size: 44, weight: .heavy, design: .rounded))
                    .foregroundStyle(AppColor.mainBlue)
                    .scaleEffect(appear ? 1.0 : 0.5)
                    .opacity(appear ? 1 : 0)
                    .animation(.spring(response: 0.6, dampingFraction: 0.6), value: appear)
            }
        }
        .onAppear {
            bounce = true
            appear = true
            AudioManager.shared.playBGM()
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) { onFinish() }
        }
    }
}
