import XCTest
@testable import AnimalFaceApp

/// スコアリングエンジンの決定論・妥当性テスト（受け入れ観点:
/// 「%が写真により変化」「同一写真で同一結果」「乱数不使用」）。
final class ScoringEngineTests: XCTestCase {

    // MARK: - テスト用フィクスチャ

    private func makeConfig() -> AnimalProfilesConfig {
        AnimalProfilesConfig(
            normalization: [
                "faceAspectRatio": [1.0, 1.5],
                "eyeSize": [0.0, 0.04],
            ],
            match: AnimalMatchConfig(percentMin: 62, percentMax: 98),
            featureWeights: [:],
            animals: [
                AnimalProfile(
                    id: "round", nameJa: "丸顔動物", emoji: "🐹", imageName: "a",
                    impressionWords: ["丸い"],
                    profile: [
                        "faceAspectRatio": 0.1, "eyeSize": 0.8, "eyeSlant": 0.4,
                        "faceWidth": 0.7, "jawSharpness": 0.2, "cheekFullness": 0.9,
                        "mouthSize": 0.5, "featureProminence": 0.6,
                    ]
                ),
                AnimalProfile(
                    id: "sharp", nameJa: "シャープ動物", emoji: "🦊", imageName: "b",
                    impressionWords: ["鋭い"],
                    profile: [
                        "faceAspectRatio": 0.9, "eyeSize": 0.4, "eyeSlant": 0.8,
                        "faceWidth": 0.3, "jawSharpness": 0.9, "cheekFullness": 0.2,
                        "mouthSize": 0.4, "featureProminence": 0.5,
                    ]
                ),
            ]
        )
    }

    private func roundFeatures() -> FaceFeatures {
        FaceFeatures(
            faceAspectRatio: 0.15, eyeSize: 0.8, eyeSlant: 0.4, faceWidth: 0.7,
            jawSharpness: 0.2, cheekFullness: 0.85, mouthSize: 0.5, featureProminence: 0.6
        )
    }

    private func sharpFeatures() -> FaceFeatures {
        FaceFeatures(
            faceAspectRatio: 0.9, eyeSize: 0.35, eyeSlant: 0.85, faceWidth: 0.3,
            jawSharpness: 0.9, cheekFullness: 0.2, mouthSize: 0.4, featureProminence: 0.5
        )
    }

    // MARK: - 動物マッチ

    func testAnimalMatchIsDeterministic() {
        let engine = ScoringEngine(profiles: makeConfig())
        let first = engine.matchAnimal(features: roundFeatures())
        let second = engine.matchAnimal(features: roundFeatures())
        XCTAssertEqual(first?.animal.id, second?.animal.id)
        XCTAssertEqual(first?.percent, second?.percent)
    }

    func testAnimalMatchPicksNearestProfile() {
        let engine = ScoringEngine(profiles: makeConfig())
        XCTAssertEqual(engine.matchAnimal(features: roundFeatures())?.animal.id, "round")
        XCTAssertEqual(engine.matchAnimal(features: sharpFeatures())?.animal.id, "sharp")
    }

    func testAnimalMatchPercentIsWithinConfiguredRange() throws {
        let engine = ScoringEngine(profiles: makeConfig())
        let match = try XCTUnwrap(engine.matchAnimal(features: roundFeatures()))
        XCTAssertGreaterThanOrEqual(match.percent, 62)
        XCTAssertLessThanOrEqual(match.percent, 98)
    }

    func testAnimalMatchPercentVariesWithFeatures() throws {
        let engine = ScoringEngine(profiles: makeConfig())
        let near = try XCTUnwrap(engine.matchAnimal(features: roundFeatures()))
        var far = roundFeatures()
        far.eyeSize = 0.2
        far.cheekFullness = 0.3
        let farther = try XCTUnwrap(engine.matchAnimal(features: far))
        XCTAssertNotEqual(near.percent, farther.percent, "特徴が変われば%も変わる（固定値禁止）")
    }

    // MARK: - パーセンテージ診断

    func testPercentageIsDeterministicAndVaries() {
        let engine = ScoringEngine(profiles: makeConfig())
        let spec = ScoringSpec(
            bias: 0.5,
            weights: ["eyeSize": 0.3, "jawSharpness": -0.2],
            percentMin: 5,
            percentMax: 95
        )
        let a1 = engine.percentage(features: roundFeatures(), spec: spec)
        let a2 = engine.percentage(features: roundFeatures(), spec: spec)
        let b = engine.percentage(features: sharpFeatures(), spec: spec)
        XCTAssertEqual(a1, a2, "同一特徴量 → 同一%")
        XCTAssertNotEqual(a1, b, "異なる特徴量 → 異なる%")
    }

    func testPercentageIsClamped() {
        let engine = ScoringEngine(profiles: makeConfig())
        let highSpec = ScoringSpec(bias: 5.0, weights: [:], percentMin: 10, percentMax: 90)
        let lowSpec = ScoringSpec(bias: -5.0, weights: [:], percentMin: 10, percentMax: 90)
        XCTAssertEqual(engine.percentage(features: roundFeatures(), spec: highSpec), 90)
        XCTAssertEqual(engine.percentage(features: roundFeatures(), spec: lowSpec), 10)
    }

    // MARK: - 帯域文

    func testBandTextSelection() {
        let bands = [
            ResultBand(minPercent: 0, text: "low"),
            ResultBand(minPercent: 50, text: "mid"),
            ResultBand(minPercent: 80, text: "high"),
        ]
        XCTAssertEqual(ScoringEngine.bandText(for: 95, bands: bands), "high")
        XCTAssertEqual(ScoringEngine.bandText(for: 60, bands: bands), "mid")
        XCTAssertEqual(ScoringEngine.bandText(for: 10, bands: bands), "low")
        XCTAssertNil(ScoringEngine.bandText(for: 50, bands: nil))
    }

    // MARK: - 正規化

    func testNormalizerMapsAndClamps() {
        let normalizer = FeatureNormalizer(ranges: ["faceAspectRatio": [1.0, 1.5]])
        var raw = RawFaceMetrics()
        raw.faceAspectRatio = 1.25
        XCTAssertEqual(normalizer.normalize(raw).faceAspectRatio, 0.5, accuracy: 0.0001)

        raw.faceAspectRatio = 9.9
        XCTAssertEqual(normalizer.normalize(raw).faceAspectRatio, 1.0, accuracy: 0.0001)

        raw.faceAspectRatio = -3
        XCTAssertEqual(normalizer.normalize(raw).faceAspectRatio, 0.0, accuracy: 0.0001)
    }
}
