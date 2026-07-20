import Foundation

/// 特徴量 → 診断スコアの決定論的計算。
/// 乱数を一切使わない：同一の FaceFeatures は常に同一の結果を返す。
/// プロファイル・重み・%レンジはすべて JSON 設定から供給される。
struct ScoringEngine {
    let profiles: AnimalProfilesConfig

    // MARK: - 動物マッチ

    /// 入力特徴量と各動物のターゲットプロファイルの重み付き類似度を計算し、
    /// 最も近いタイプと マッチ率% を返す。
    func matchAnimal(features: FaceFeatures) -> (animal: AnimalProfile, percent: Int)? {
        var best: (animal: AnimalProfile, similarity: Double)?
        for animal in profiles.animals {
            let sim = similarity(features: features, profile: animal.profile)
            // 同点時は JSON 定義順の先勝ち（決定論を保証）
            if let current = best, sim <= current.similarity { continue }
            best = (animal, sim)
        }
        guard let best else { return nil }
        let range = profiles.match
        let percent = Int((Double(range.percentMin)
            + best.similarity * Double(range.percentMax - range.percentMin)).rounded())
        return (best.animal, clamp(percent, min: range.percentMin, max: range.percentMax))
    }

    /// 重み付きユークリッド距離ベースの類似度（0..1）
    func similarity(features: FaceFeatures, profile: [String: Double]) -> Double {
        var weightedSquares: Double = 0
        var totalWeight: Double = 0
        for key in FaceFeatures.featureKeys {
            guard let target = profile[key], let value = features.value(for: key) else { continue }
            let weight = profiles.featureWeights[key] ?? 1.0
            let diff = value - target
            weightedSquares += weight * diff * diff
            totalWeight += weight
        }
        guard totalWeight > 0 else { return 0 }
        let distance = (weightedSquares / totalWeight).squareRoot() // 0..1
        return 1 - min(max(distance, 0), 1)
    }

    // MARK: - パーセンテージ / スペクトラム

    /// 重み付き線形和 → % に変換（percentage の帯域判定・type2 の振り分け共通）
    func percentage(features: FaceFeatures, spec: ScoringSpec) -> Int {
        var score = spec.bias
        for (key, weight) in spec.weights {
            // 現状 Vision では一部特徴（眉/鼻の立体/三庭など）が未計測。
            // その場合は中立の 0.5 として扱い、%の中央値がぶれないようにする
            // （JSON の重みは全特徴が揃う前提で調整＝Web/将来のARKit経路と共通）。
            let value = features.value(for: key) ?? 0.5
            score += weight * value
        }
        let percent = Int((score * 100).rounded())
        return clamp(percent, min: spec.percentMin, max: spec.percentMax)
    }

    /// %に対応する帯域文を返す（minPercent 降順で最初にマッチした帯域）
    static func bandText(for percent: Int, bands: [ResultBand]?) -> String? {
        guard let bands else { return nil }
        return bands
            .sorted { $0.minPercent > $1.minPercent }
            .first { percent >= $0.minPercent }?
            .text
    }

    private func clamp(_ value: Int, min minValue: Int, max maxValue: Int) -> Int {
        min(max(value, minValue), maxValue)
    }
}
