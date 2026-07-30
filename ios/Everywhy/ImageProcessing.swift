import UIKit

// Mirrors lib/image.ts — bound the longest edge before upload to control
// vision-token cost and latency, then re-encode to JPEG.

enum ImageProcessing {
    static let maxEdge: CGFloat = 1280
    static let jpegQuality: CGFloat = 0.82

    /// Downscale so the longest edge is at most `maxEdge` (never upscales) and
    /// return a base64 JPEG payload ready for /api/identify.
    static func base64JPEG(from image: UIImage) -> String? {
        let scaled = downscale(image)
        guard let data = scaled.jpegData(compressionQuality: jpegQuality) else { return nil }
        return data.base64EncodedString()
    }

    private static func downscale(_ image: UIImage) -> UIImage {
        let size = image.size
        let longest = max(size.width, size.height)
        guard longest > maxEdge else { return image }
        let scale = maxEdge / longest
        let target = CGSize(width: (size.width * scale).rounded(),
                            height: (size.height * scale).rounded())

        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1 // render in pixels, not points
        return UIGraphicsImageRenderer(size: target, format: format).image { _ in
            image.draw(in: CGRect(origin: .zero, size: target))
        }
    }
}
