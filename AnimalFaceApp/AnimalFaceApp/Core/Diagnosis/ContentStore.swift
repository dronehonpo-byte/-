import Foundation

/// バンドル内 JSON 設定（診断項目・動物プロファイル・ハッシュタグ）のロード。
/// ロード失敗時も nil を返してクラッシュさせない（UI 側でフレンドリーに案内する）。
struct ContentStore {
    let content: DiagnosisContent
    let profiles: AnimalProfilesConfig
    let hashtags: HashtagConfig

    var freeItems: [DiagnosisItem] { content.items.filter { !$0.isPremium } }
    var premiumItems: [DiagnosisItem] { content.items.filter(\.isPremium) }

    func item(id: String) -> DiagnosisItem? {
        content.items.first { $0.id == id }
    }

    static func load(bundle: Bundle = .main) -> ContentStore? {
        guard
            let content: DiagnosisContent = decode("diagnosis_content", bundle: bundle),
            let profiles: AnimalProfilesConfig = decode("animal_profiles", bundle: bundle)
        else {
            assertionFailure("バンドル内の診断設定 JSON の読み込みに失敗")
            return nil
        }
        let hashtags: HashtagConfig = decode("hashtags", bundle: bundle)
            ?? HashtagConfig(main: ["#顔診断"], related: [])
        return ContentStore(content: content, profiles: profiles, hashtags: hashtags)
    }

    private static func decode<T: Decodable>(_ name: String, bundle: Bundle) -> T? {
        guard let url = bundle.url(forResource: name, withExtension: "json"),
              let data = try? Data(contentsOf: url)
        else { return nil }
        return try? JSONDecoder().decode(T.self, from: data)
    }
}

struct HashtagConfig: Codable {
    let main: [String]
    let related: [String]

    /// シェア用ハッシュタグ列を組み立てる（{animalName} を置換。拡散系メインを先頭に）
    func shareTags(animalName: String?) -> [String] {
        let resolvedRelated = related.compactMap { tag -> String? in
            if tag.contains("{animalName}") {
                guard let animalName else { return nil }
                return tag.replacingOccurrences(of: "{animalName}", with: animalName)
            }
            return tag
        }
        return main + resolvedRelated
    }
}
