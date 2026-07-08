import Foundation
import StoreKit

/// StoreKit 2 による課金状態管理。
/// エンタイトルメント判定は Transaction.currentEntitlements を単一の真実源とし、
/// 自前フラグ（UserDefaults 等）を課金状態の根拠にしない（要件 5-1）。
@MainActor
final class EntitlementManager: ObservableObject {
    /// プレミアム（全診断解放・広告非表示・回数無制限）かどうか
    @Published private(set) var isPremium = false
    @Published private(set) var products: [Product] = []
    @Published private(set) var isLoadingProducts = false

    enum PurchaseOutcome {
        case success
        case pending
        case cancelled
    }

    private var updatesTask: Task<Void, Never>?

    init() {
        // App Store 外で完了した取引（承認待ち・別端末購入・返金等）を監視
        updatesTask = Task { [weak self] in
            for await update in Transaction.updates {
                if case .verified(let transaction) = update {
                    await transaction.finish()
                }
                await self?.refreshEntitlements()
            }
        }
        Task {
            await refreshEntitlements()
            await loadProducts()
        }
    }

    deinit {
        updatesTask?.cancel()
    }

    /// Transaction.currentEntitlements から課金状態を再計算する
    func refreshEntitlements() async {
        var premium = false
        for await result in Transaction.currentEntitlements {
            guard case .verified(let transaction) = result else { continue }
            if AppConfig.Purchase.allProductIDs.contains(transaction.productID),
               transaction.revocationDate == nil {
                premium = true
            }
        }
        isPremium = premium
    }

    /// 販売中プランを取得（失敗しても throw せず、UI 側で再試行導線を出す）
    func loadProducts() async {
        guard !isLoadingProducts else { return }
        isLoadingProducts = true
        defer { isLoadingProducts = false }
        do {
            let loaded = try await Product.products(for: AppConfig.Purchase.allProductIDs)
            // AppConfig の定義順に整列（将来の複数プラン表示に備える）
            products = AppConfig.Purchase.allProductIDs.compactMap { id in
                loaded.first { $0.id == id }
            }
        } catch {
            products = []
        }
    }

    func purchase(_ product: Product) async throws -> PurchaseOutcome {
        let result = try await product.purchase()
        switch result {
        case .success(let verification):
            if case .verified(let transaction) = verification {
                await transaction.finish()
            }
            await refreshEntitlements()
            return .success
        case .pending:
            return .pending
        case .userCancelled:
            return .cancelled
        @unknown default:
            return .cancelled
        }
    }

    /// 復元購入（設定画面から）
    func restorePurchases() async throws {
        try await AppStore.sync()
        await refreshEntitlements()
    }
}
