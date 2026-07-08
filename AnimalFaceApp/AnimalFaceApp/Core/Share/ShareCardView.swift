import SwiftUI

/// SNSシェア用の結果カード（ImageRenderer で画像化される）。
/// ユーザーの顔写真は含めない（プライバシー要件：画像は診断後に破棄済み）。
/// 要素: 診断名・%・説明文・動物イラスト・アプリ名（QRコードは素材確定後に追加可能）。
struct ShareCardView: View {
    let result: DiagnosisResult

    var body: some View {
        VStack(spacing: 18) {
            // アプリ名ヘッダ
            HStack(spacing: 6) {
                Text("🐾")
                Text(AppConfig.appName)
                    .font(.headline.bold())
            }
            .foregroundColor(.white.opacity(0.95))

            Text(result.item.title)
                .font(.title3.bold())
                .foregroundColor(.white)

            // TODO(Miyabee): 動物PNG素材提供後、emoji → Image(animal.imageName) に差し替え
            Text(result.animal?.emoji ?? result.item.icon)
                .font(.system(size: 90))

            if let animal = result.animal {
                Text(animal.nameJa)
                    .font(.largeTitle.bold())
                    .foregroundColor(.white)
            }

            if result.item.kind == .spectrum, let spectrum = result.item.spectrum {
                Text("\(spectrum.highLabel)度 \(result.percent)%")
                    .font(.system(size: 40, weight: .heavy, design: .rounded))
                    .foregroundColor(.white)
            } else {
                Text("\(result.percent)%")
                    .font(.system(size: 56, weight: .heavy, design: .rounded))
                    .foregroundColor(.white)
            }

            Text(result.text)
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .foregroundColor(.white.opacity(0.95))
                .padding(.horizontal, 24)

            Text(result.disclaimer)
                .font(.system(size: 9))
                .foregroundColor(.white.opacity(0.7))
        }
        .padding(.vertical, 32)
        .frame(width: 360, height: 480)
        .background(
            LinearGradient(
                colors: [AppConfig.Theme.primary, AppConfig.Theme.secondary],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(0)
    }
}
