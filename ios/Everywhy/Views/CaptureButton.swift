import SwiftUI
import PhotosUI

/// Capture entry point (Capture.tsx): camera on device, photo library everywhere
/// (the simulator has no camera, so the library path is what you'll use there).
struct CaptureButton: View {
    @Environment(AppModel.self) private var model
    @State private var photoItem: PhotosPickerItem?
    @State private var showCamera = false
    var prominent = false

    private var cameraAvailable: Bool {
        UIImagePickerController.isSourceTypeAvailable(.camera)
    }

    var body: some View {
        Group {
            if cameraAvailable {
                Menu {
                    Button {
                        showCamera = true
                    } label: {
                        Label("Take a photo", systemImage: "camera")
                    }
                    photoPicker {
                        Label("Choose from library", systemImage: "photo.on.rectangle")
                    }
                } label: {
                    label
                }
            } else {
                photoPicker { label }
            }
        }
        .onChange(of: photoItem) { _, item in
            guard let item else { return }
            photoItem = nil
            Task { await load(item) }
        }
        .fullScreenCover(isPresented: $showCamera) {
            CameraPicker { image in
                process(image)
            }
            .ignoresSafeArea()
        }
    }

    private func photoPicker<Label: View>(@ViewBuilder label: () -> Label) -> some View {
        PhotosPicker(selection: $photoItem, matching: .images, label: label)
    }

    @ViewBuilder
    private var label: some View {
        if prominent {
            HStack(spacing: 10) {
                Image(systemName: "camera.fill")
                Text("Capture something")
                    .fontWeight(.bold)
            }
            .font(.title3)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(Theme.gradient, in: Capsule())
            .shadow(color: Theme.accent.opacity(0.35), radius: 12, y: 6)
        } else {
            Label("Image", systemImage: "camera.fill")
                .font(.footnote.weight(.semibold))
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .glassCard(cornerRadius: 999)
        }
    }

    private func load(_ item: PhotosPickerItem) async {
        guard let data = try? await item.loadTransferable(type: Data.self),
              let image = UIImage(data: data)
        else {
            model.captureFailed("Couldn't read that image. Try a different one.")
            return
        }
        process(image)
    }

    private func process(_ image: UIImage) {
        guard let base64 = ImageProcessing.base64JPEG(from: image) else {
            model.captureFailed("Couldn't read that image. Try a different one.")
            return
        }
        Task { await model.identify(imageBase64: base64) }
    }
}

/// UIKit camera bridge — SwiftUI has no native camera capture view.
struct CameraPicker: UIViewControllerRepresentable {
    @Environment(\.dismiss) private var dismiss
    let onImage: (UIImage) -> Void

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ picker: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        private let parent: CameraPicker
        init(_ parent: CameraPicker) { self.parent = parent }

        func imagePickerController(
            _ picker: UIImagePickerController,
            didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
        ) {
            parent.dismiss()
            if let image = info[.originalImage] as? UIImage {
                parent.onImage(image)
            }
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }
    }
}
