import SwiftUI
import PhotosUI
import AVFoundation

/// 画面4: 撮影 / アップロード。撮影前ガイドを常時表示し、全失敗系をハンドリングする。
struct CaptureView: View {
    let item: DiagnosisItem

    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var environment: AppEnvironment

    @State private var selectedPhoto: PhotosPickerItem?
    @State private var showCamera = false
    @State private var alertMessage: String?
    @State private var showSettingsAlert = false
    @State private var isLoadingPhoto = false

    var body: some View {
        VStack(spacing: 20) {
            ScrollView {
                VStack(spacing: 20) {
                    HStack(spacing: 8) {
                        Text(item.icon)
                        Text(item.title)
                            .font(.headline)
                    }
                    .padding(.top, 8)

                    guideCard

                    Text(AppConfig.accuracyNote)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)

                    Text(AppConfig.ErrorText.multipleFacesNote)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                }
            }

            VStack(spacing: 12) {
                Button {
                    requestCamera()
                } label: {
                    Label("カメラで撮影する", systemImage: "camera.fill")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(AppConfig.Theme.primary)
                        .foregroundColor(.white)
                        .cornerRadius(16)
                }

                PhotosPicker(selection: $selectedPhoto, matching: .images) {
                    Label(isLoadingPhoto ? "読み込み中…" : "アルバムから選ぶ",
                          systemImage: "photo.on.rectangle")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(AppConfig.Theme.accent.opacity(0.15))
                        .foregroundColor(AppConfig.Theme.accent)
                        .cornerRadius(16)
                }
                .disabled(isLoadingPhoto)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 16)
        }
        .background(AppConfig.Theme.background.ignoresSafeArea())
        .navigationTitle("写真の準備")
        .navigationBarTitleDisplayMode(.inline)
        .fullScreenCover(isPresented: $showCamera) {
            CameraPicker { image in
                showCamera = false
                if let image {
                    proceed(with: image)
                }
            }
            .ignoresSafeArea()
        }
        .onChange(of: selectedPhoto) { newItem in
            guard let newItem else { return }
            loadPhoto(newItem)
        }
        .alert("写真を確認してください", isPresented: .init(
            get: { alertMessage != nil },
            set: { if !$0 { alertMessage = nil } }
        )) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(alertMessage ?? "")
        }
        .alert("カメラを使用できません", isPresented: $showSettingsAlert) {
            Button("設定を開く") {
                if let url = URL(string: UIApplication.openSettingsURLString) {
                    UIApplication.shared.open(url)
                }
            }
            Button("キャンセル", role: .cancel) {}
        } message: {
            Text(AppConfig.ErrorText.cameraDenied)
        }
    }

    private var guideCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("うまく診断するコツ")
                .font(.subheadline.bold())
            guideRow("😀", "正面を向いた写真を使う")
            guideRow("💡", "明るい場所で撮る")
            guideRow("🙋", "写っているのは1人だけ")
            guideRow("👀", "前髪やマスクで顔が隠れていない")
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.06), radius: 6, y: 2)
        .padding(.horizontal, 24)
    }

    private func guideRow(_ emoji: String, _ text: String) -> some View {
        HStack(spacing: 8) {
            Text(emoji)
            Text(text)
                .font(.subheadline)
        }
    }

    // MARK: - カメラ

    private func requestCamera() {
        guard UIImagePickerController.isSourceTypeAvailable(.camera) else {
            alertMessage = "この端末ではカメラを利用できません。アルバムから写真を選んでください。"
            return
        }
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            showCamera = true
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { granted in
                DispatchQueue.main.async {
                    if granted {
                        showCamera = true
                    } else {
                        showSettingsAlert = true
                    }
                }
            }
        case .denied, .restricted:
            showSettingsAlert = true
        @unknown default:
            showSettingsAlert = true
        }
    }

    // MARK: - フォトライブラリ

    private func loadPhoto(_ item: PhotosPickerItem) {
        isLoadingPhoto = true
        Task { @MainActor in
            defer {
                isLoadingPhoto = false
                selectedPhoto = nil
            }
            do {
                guard let data = try await item.loadTransferable(type: Data.self),
                      let image = UIImage(data: data)
                else {
                    alertMessage = AppConfig.ErrorText.imageLoadFailed
                    return
                }
                proceed(with: image)
            } catch {
                alertMessage = AppConfig.ErrorText.imageLoadFailed
            }
        }
    }

    // MARK: - 診断へ

    private func proceed(with image: UIImage) {
        // 画像はメモリ上の AppState.pendingImage にのみ載せる（永続化禁止）
        appState.pendingImage = image
        environment.analytics.track(.diagnosisStarted(itemID: item.id))
        appState.path.append(.loading(item))
    }
}
