import Foundation

/// 1場面のデータ
struct SceneData: Identifiable, Hashable {
    let id = UUID()
    let title: String           // ひらがな
    let imageName: String       // Assets内の画像名（プレースホルダー）
    let gameType: GameType

    static func == (lhs: SceneData, rhs: SceneData) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}
