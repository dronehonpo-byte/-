import UIKit

/// 顔解析の失敗。UIはこれをユーザーフレンドリーな文言に変換して表示する（クラッシュ禁止）。
enum FaceAnalysisError: Error, LocalizedError {
    case invalidImage
    case noFaceDetected
    case landmarksIncomplete
    case analysisFailed(underlying: Error?)

    var errorDescription: String? {
        switch self {
        case .invalidImage:
            return AppConfig.ErrorText.imageLoadFailed
        case .noFaceDetected, .landmarksIncomplete:
            return AppConfig.ErrorText.faceNotFound
        case .analysisFailed:
            return AppConfig.ErrorText.faceNotFound
        }
    }
}

/// 顔解析エンジンの差し替え口。
/// 初期リリースは Vision（端末内）のみ。将来 Google Cloud Vision / AWS Rekognition を
/// この protocol の実装として追加し、DI を差し替えるだけで移行できる。
protocol FaceAnalysisProvider: Sendable {
    /// 画像から正規化済み顔特徴量を抽出する。
    /// - Note: 呼び出し側は診断完了後、渡した画像への参照を即時破棄すること（プライバシー要件）。
    func analyze(image: UIImage) async throws -> FaceFeatures
}

/// 主エンジン（将来: クラウド）失敗時にローカルへフォールバックする合成プロバイダ。
/// 「通信失敗時は端末内簡易処理に切り替えて診断を継続」要件の実装座席。
/// 初期リリースでは primary = Vision のためフォールバックは実質使われないが、
/// クラウド実装追加時にここへ差し込む。
struct CompositeFaceAnalysisProvider: FaceAnalysisProvider {
    let primary: FaceAnalysisProvider
    let fallback: FaceAnalysisProvider?

    func analyze(image: UIImage) async throws -> FaceFeatures {
        do {
            return try await primary.analyze(image: image)
        } catch {
            // 顔が見つからない失敗はフォールバックしても結果は同じなのでそのまま返す
            if case FaceAnalysisError.noFaceDetected = error { throw error }
            guard let fallback else { throw error }
            return try await fallback.analyze(image: image)
        }
    }
}

// TODO(将来): CloudFaceAnalysisProvider (Google Cloud Vision / AWS Rekognition)
// - FaceAnalysisProvider 準拠で実装し、CompositeFaceAnalysisProvider(primary: cloud, fallback: vision) に差し替える
// - 画像が外部送信される旨をプライバシーポリシーへ明記すること（要件 7）
// - API 費用は月額利益の 20% 以下に収める設計とする
