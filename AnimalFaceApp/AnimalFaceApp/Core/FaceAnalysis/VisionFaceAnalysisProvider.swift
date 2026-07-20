import UIKit
import Vision

/// Vision framework（端末内・オフライン動作）による顔特徴量抽出。
/// 乱数を一切使わない決定論的な計算のみ行う（同一写真 → 同一特徴量 → 同一診断結果）。
struct VisionFaceAnalysisProvider: FaceAnalysisProvider {
    let normalizer: FeatureNormalizer

    func analyze(image: UIImage) async throws -> FaceFeatures {
        guard let cgImage = Self.makeCGImage(from: image) else {
            throw FaceAnalysisError.invalidImage
        }
        let orientation = Self.cgOrientation(from: image.imageOrientation)
        let imageSize = CGSize(width: cgImage.width, height: cgImage.height)

        return try await withCheckedThrowingContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    let request = VNDetectFaceLandmarksRequest()
                    let handler = VNImageRequestHandler(
                        cgImage: cgImage, orientation: orientation, options: [:]
                    )
                    try handler.perform([request])

                    let observations = request.results ?? []
                    // 複数人が写る場合は最も大きく写っている顔を対象にする（要件 4-2）
                    guard let target = observations.max(by: {
                        ($0.boundingBox.width * $0.boundingBox.height)
                            < ($1.boundingBox.width * $1.boundingBox.height)
                    }) else {
                        continuation.resume(throwing: FaceAnalysisError.noFaceDetected)
                        return
                    }
                    let raw = try Self.rawMetrics(from: target, imageSize: imageSize)
                    continuation.resume(returning: normalizer.normalize(raw))
                } catch let error as FaceAnalysisError {
                    continuation.resume(throwing: error)
                } catch {
                    continuation.resume(throwing: FaceAnalysisError.analysisFailed(underlying: error))
                }
            }
        }
    }

    // MARK: - 特徴量計算（すべて顔サイズに対する比率＝撮影距離に不変）

    static func rawMetrics(from observation: VNFaceObservation, imageSize: CGSize) throws -> RawFaceMetrics {
        guard let landmarks = observation.landmarks,
              let leftEyeRegion = landmarks.leftEye,
              let rightEyeRegion = landmarks.rightEye,
              let lipsRegion = landmarks.outerLips,
              let contourRegion = landmarks.faceContour
        else {
            throw FaceAnalysisError.landmarksIncomplete
        }

        // 画像ピクセル座標（原点は左下・y上向き）に変換して幾何計算する
        let leftEye = leftEyeRegion.pointsInImage(imageSize: imageSize)
        let rightEye = rightEyeRegion.pointsInImage(imageSize: imageSize)
        let lips = lipsRegion.pointsInImage(imageSize: imageSize)
        let contour = contourRegion.pointsInImage(imageSize: imageSize)
        guard leftEye.count >= 4, rightEye.count >= 4, lips.count >= 4, contour.count >= 7 else {
            throw FaceAnalysisError.landmarksIncomplete
        }

        let faceRect = VNImageRectForNormalizedRect(
            observation.boundingBox, Int(imageSize.width), Int(imageSize.height)
        )
        let faceW = Double(faceRect.width)
        let faceH = Double(faceRect.height)
        guard faceW > 1, faceH > 1 else { throw FaceAnalysisError.landmarksIncomplete }
        let faceArea = faceW * faceH

        var m = RawFaceMetrics()

        // 面長⇄丸顔: 顔バウンディングボックスの縦横比
        m.faceAspectRatio = faceH / faceW

        // 目の大きさ: 両目の輪郭面積の平均 / 顔面積
        let eyeArea = (polygonArea(leftEye) + polygonArea(rightEye)) / 2
        m.eyeSize = eyeArea / faceArea

        // 目尻の上がり/下がり: 目の内側→外側コーナーの傾き（y上向き座標なので上がり目が正）
        m.eyeSlant = (eyeSlant(of: leftEye, outerIsMinX: true)
            + eyeSlant(of: rightEye, outerIsMinX: false)) / 2

        // 顔の横張り: 口の高さ位置での輪郭幅 / 顔の高さ
        m.faceWidth = contourWidth(contour, atHeightFraction: 0.25) / faceH

        // 輪郭のシャープさ: 顎先の角度（鋭い顎ほど大）
        m.jawSharpness = chinSharpness(contour)

        // 頬のふっくら度: 頬の高さでの輪郭幅 / 目の高さでの輪郭幅
        let cheekWidth = contourWidth(contour, atHeightFraction: 0.50)
        let eyeLevelWidth = contourWidth(contour, atHeightFraction: 0.85)
        m.cheekFullness = eyeLevelWidth > 1 ? cheekWidth / eyeLevelWidth : 0

        // 口の大きさ: 唇の幅 / 顔の幅
        let lipXs = lips.map(\.x)
        m.mouthSize = Double((lipXs.max() ?? 0) - (lipXs.min() ?? 0)) / faceW

        // パーツの存在感: (両目面積 + 唇面積) / 顔面積
        m.featureProminence = (polygonArea(leftEye) + polygonArea(rightEye) + polygonArea(lips)) / faceArea

        return m
    }

    /// 多角形の面積（靴ひも公式）
    private static func polygonArea(_ points: [CGPoint]) -> Double {
        guard points.count >= 3 else { return 0 }
        var sum: Double = 0
        for i in 0..<points.count {
            let a = points[i]
            let b = points[(i + 1) % points.count]
            sum += Double(a.x * b.y - b.x * a.y)
        }
        return abs(sum) / 2
    }

    /// 目の傾き。内→外コーナーで外側が高ければ正（つり目）、低ければ負（たれ目）
    private static func eyeSlant(of eye: [CGPoint], outerIsMinX: Bool) -> Double {
        guard let outer = outerIsMinX ? eye.min(by: { $0.x < $1.x }) : eye.max(by: { $0.x < $1.x }),
              let inner = outerIsMinX ? eye.max(by: { $0.x < $1.x }) : eye.min(by: { $0.x < $1.x })
        else { return 0 }
        let dx = Double(abs(outer.x - inner.x))
        guard dx > 1 else { return 0 }
        return Double(outer.y - inner.y) / dx
    }

    /// 輪郭の指定高さ（0=顎先, 1=輪郭最上部）における左右幅
    private static func contourWidth(_ contour: [CGPoint], atHeightFraction fraction: Double) -> Double {
        let ys = contour.map(\.y)
        guard let minY = ys.min(), let maxY = ys.max(), maxY > minY else { return 0 }
        let targetY = Double(minY) + fraction * Double(maxY - minY)

        // faceContour は片側の耳付近→顎先→反対側の耳付近の順に並ぶため、前半/後半で左右に分ける
        let half = contour.count / 2
        let sideA = Array(contour.prefix(half))
        let sideB = Array(contour.suffix(from: half))
        guard let a = sideA.min(by: { abs(Double($0.y) - targetY) < abs(Double($1.y) - targetY) }),
              let b = sideB.min(by: { abs(Double($0.y) - targetY) < abs(Double($1.y) - targetY) })
        else { return 0 }
        return Double(abs(a.x - b.x))
    }

    /// 顎先の鋭さ。顎先とその両隣数点がなす角度 θ から 1 - θ/π を返す（鋭いほど大）
    private static func chinSharpness(_ contour: [CGPoint]) -> Double {
        guard let chinIndex = contour.indices.min(by: { contour[$0].y < contour[$1].y }) else { return 0 }
        let offset = max(2, contour.count / 8)
        let li = max(0, chinIndex - offset)
        let ri = min(contour.count - 1, chinIndex + offset)
        guard li < chinIndex, chinIndex < ri else { return 0 }
        let chin = contour[chinIndex]
        let v1 = CGVector(dx: contour[li].x - chin.x, dy: contour[li].y - chin.y)
        let v2 = CGVector(dx: contour[ri].x - chin.x, dy: contour[ri].y - chin.y)
        let len1 = Double(v1.dx * v1.dx + v1.dy * v1.dy).squareRoot()
        let len2 = Double(v2.dx * v2.dx + v2.dy * v2.dy).squareRoot()
        guard len1 > 0.001, len2 > 0.001 else { return 0 }
        let cosTheta = Double(v1.dx * v2.dx + v1.dy * v2.dy) / (len1 * len2)
        let theta = acos(min(max(cosTheta, -1), 1))
        return 1 - theta / .pi
    }

    // MARK: - 画像変換ヘルパー

    private static func makeCGImage(from image: UIImage) -> CGImage? {
        if let cg = image.cgImage { return cg }
        // CIImage バックの UIImage 等はビットマップに描画して取得
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        let renderer = UIGraphicsImageRenderer(size: image.size, format: format)
        let rendered = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: image.size))
        }
        return rendered.cgImage
    }

    private static func cgOrientation(from orientation: UIImage.Orientation) -> CGImagePropertyOrientation {
        switch orientation {
        case .up: return .up
        case .down: return .down
        case .left: return .left
        case .right: return .right
        case .upMirrored: return .upMirrored
        case .downMirrored: return .downMirrored
        case .leftMirrored: return .leftMirrored
        case .rightMirrored: return .rightMirrored
        @unknown default: return .up
        }
    }
}
