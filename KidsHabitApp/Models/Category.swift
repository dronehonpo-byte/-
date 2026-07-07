import SwiftUI

/// ゲーム操作タイプ
enum GameType {
    case swipeWipe      // なぞって汚れを落とす（歯磨き・手洗い）
    case dragDrop       // ドラッグ＆ドロップ（片付け・着替え・準備）
    case feedCharacter  // 食材を口元へ運ぶ（食事）
    case gargle         // うがい（往復なぞる）
}

/// カテゴリ定義
enum CategoryType: String, CaseIterable, Identifiable, Hashable {
    case toothBrushing = "はみがき"
    case cleanup = "かたづけ"
    case meal = "しょくじ"
    case dressing = "きがえ"
    case handwashing = "てあらい"   // フェーズ2
    case preparation = "じゅんび"   // フェーズ2
    case bath = "おふろ"            // フェーズ3
    case cooking = "りょうり"       // フェーズ3

    var id: String { rawValue }

    var isPremium: Bool {
        switch self {
        case .toothBrushing, .cleanup: return false
        default: return true
        }
    }

    var phase: Int {
        switch self {
        case .toothBrushing, .cleanup, .meal, .dressing: return 1
        case .handwashing, .preparation: return 2
        case .bath, .cooking: return 3
        }
    }

    /// フェーズ1で遊べるカテゴリのみ true
    var isPlayable: Bool { phase == 1 }

    /// サムネイル用SF Symbol（イラスト差し替え前のプレースホルダー）
    var symbolName: String {
        switch self {
        case .toothBrushing: return "mouth"
        case .cleanup: return "shippingbox"
        case .meal: return "fork.knife"
        case .dressing: return "tshirt"
        case .handwashing: return "hands.sparkles"
        case .preparation: return "backpack"
        case .bath: return "bathtub"
        case .cooking: return "frying.pan"
        }
    }

    var themeColor: Color {
        switch self {
        case .toothBrushing: return AppColor.mainBlue
        case .cleanup: return AppColor.mainGreen
        case .meal: return AppColor.accent
        case .dressing: return AppColor.mainPink
        case .handwashing: return .cyan
        case .preparation: return .orange
        case .bath: return .teal
        case .cooking: return .brown
        }
    }

    /// カテゴリ完了時のセリフ
    var completeText: String {
        switch self {
        case .toothBrushing: return String(localized: "tooth.complete")
        case .cleanup: return String(localized: "cleanup.complete")
        case .meal: return String(localized: "meal.complete.all")
        case .dressing: return String(localized: "dressing.complete")
        default: return String(localized: "common.complete")
        }
    }

    var scenes: [SceneData] {
        switch self {
        case .toothBrushing:
            return [
                SceneData(title: "したのはの かみあわせ", imageName: "tooth_1", gameType: .swipeWipe),
                SceneData(title: "したのはの おもて", imageName: "tooth_2", gameType: .swipeWipe),
                SceneData(title: "うえのはの かみあわせ", imageName: "tooth_3", gameType: .swipeWipe),
                SceneData(title: "うえのはの おもて", imageName: "tooth_4", gameType: .swipeWipe),
                SceneData(title: "うがい", imageName: "tooth_gargle", gameType: .gargle),
            ]
        case .cleanup:
            return [
                SceneData(title: "りびんぐ", imageName: "cleanup_1", gameType: .dragDrop),
                SceneData(title: "べっどまわり", imageName: "cleanup_2", gameType: .dragDrop),
                SceneData(title: "つくえのうえ", imageName: "cleanup_3", gameType: .dragDrop),
                SceneData(title: "げんかん", imageName: "cleanup_4", gameType: .dragDrop),
            ]
        case .meal:
            return [
                SceneData(title: "せっと1", imageName: "meal_1", gameType: .feedCharacter),
                SceneData(title: "せっと2", imageName: "meal_2", gameType: .feedCharacter),
                SceneData(title: "せっと3", imageName: "meal_3", gameType: .feedCharacter),
                SceneData(title: "せっと4", imageName: "meal_4", gameType: .feedCharacter),
            ]
        case .dressing:
            return [
                SceneData(title: "ふだんぎ", imageName: "dressing_1", gameType: .dragDrop),
                SceneData(title: "すーつふう", imageName: "dressing_2", gameType: .dragDrop),
                SceneData(title: "あめのひ", imageName: "dressing_3", gameType: .dragDrop),
                SceneData(title: "なつふく", imageName: "dressing_4", gameType: .dragDrop),
            ]
        default:
            return []
        }
    }
}
