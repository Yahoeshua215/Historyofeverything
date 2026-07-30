import SwiftUI

// The Everywhy design language, ported from app/globals.css — bright, airy,
// glassy, with an indigo→cyan accent gradient.

enum Theme {
    static let accent = Color(red: 0x63 / 255, green: 0x66 / 255, blue: 0xF1 / 255) // #6366f1
    static let accentMid = Color(red: 0x81 / 255, green: 0x8C / 255, blue: 0xF8 / 255) // #818cf8
    static let accentCyan = Color(red: 0x22 / 255, green: 0xD3 / 255, blue: 0xEE / 255) // #22d3ee
    static let danger = Color(red: 0xE0 / 255, green: 0x50 / 255, blue: 0x6A / 255) // #e0506a

    static let gradient = LinearGradient(
        colors: [accent, accentMid, accentCyan],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    /// The soft pastel page background (radial washes over a pale base).
    static var background: some View {
        ZStack {
            Color(red: 0xEE / 255, green: 0xF2 / 255, blue: 0xFB / 255)
            RadialGradient(
                colors: [accent.opacity(0.20), .clear],
                center: .init(x: 0.08, y: -0.08), startRadius: 0, endRadius: 620
            )
            RadialGradient(
                colors: [accentCyan.opacity(0.18), .clear],
                center: .init(x: 1.1, y: 0.06), startRadius: 0, endRadius: 560
            )
            RadialGradient(
                colors: [Color(red: 0.96, green: 0.45, blue: 0.71).opacity(0.14), .clear],
                center: .init(x: 0.5, y: 1.18), startRadius: 0, endRadius: 540
            )
        }
        .ignoresSafeArea()
    }
}

/// Gradient-filled text, the brand wordmark treatment (.hl-gradient-text).
struct GradientText: View {
    let text: String
    var font: Font

    var body: some View {
        Text(text)
            .font(font)
            .fontWeight(.heavy)
            .foregroundStyle(Theme.gradient)
    }
}

/// Frosted glass card treatment (.hl-glass) used across surfaces.
struct GlassCard: ViewModifier {
    var cornerRadius: CGFloat = 20

    func body(content: Content) -> some View {
        content
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: cornerRadius))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .strokeBorder(.white.opacity(0.7), lineWidth: 1)
            )
            .shadow(color: .black.opacity(0.06), radius: 14, y: 6)
    }
}

extension View {
    func glassCard(cornerRadius: CGFloat = 20) -> some View {
        modifier(GlassCard(cornerRadius: cornerRadius))
    }
}
