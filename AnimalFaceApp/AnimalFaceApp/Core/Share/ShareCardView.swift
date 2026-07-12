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

            Text(result.item.displayTitle)
                .font(.title3.bold())
                .foregroundColor(.white)

            // TODO(Miyabee): 素材提供後、emoji → Image(...) に差し替え
            Text(result.animal?.emoji ?? result.typeEmoji ?? result.item.icon)
                .font(.system(size: 90))

            if let animal = result.animal {
                Text(animal.nameJa)
                    .font(.largeTitle.bold())
                    .foregroundColor(.white)
            } else if let typeLabel = result.typeLabel {
                Text(typeLabel)
                    .font(.largeTitle.bold())
                    .foregroundColor(.white)
            }

            // type2 は%を出さず、タイプ名（上）で表現。それ以外は%を大きく表示。
            if result.item.kind != .type2 {
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
