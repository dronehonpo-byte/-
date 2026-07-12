import SwiftUI

/// 画面6: 診断結果。診断名・%・説明文・動物画像・注意書き・シェアボタン。
struct ResultView: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var environment: AppEnvironment

    @State private var showShareSheet = false
    @State private var animatePercent = false

    var body: some View {
        VStack(spacing: 0) {
            if let result = appState.lastResult {
                ScrollView {
                    VStack(spacing: 20) {
                        resultCard(result)

                        Button {
                            environment.analytics.track(.shareTapped(itemID: result.item.id))
                            showShareSheet = true
                        } label: {
                            Label("結果をシェアする", systemImage: "square.and.arrow.up")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .background(AppConfig.Theme.primary)
                                .foregroundColor(.white)
                                .cornerRadius(16)
                        }
                        .padding(.horizontal, 24)

                        Button {
                            appState.goToMenu()
                        } label: {
                            Text("ほかの診断もしてみる")
                                .font(.subheadline.bold())
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(AppConfig.Theme.accent.opacity(0.15))
                                .foregroundColor(AppConfig.Theme.accent)
                                .cornerRadius(16)
                        }
                        .padding(.horizontal, 24)

                        VStack(spacing: 6) {
                            Text(result.disclaimer)
                            Text(AppConfig.accuracyNote)
                        }
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                        .padding(.bottom, 16)
                    }
                    .padding(.top, 16)
                }
                .sheet(isPresented: $showShareSheet) {
                    ShareSheet(items: environment.shareService.activityItems(for: result))
                }
            } else {
                // 結果なしで到達した場合の保険（クラッシュさせない）
                VStack(spacing: 12) {
                    Text("🐾")
                        .font(.system(size: 48))
                    Text("結果が見つかりませんでした。もう一度診断してみてください。")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                    Button("診断メニューへ") { appState.goToMenu() }
                        .buttonStyle(.borderedProminent)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .padding(24)
            }

            AdBannerView()
        }
        .background(AppConfig.Theme.background.ignoresSafeArea())
        .navigationTitle("診断結果")
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button {
                    appState.goToMenu()
                } label: {
                    Image(systemName: "house")
                }
            }
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.9).delay(0.15)) {
                animatePercent = true
            }
        }
    }

    // MARK: - 結果カード

    @ViewBuilder
    private func resultCard(_ result: DiagnosisResult) -> some View {
        VStack(spacing: 16) {
            Text(result.item.displayTitle)
                .font(.headline)
                .foregroundColor(.secondary)

            // TODO(Miyabee): 素材提供後、emoji → Image(...) に差し替え
            //   animal=顔20番+各動物イラスト / type2=醤油・ソース瓶 / percentage=各テーマ画像
            Text(result.animal?.emoji ?? result.typeEmoji ?? result.item.icon)
                .font(.system(size: 88))

            if let animal = result.animal {
                Text(animal.nameJa)
                    .font(.largeTitle.bold())
                    .foregroundColor(AppConfig.Theme.primary)

                HStack(spacing: 8) {
                    ForEach(animal.impressionWords, id: \.self) { word in
                        Text(word)
                            .font(.caption.bold())
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(AppConfig.Theme.secondary.opacity(0.3))
                            .cornerRadius(10)
                    }
                }
            } else if let typeLabel = result.typeLabel {
                // type2: 選ばれたタイプ名を大きく表示（%・段階は出さない）
                Text(typeLabel)
                    .font(.largeTitle.bold())
                    .foregroundColor(AppConfig.Theme.primary)
            }

            if result.item.kind != .type2 {
                percentRing(result.percent,
                            caption: result.animal != nil ? "マッチ率" : "")
            }

            Text(result.text)
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 20)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
        .background(Color(.systemBackground))
        .cornerRadius(20)
        .shadow(color: .black.opacity(0.08), radius: 8, y: 3)
        .padding(.horizontal, 24)
    }

    private func percentRing(_ percent: Int, caption: String) -> some View {
        ZStack {
            Circle()
                .stroke(AppConfig.Theme.secondary.opacity(0.25), lineWidth: 12)
            Circle()
                .trim(from: 0, to: animatePercent ? CGFloat(percent) / 100 : 0)
                .stroke(
                    AppConfig.Theme.primary,
                    style: StrokeStyle(lineWidth: 12, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
            VStack(spacing: 2) {
                Text("\(percent)%")
                    .font(.system(size: 34, weight: .heavy, design: .rounded))
                if !caption.isEmpty {
                    Text(caption)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .frame(width: 130, height: 130)
    }
}
