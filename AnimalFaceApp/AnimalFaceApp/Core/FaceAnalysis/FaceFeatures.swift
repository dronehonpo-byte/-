import Foundation

/// 顔から抽出した正規化済み特徴量ベクトル（各値 0.0〜1.0）。
/// 診断エンジンはこの構造体のみに依存し、抽出元（Vision / 将来のクラウドAPI）を問わない。
struct FaceFeatures: Codable, Equatable, Hashable {
    /// 面長(1.0) ⇄ 丸顔(0.0)
    var faceAspectRatio: Double
    /// 目の大きさ
    var eyeSize: Double
    /// 目尻の上がり(1.0)/下がり(0.0)
    var eyeSlant: Double
    /// 顔の横張り（小顔 0.0 ⇄ 幅広 1.0）
    var faceWidth: Double
    /// 輪郭のシャープさ/骨格
    var jawSharpness: Double
    /// 頬のふっくら度
    var cheekFullness: Double
    /// 口の大きさ
    var mouthSize: Double
    /// パーツの存在感
    var featureProminence: Double

    static let featureKeys: [String] = [
        "faceAspectRatio", "eyeSize", "eyeSlant", "faceWidth",
        "jawSharpness", "cheekFullness", "mouthSize", "featureProminence",
    ]

    /// JSON設定（重み・プロファイル）のキー名で値を引く
    func value(for key: String) -> Double? {
        switch key {
        case "faceAspectRatio": return faceAspectRatio
        case "eyeSize": return eyeSize
        case "eyeSlant": return eyeSlant
        case "faceWidth": return faceWidth
        case "jawSharpness": return jawSharpness
        case "cheekFullness": return cheekFullness
        case "mouthSize": return mouthSize
        case "featureProminence": return featureProminence
        default: return nil
        }
    }
}

/// Vision 等から取り出した生の計測値（正規化前）
struct RawFaceMetrics {
    var faceAspectRatio: Double = 0
    var eyeSize: Double = 0
    var eyeSlant: Double = 0
    var faceWidth: Double = 0
    var jawSharpness: Double = 0
    var cheekFullness: Double = 0
    var mouthSize: Double = 0
    var featureProminence: Double = 0
}

/// 生計測値 → 0..1 特徴量への線形正規化。
/// レンジは animal_profiles.json の "normalization" から供給（コード改変なしで調整可能）。
struct FeatureNormalizer {
    let ranges: [String: [Double]]

    private func normalize(_ value: Double, key: String) -> Double {
        guard let range = ranges[key], range.count == 2, range[1] > range[0] else {
            return min(max(value, 0), 1)
        }
        let t = (value - range[0]) / (range[1] - range[0])
        return min(max(t, 0), 1)
    }

    func normalize(_ raw: RawFaceMetrics) -> FaceFeatures {
        FaceFeatures(
            faceAspectRatio: normalize(raw.faceAspectRatio, key: "faceAspectRatio"),
            eyeSize: normalize(raw.eyeSize, key: "eyeSize"),
            eyeSlant: normalize(raw.eyeSlant, key: "eyeSlant"),
            faceWidth: normalize(raw.faceWidth, key: "faceWidth"),
            jawSharpness: normalize(raw.jawSharpness, key: "jawSharpness"),
            cheekFullness: normalize(raw.cheekFullness, key: "cheekFullness"),
            mouthSize: normalize(raw.mouthSize, key: "mouthSize"),
            featureProminence: normalize(raw.featureProminence, key: "featureProminence")
        )
    }
}
