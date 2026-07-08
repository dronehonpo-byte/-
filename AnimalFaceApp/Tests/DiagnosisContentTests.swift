import XCTest
import UIKit
@testable import AnimalFaceApp

/// バンドル JSON 設定の整合性テスト。
/// JSON を編集した際に構造破壊（デコード不能・項目欠落）を検出する。
final class DiagnosisContentTests: XCTestCase {

    /// テストはアプリをホストとして実行されるため Bundle.main がアプリバンドルになる
    private func loadStore() -> ContentStore? {
        ContentStore.load(bundle: .main)
    }

    func testContentStoreLoadsFromAppBundle() throws {
        let store = try XCTUnwrap(loadStore(), "JSON 設定がデコードできること")
        XCTAssertEqual(store.content.items.count, 6, "初期リリースは6診断")
        XCTAssertEqual(store.freeItems.count, 2, "無料2項目")
        XCTAssertEqual(store.premiumItems.count, 4, "有料4項目")
        XCTAssertEqual(store.profiles.animals.count, 10, "動物10タイプ")
        XCTAssertFalse(store.content.disclaimer.isEmpty, "エンタメ注意書きが定義されていること")
    }

    func testAllPercentageItemsHaveScoringAndBands() throws {
        let store = try XCTUnwrap(loadStore())
        for item in store.content.items where item.kind != .animalMatch {
            XCTAssertNotNil(item.scoring, "\(item.id) に scoring が必要")
            XCTAssertNotNil(item.bands, "\(item.id) に結果文帯域が必要")
            XCTAssertNotNil(item.bands?.first { $0.minPercent == 0 },
                            "\(item.id) は 0% からの帯域を必ず持つこと")
        }
    }

    func testAnimalItemHasTextForEveryAnimal() throws {
        let store = try XCTUnwrap(loadStore())
        let animalItem = try XCTUnwrap(store.item(id: "animal"))
        for animal in store.profiles.animals {
            XCTAssertNotNil(animalItem.animalTexts?[animal.id],
                            "動物 \(animal.id) の診断文が必要")
        }
    }

    func testAnimalProfilesCoverAllFeatureKeys() throws {
        let store = try XCTUnwrap(loadStore())
        for animal in store.profiles.animals {
            for key in FaceFeatures.featureKeys {
                XCTAssertNotNil(animal.profile[key], "\(animal.id) の \(key) が未定義")
            }
        }
    }

    func testDiagnosisServiceProducesResultWithDisclaimer() throws {
        let store = try XCTUnwrap(loadStore())
        let service = DiagnosisService(
            provider: StubProvider(),
            engine: ScoringEngine(profiles: store.profiles),
            content: store.content
        )
        let features = FaceFeatures(
            faceAspectRatio: 0.3, eyeSize: 0.7, eyeSlant: 0.4, faceWidth: 0.6,
            jawSharpness: 0.3, cheekFullness: 0.8, mouthSize: 0.5, featureProminence: 0.6
        )
        for item in store.content.items {
            let result = try service.result(for: item, features: features)
            XCTAssertFalse(result.disclaimer.isEmpty, "\(item.id) の結果に注意書きが必要")
            XCTAssertFalse(result.text.isEmpty)
            XCTAssertTrue((0...100).contains(result.percent))
        }
    }

    private struct StubProvider: FaceAnalysisProvider {
        func analyze(image: UIImage) async throws -> FaceFeatures {
            FaceFeatures(
                faceAspectRatio: 0.5, eyeSize: 0.5, eyeSlant: 0.5, faceWidth: 0.5,
                jawSharpness: 0.5, cheekFullness: 0.5, mouthSize: 0.5, featureProminence: 0.5
            )
        }
    }
}
