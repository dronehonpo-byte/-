import SwiftUI

/// ホーム画面：カテゴリ一覧グリッド（ごっこランド風）
struct HomeView: View {
    let onSelectCategory: (CategoryType) -> Void

    @EnvironmentObject private var purchaseManager: PurchaseManager
    @State private var showSettings = false
    @State private var showSubscription = false

    private let columns = [GridItem(.adaptive(minimum: 200), spacing: 20)]
    private var categories: [CategoryType] { CategoryType.allCases.filter { $0.phase <= 2 } }

    var body: some View {
        VStack(spacing: 0) {
            // ヘッダー
            HStack {
                Button { showSettings = true } label: {
                    Image(systemName: "gearshape.fill")
                        .font(.title)
                        .foregroundStyle(.gray)
                        .frame(width: 56, height: 56)
                        .background(Circle().fill(.white))
                        .shadow(radius: 2)
                }
                Spacer()
                Text("home.title")
                    .font(.system(size: 32, weight: .heavy, design: .rounded))
                    .foregroundStyle(AppColor.mainBlue)
                Spacer()
                Color.clear.frame(width: 56, height: 56)
            }
            .padding(.horizontal, 24)
            .padding(.top, 12)

            ScrollView {
                LazyVGrid(columns: columns, spacing: 20) {
                    ForEach(categories) { category in
                        CategoryCard(category: category, isLocked: category.isPremium && !purchaseManager.isPremium)
                            .onTapGesture { handleTap(category) }
                    }
                }
                .padding(24)
            }
        }
        .sheet(isPresented: $showSettings) { SettingsView() }
        .sheet(isPresented: $showSubscription) { SubscriptionView() }
    }

    private func handleTap(_ category: CategoryType) {
        AudioManager.shared.playSE(.tap)
        guard category.isPlayable else { return }   // フェーズ2以降は準備中
        if category.isPremium && !purchaseManager.isPremium {
            showSubscription = true
        } else {
            onSelectCategory(category)
        }
    }
}

/// カテゴリカード
struct CategoryCard: View {
    let category: CategoryType
    let isLocked: Bool

    var body: some View {
        VStack(spacing: 8) {
            ZStack(alignment: .topTrailing) {
                RoundedRectangle(cornerRadius: 24)
                    .fill(category.themeColor.opacity(category.isPlayable ? 0.85 : 0.35))
                    .frame(height: 130)
                    .overlay(
                        Image(systemName: category.symbolName)
                            .font(.system(size: 56))
                            .foregroundStyle(.white)
                    )

                // 王冠（サブスク）マーク
                if category.isPremium {
                    Image(systemName: isLocked ? "crown.fill" : "crown")
                        .font(.title2)
                        .foregroundStyle(AppColor.mainYellow)
                        .padding(10)
                        .background(Circle().fill(.white))
                        .shadow(radius: 2)
                        .padding(8)
                }
            }

            HStack(spacing: 6) {
                Text(category.rawValue)
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                    .foregroundStyle(.primary)
                if !category.isPlayable {
                    Text("home.comingSoon")
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(12)
        .background(RoundedRectangle(cornerRadius: 28).fill(.white).shadow(color: .black.opacity(0.1), radius: 6, y: 3))
    }
}
