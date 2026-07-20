import Foundation

/// 診断の出力形式。新形式を足す場合はここに case を追加し、Result 画面に表示を足す。
enum DiagnosisKind: String, Codable, Hashable {
    /// 動物タイプ判定＋マッチ率%
    case animalMatch
    /// パーセンテージ＋文（結果は5段階の帯域で表示: 0-20/20-40/40-60/60-80/80-100）
    case percentage
    /// 2択タイプ判定（例: 醤油顔／ソース顔）。段階分けなし・スコアで振り分け、%は表示しない
    case type2
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
    /// percentage 用: 5段階の帯域文（type2 では nil）
    let bands: [ResultBand]?
    /// type2 用: 2択の結果（percentage では nil）
    let outcomes: TypeTwoOutcomes?
    let animalTexts: [String: String]?

    /// 画面・シェアに出す表示名。審査対策の差し替え（AppConfig.displayTitleOverrides）を反映。
    /// 内部 id は不変なので、名称だけ変えてもスコアリング・診断文には影響しない。
    var displayTitle: String { AppConfig.displayTitleOverrides[id] ?? title }
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

/// type2（2択タイプ）の結果定義。スコア >= 50 で high、未満で low を採用。
struct TypeTwoOutcome: Codable, Hashable {
    let label: String
    let emoji: String
    let text: String
}

struct TypeTwoOutcomes: Codable, Hashable {
    let high: TypeTwoOutcome
    let low: TypeTwoOutcome
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
    /// type2 のときのみ非nil（選ばれたタイプの表示名・絵文字）。%の代わりに表示する
    let typeLabel: String?
    let typeEmoji: String?
    let text: String
    let disclaimer: String

    init(item: DiagnosisItem, percent: Int, animal: AnimalProfile?,
         typeLabel: String? = nil, typeEmoji: String? = nil,
         text: String, disclaimer: String) {
        self.id = UUID()
        self.item = item
        self.percent = percent
        self.animal = animal
        self.typeLabel = typeLabel
        self.typeEmoji = typeEmoji
        self.text = text
        self.disclaimer = disclaimer
    }
}
