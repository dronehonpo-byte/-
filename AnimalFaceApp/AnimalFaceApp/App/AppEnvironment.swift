import Foundation

/// 依存の組み立て（プロトコル注入のルート）。
/// contentStore の読み込みに失敗しても nil のまま起動し、UI 側で案内する（クラッシュ禁止）。
@MainActor
final class AppEnvironment: ObservableObject {
    let analytics: AnalyticsService
    let contentStore: ContentStore?
    let diagnosisService: DiagnosisService?
    let shareService: ShareService

    init() {
        let analytics = ConsoleAnalyticsService()
        self.analytics = analytics

        let store = ContentStore.load()
        self.contentStore = store

        if let store {
            let normalizer = FeatureNormalizer(ranges: store.profiles.normalization)
            // 初期リリース: Vision（端末内）のみ。
            // 将来クラウドAPIを使う場合は primary をクラウド実装に、fallback を Vision にする。
            let provider = CompositeFaceAnalysisProvider(
                primary: VisionFaceAnalysisProvider(normalizer: normalizer),
                fallback: nil
            )
            self.diagnosisService = DiagnosisService(
                provider: provider,
                engine: ScoringEngine(profiles: store.profiles),
                content: store.content
            )
            self.shareService = ShareService(hashtags: store.hashtags)
        } else {
            self.diagnosisService = nil
            self.shareService = ShareService(hashtags: HashtagConfig(main: ["#顔診断"], related: []))
        }
    }
}
