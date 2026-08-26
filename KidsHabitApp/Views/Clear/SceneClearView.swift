import SwiftUI

/// 1場面クリア演出（約1.5秒のオーバーレイ）
struct SceneClearView: View {
    let onFinish: () -> Void
    @State private var scale: CGFloat = 0.3
    @State private var sparkle = false

    var body: some View {
        ZStack {
            Color.black.opacity(0.15).ignoresSafeArea()

            ZStack {
                ForEach(0..<12, id: \.self) { i in
                    Image(systemName: "sparkle")
                        .font(.system(size: CGFloat.random(in: 20...44)))
                        .foregroundStyle(AppColor.mainYellow)
                        .offset(
                            x: sparkle ? cos(CGFloat(i) * .pi / 6) * 160 : 0,
                            y: sparkle ? sin(CGFloat(i) * .pi / 6) * 160 : 0
                        )
                        .opacity(sparkle ? 0 : 1)
                }
                Text("common.sceneClear")
                    .font(.system(size: 48, weight: .heavy, design: .rounded))
                    .foregroundStyle(AppColor.accent)
                    .padding(32)
                    .background(RoundedRectangle(cornerRadius: 32).fill(.white).shadow(radius: 8))
                    .scaleEffect(scale)
            }
        }
        .onAppear {
            AudioManager.shared.playSE(.clear)
            withAnimation(.spring(response: 0.4, dampingFraction: 0.5)) { scale = 1.0 }
            withAnimation(.easeOut(duration: 1.2)) { sparkle = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { onFinish() }
        }
    }
}
