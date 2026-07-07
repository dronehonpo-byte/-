import SwiftUI
import StoreKit

/// サブスク案内・購入フロー
/// 子どもが勝手に課金できないよう、購入前に「おとなのかたへ」確認ダイアログを必ず表示する。
struct SubscriptionView: View {
    @EnvironmentObject private var purchaseManager: PurchaseManager
    @Environment(\.dismiss) private var dismiss

    @State private var showParentalGate = false
    @State private var gateAnswerText = ""
    @State private var errorMessage: String?

    // 簡易ペアレンタルゲート（足し算）
    private let gateA = Int.random(in: 3...9)
    private let gateB = Int.random(in: 2...8)

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "crown.fill")
                .font(.system(size: 56))
                .foregroundStyle(AppColor.mainYellow)

            Text("subscription.title")
                .font(.system(size: 30, weight: .heavy, design: .rounded))

            Text("subscription.description")
                .font(.system(size: 18, weight: .medium, design: .rounded))
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)

            if purchaseManager.isPremium {
                Label("subscription.active", systemImage: "checkmark.seal.fill")
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .foregroundStyle(AppColor.mainGreen)
            } else {
                Button { showParentalGate = true } label: {
                    VStack(spacing: 4) {
                        Text("subscription.purchase")
                            .font(.system(size: 24, weight: .heavy, design: .rounded))
                        Text(purchaseManager.monthlyProduct?.displayPrice ?? "¥200/つき")
                            .font(.system(size: 16, weight: .bold, design: .rounded))
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 44)
                    .padding(.vertical, 16)
                    .background(Capsule().fill(AppColor.mainYellow).shadow(radius: 4))
                }
                .disabled(purchaseManager.purchaseInProgress)

                Button("subscription.restore") {
                    Task {
                        do { try await purchaseManager.restorePurchases() }
                        catch { errorMessage = error.localizedDescription }
                    }
                }
                .font(.system(size: 16, weight: .bold, design: .rounded))
            }

            if let errorMessage {
                Text(errorMessage)
                    .font(.footnote)
                    .foregroundStyle(.red)
            }

            Button("common.close") { dismiss() }
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundStyle(.secondary)
        }
        .padding(32)
        .alert("subscription.parentalGate.title", isPresented: $showParentalGate) {
            TextField("\(gateA) + \(gateB) = ?", text: $gateAnswerText)
                .keyboardType(.numberPad)
            Button("subscription.parentalGate.ok") {
                if Int(gateAnswerText) == gateA + gateB {
                    Task {
                        do { try await purchaseManager.purchase() }
                        catch { errorMessage = error.localizedDescription }
                    }
                }
                gateAnswerText = ""
            }
            Button("common.cancel", role: .cancel) { gateAnswerText = "" }
        } message: {
            Text("subscription.parentalGate.message")
        }
        .task { await purchaseManager.loadProducts() }
    }
}
