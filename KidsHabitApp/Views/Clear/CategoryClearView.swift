import SwiftUI

/// カテゴリ完了演出：全画面キラキラ＋ファンファーレ＋ボタン
struct CategoryClearView: View {
    let category: CategoryType
    let onReplay: () -> Void
    let onHome: () -> Void

    @State private var showText = false
    @State private var rainbow = false

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [AppColor.mainYellow.opacity(0.4), AppColor.mainPink.opacity(0.3), AppColor.mainBlue.opacity(0.3)],
                startPoint: rainbow ? .topLeading : .bottomTrailing,
                endPoint: rainbow ? .bottomTrailing : .topLeading
            )
            .ignoresSafeArea()
            .animation(.easeInOut(duration: 2).repeatForever(autoreverses: true), value: rainbow)

            // 全画面キラキラ
            ForEach(0..<20, id: \.self) { i in
                Image(systemName: i % 2 == 0 ? "star.fill" : "sparkle")
                    .font(.system(size: CGFloat.random(in: 16...40)))
                    .foregroundStyle([AppColor.mainYellow, AppColor.mainPink, AppColor.mainBlue].randomElement()!)
                    .position(
                        x: CGFloat.random(in: 40...800),
                        y: CGFloat.random(in: 40...360)
                    )
                    .opacity(showText ? 1 : 0)
                    .animation(.easeIn(duration: 0.4).delay(Double(i) * 0.06), value: showText)
            }

            VStack(spacing: 28) {
                Image(systemName: "face.smiling.inverse")
                    .font(.system(size: 90))
                    .foregroundStyle(AppColor.mainPink)
                    .rotationEffect(.degrees(rainbow ? 8 : -8))
                    .animation(.easeInOut(duration: 0.4).repeatForever(autoreverses: true), value: rainbow)

                Text(category.completeText)
                    .font(.system(size: 44, weight: .heavy, design: .rounded))
                    .foregroundStyle(AppColor.accent)
                    .multilineTextAlignment(.center)
                    .scaleEffect(showText ? 1 : 0.3)
                    .animation(.spring(response: 0.5, dampingFraction: 0.55), value: showText)

                HStack(spacing: 20) {
                    ClearActionButton(titleKey: "common.again", symbol: "arrow.clockwise", color: AppColor.mainGreen, action: onReplay)
                    ClearActionButton(titleKey: "common.home", symbol: "house.fill", color: AppColor.mainBlue, action: onHome)
                }
            }
            .padding()
        }
        .onAppear {
            showText = true
            rainbow = true
            AudioManager.shared.playSE(.fanfare)
            AudioManager.shared.speak(category.completeText)
        }
    }
}

struct ClearActionButton: View {
    let titleKey: LocalizedStringKey
    let symbol: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button {
            AudioManager.shared.playSE(.tap)
            action()
        } label: {
            HStack(spacing: 8) {
                Image(systemName: symbol)
                Text(titleKey)
            }
            .font(.system(size: 26, weight: .heavy, design: .rounded))
            .foregroundStyle(.white)
            .padding(.horizontal, 32)
            .padding(.vertical, 18)
            .background(Capsule().fill(color).shadow(radius: 4))
        }
    }
}
