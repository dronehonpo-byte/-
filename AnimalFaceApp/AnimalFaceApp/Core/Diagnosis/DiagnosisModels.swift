import Foundation

/// 診断の出力形式。新形式を足す場合はここに case を追加し、Result 画面に表示を足す。
enum DiagnosisKind: String, Codable, Hashable {
    /// 動物タイプ判定＋マッチ率%
    case animalMatch
    /// パーセンテージ＋文
    case percentage
    /// 2極スペクトラム（例: 醤油顔⇄ソース顔）＋文
    case spectrum
}

/// 診断項目の定義（diagnosis_content.json から読込・データ駆動）。
/// 項目追加は JSON への追記のみで完結する。
struct DiagnosisItem: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    let subtitle: String
    let icon: String
    let isPremium: Bool
    let kind: DiagnosisKind
    let scoring: ScoringSpec?
    let bands: [ResultBand]?
    let spectrum: SpectrumLabels?
    let animalTexts: [String: String]?
}

/// パーセンテージ系診断のスコアリング仕様（重み付き線形和）。
/// percent = clamp(round((bias + Σ weights[f] * features[f]) * 100), percentMin...percentMax)
struct ScoringSpec: Codable, Hashable {
    let bias: Double
    let weights: [String: Double]
    let percentMin: Int
    let percentMax: Int
}

/// %の帯域ごとの結果文。minPercent 以上で最初にマッチした帯域の文を使う
struct ResultBand: Codable, Hashable {
    let minPercent: Int
    let text: String
}

struct SpectrumLabels: Codable, Hashable {
    let lowLabel: String
    let highLabel: String
}

/// diagnosis_content.json 全体
struct DiagnosisContent: Codable {
    let disclaimer: String
    let items: [DiagnosisItem]
}

/// 動物タイプ定義（animal_profiles.json）
struct AnimalProfile: Codable, Identifiable, Hashable {
    let id: String
    let nameJa: String
    let emoji: String
    let imageName: String
    let impressionWords: [String]
    let profile: [String: Double]
}

struct AnimalMatchConfig: Codable, Hashable {
    let percentMin: Int
    let percentMax: Int
}

struct AnimalProfilesConfig: Codable {
    let normalization: [String: [Double]]
    let match: AnimalMatchConfig
    let featureWeights: [String: Double]
    let animals: [AnimalProfile]
}

/// 診断結果。ユーザー画像への参照は絶対に持たない（プライバシー要件）。
struct DiagnosisResult: Identifiable, Hashable {
    let id: UUID
    let item: DiagnosisItem
    let percent: Int
    /// animalMatch のときのみ非nil
    let animal: AnimalProfile?
    let text: String
    let disclaimer: String

    init(item: DiagnosisItem, percent: Int, animal: AnimalProfile?, text: String, disclaimer: String) {
        self.id = UUID()
        self.item = item
        self.percent = percent
        self.animal = animal
        self.text = text
        self.disclaimer = disclaimer
    }
}
