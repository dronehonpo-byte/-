import SwiftUI
import UIKit

/// シェア画像とシェアテキストの生成。
/// 優先SNS（TikTok / X / Instagram / LINE）はいずれもテキスト＋画像を共有シート経由で受け取れる。
@MainActor
struct ShareService {
    let hashtags: HashtagConfig

    /// 結果カードを画像化する（失敗時は nil を返しテキストのみ共有にフォールバック）
    func renderImage(for result: DiagnosisResult) -> UIImage? {
        let renderer = ImageRenderer(content: ShareCardView(result: result))
        renderer.scale = 3.0 // SNS映えする解像度（1080x1440相当）
        return renderer.uiImage
    }

    /// シェアテキスト（診断結果＋ハッシュタグ。拡散系 #顔診断 をメインに）
    func shareText(for result: DiagnosisResult) -> String {
        let percentText: String
        if result.item.kind == .spectrum, let spectrum = result.item.spectrum {
            percentText = "\(spectrum.highLabel)度\(result.percent)%"
        } else if let animal = result.animal {
            percentText = "\(animal.nameJa)（マッチ率\(result.percent)%）"
        } else {
            percentText = "\(result.percent)%"
        }
        let body = AppConfig.Share.textTemplate
            .replacingOccurrences(of: "{title}", with: result.item.title)
            .replacingOccurrences(of: "{percent}", with: percentText)
        let tags = hashtags.shareTags(animalName: result.animal?.nameJa).joined(separator: " ")
        return "\(body)\n\(tags)\n\(AppConfig.appStoreURL.absoluteString)"
    }

    /// 共有シートに渡すアイテム一覧
    func activityItems(for result: DiagnosisResult) -> [Any] {
        var items: [Any] = [shareText(for: result)]
        if let image = renderImage(for: result) {
            items.append(image)
        }
        return items
    }
}

/// UIActivityViewController の SwiftUI ラッパー
struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
