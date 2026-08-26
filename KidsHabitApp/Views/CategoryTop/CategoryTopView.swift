import SwiftUI

/// カテゴリTOP：シーン選択画面
struct CategoryTopView: View {
    let category: CategoryType
    let onSelectScene: (Int) -> Void
    let onHome: () -> Void

    @EnvironmentObject private var progress: SessionProgress
    private let columns = [GridItem(.adaptive(minimum: 220), spacing: 20)]

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                HomeButton(action: onHome)
                Spacer()
                HStack(spacing: 10) {
                    Image(systemName: category.symbolName)
                        .font(.title)
                        .foregroundStyle(category.themeColor)
                    Text(category.rawValue)
                        .font(.system(size: 32, weight: .heavy, design: .rounded))
                }
                Spacer()
                Color.clear.frame(width: 56, height: 56)
            }
            .padding(.horizontal, 24)
            .padding(.top, 12)

            ScrollView {
                LazyVGrid(columns: columns, spacing: 20) {
                    ForEach(Array(category.scenes.enumerated()), id: \.element.id) { index, scene in
                        SceneCard(
                            scene: scene,
                            themeColor: category.themeColor,
                            isCleared: progress.isCleared(category, index: index)
                        )
                        .onTapGesture {
                            AudioManager.shared.playSE(.tap)
                            onSelectScene(index)
                        }
                    }
                }
                .padding(24)
            }
        }
    }
}

/// シーンカード（クリア済みはチェックマーク表示）
struct SceneCard: View {
    let scene: SceneData
    let themeColor: Color
    let isCleared: Bool

    var body: some View {
        VStack(spacing: 8) {
            ZStack(alignment: .topTrailing) {
                RoundedRectangle(cornerRadius: 20)
                    .fill(themeColor.opacity(0.6))
                    .frame(height: 110)
                    .overlay(
                        Image(systemName: "photo")
                            .font(.system(size: 40))
                            .foregroundStyle(.white.opacity(0.8))
                    )
                if isCleared {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 36))
                        .foregroundStyle(AppColor.mainGreen)
                        .background(Circle().fill(.white))
                        .padding(6)
                }
            }
            Text(scene.title)
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .lineLimit(1)
                .minimumScaleFactor(0.6)
        }
        .padding(10)
        .background(RoundedRectangle(cornerRadius: 24).fill(.white).shadow(color: .black.opacity(0.1), radius: 5, y: 2))
    }
}

/// 常時左上に表示するホームボタン（44pt以上）
struct HomeButton: View {
    let action: () -> Void
    var body: some View {
        Button {
            AudioManager.shared.playSE(.tap)
            action()
        } label: {
            Image(systemName: "house.fill")
                .font(.title)
                .foregroundStyle(.white)
                .frame(width: 56, height: 56)
                .background(Circle().fill(AppColor.mainBlue))
                .shadow(radius: 3)
        }
    }
}
