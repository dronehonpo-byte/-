import SwiftUI

/// 画面10: 利用規約 / プライバシーポリシー。
/// 本文は Resources/Legal/ のプレースホルダを表示（Miyabee 提供の本文に差し替え可能）。
struct LegalView: View {
    let kind: LegalKind

    var body: some View {
        ScrollView {
            Text(loadText())
                .font(.footnote)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(20)
        }
        .background(AppConfig.Theme.background.ignoresSafeArea())
        .navigationTitle(kind == .terms ? "利用規約" : "プライバシーポリシー")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func loadText() -> String {
        let fileName = kind == .terms ? "terms_placeholder" : "privacy_placeholder"
        guard let url = Bundle.main.url(forResource: fileName, withExtension: "md"),
              let text = try? String(contentsOf: url, encoding: .utf8)
        else {
            return "本文を読み込めませんでした。お問い合わせよりご連絡ください。"
        }
        return text
    }
}
