import Foundation
import StoreKit
import Security

/// StoreKit 2 によるサブスクリプション管理
/// - 課金フラグは Keychain に保存（UserDefaultsより安全）
/// - Family Sharing 対応（revocationDate 確認）
@MainActor
final class PurchaseManager: ObservableObject {
    static let shared = PurchaseManager()

    /// App Store Connect 登録前のプレースホルダーID
    static let monthlyProductID = "com.miyabee.kidshabitapp.monthly"

    @Published var isPremium: Bool = false
    @Published var monthlyProduct: Product?
    @Published var purchaseInProgress = false

    private var transactionListener: Task<Void, Never>?

    private init() {
        // 起動直後はKeychainのキャッシュ値を反映（オフライン対応）
        isPremium = KeychainHelper.readBool(key: "isPremium")
    }

    deinit { transactionListener?.cancel() }

    // MARK: - Public API

    func startTransactionListener() {
        transactionListener = Task { [weak self] in
            for await update in Transaction.updates {
                await self?.handle(verification: update)
            }
        }
        Task { await loadProducts() }
    }

    func loadProducts() async {
        do {
            let products = try await Product.products(for: [Self.monthlyProductID])
            monthlyProduct = products.first
        } catch {
            print("商品情報の取得に失敗: \(error)")
        }
    }

    func purchase() async throws {
        guard let product = monthlyProduct else {
            await loadProducts()
            guard let product = monthlyProduct else { throw StoreError.productNotFound }
            return try await purchase(product: product)
        }
        try await purchase(product: product)
    }

    func restorePurchases() async throws {
        try await AppStore.sync()
        await checkEntitlements()
    }

    /// 現在の有効なエンタイトルメントを確認
    func checkEntitlements() async {
        var premium = false
        for await entitlement in Transaction.currentEntitlements {
            if case .verified(let transaction) = entitlement,
               transaction.productID == Self.monthlyProductID,
               transaction.revocationDate == nil {   // Family Sharing取り消し確認
                premium = true
            }
        }
        setPremium(premium)
    }

    // MARK: - Private

    private func purchase(product: Product) async throws {
        purchaseInProgress = true
        defer { purchaseInProgress = false }

        let result = try await product.purchase()
        switch result {
        case .success(let verification):
            await handle(verification: verification)
        case .userCancelled, .pending:
            break
        @unknown default:
            break
        }
    }

    private func handle(verification: VerificationResult<Transaction>) async {
        // StoreKit 2 のTransaction検証（verified のみ受け入れる）
        guard case .verified(let transaction) = verification else { return }
        if transaction.productID == Self.monthlyProductID {
            setPremium(transaction.revocationDate == nil)
        }
        await transaction.finish()
    }

    private func setPremium(_ value: Bool) {
        isPremium = value
        KeychainHelper.saveBool(key: "isPremium", value: value)
    }

    enum StoreError: LocalizedError {
        case productNotFound
        var errorDescription: String? { "しょうひんが みつかりませんでした" }
    }
}

/// 課金フラグ保存用の簡易Keychainラッパー
enum KeychainHelper {
    private static let service = "com.miyabee.kidshabitapp"

    static func saveBool(key: String, value: Bool) {
        let data = Data([value ? 1 : 0])
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
        var attributes = query
        attributes[kSecValueData as String] = data
        attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(attributes as CFDictionary, nil)
    }

    static func readBool(key: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data, let first = data.first else { return false }
        return first == 1
    }
}
