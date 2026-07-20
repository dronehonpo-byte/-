import UIKit

enum DiagnosisError: Error, LocalizedError {
    case contentUnavailable

    var errorDescription: String? {
        "診断データの読み込みに失敗しました。アプリを再起動してお試しください。"
    }
}

/// 画像 → 顔解析 → スコアリング → 診断結果 のオーケストレーション。
/// 渡された画像はこのメソッドのスコープ内でのみ使用し、保存・キャッシュは一切しない。
struct DiagnosisService {
    let provider: FaceAnalysisProvider
    let engine: ScoringEngine
    let content: DiagnosisContent

    func diagnose(item: DiagnosisItem, image: UIImage) async throws -> DiagnosisResult {
        let features = try await provider.analyze(image: image)
        return try result(for: item, features: features)
    }

    /// 特徴量から結果を組み立てる（テスト可能な純粋関数部分）
    func result(for item: DiagnosisItem, features: FaceFeatures) throws -> DiagnosisResult {
        switch item.kind {
        case .animalMatch:
            guard let match = engine.matchAnimal(features: features) else {
                throw DiagnosisError.contentUnavailable
            }
            let text = item.animalTexts?[match.animal.id]
                ?? "あなたは\(match.animal.nameJa)タイプ！\(match.animal.impressionWords.joined(separator: "・"))な印象です。"
            return DiagnosisResult(
                item: item,
                percent: match.percent,
                animal: match.animal,
                text: text,
                disclaimer: content.disclaimer
            )

        case .percentage:
            guard let spec = item.scoring else {
                throw DiagnosisError.contentUnavailable
            }
            let percent = engine.percentage(features: features, spec: spec)
            let text = ScoringEngine.bandText(for: percent, bands: item.bands)
                ?? "あなたらしい魅力があふれる結果になりました！"
            return DiagnosisResult(
                item: item,
                percent: percent,
                animal: nil,
                text: text,
                disclaimer: content.disclaimer
            )

        case .type2:
            guard let spec = item.scoring, let outcomes = item.outcomes else {
                throw DiagnosisError.contentUnavailable
            }
            // スコアで2択に振り分け（段階分けなし）。%は内部保持のみで画面には出さない。
            let percent = engine.percentage(features: features, spec: spec)
            let side = percent >= 50 ? outcomes.high : outcomes.low
            return DiagnosisResult(
                item: item,
                percent: percent,
                animal: nil,
                typeLabel: side.label,
                typeEmoji: side.emoji,
                text: side.text,
                disclaimer: content.disclaimer
            )
        }
    }
}
