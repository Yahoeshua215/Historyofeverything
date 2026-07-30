import SwiftUI

/// The click-through answer experience: one answer front and center, a huge WHY
/// button, swipe (or tap back) through previous answers, and the subject shown
/// small at the top. Card 0 is the initial story; each WHY tap digs one layer.
struct ResultView: View {
    @Environment(AppModel.self) private var model
    let result: IdentifyResult

    @State private var chain: [WhyStep] = []
    @State private var index = 0
    @State private var loading = false
    @State private var errorMessage: String?

    private static let maxChain = 30

    /// Card 0 = the initial answer; cards 1… = the why-chain.
    private var cards: [WhyStep] {
        [WhyStep(question: result.name, answer: result.instantAnswer)] + chain
    }

    private var onLastCard: Bool { index == cards.count - 1 }

    var body: some View {
        VStack(spacing: 0) {
            // Tiny breadcrumb — the initial question, always visible.
            Text("Why does \(result.name) exist?")
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
                .padding(.top, 4)

            // The answer pager — swipe horizontally to revisit previous answers.
            TabView(selection: $index) {
                ForEach(Array(cards.enumerated()), id: \.offset) { i, card in
                    AnswerCard(card: card, isFirst: i == 0)
                        .tag(i)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .animation(.spring(duration: 0.35), value: index)

            // Depth position + back affordance.
            HStack {
                Button {
                    withAnimation(.spring(duration: 0.35)) { index = max(0, index - 1) }
                } label: {
                    Image(systemName: "chevron.left.circle.fill")
                        .font(.title)
                        .foregroundStyle(index == 0 ? AnyShapeStyle(.quaternary) : AnyShapeStyle(Theme.gradient))
                }
                .disabled(index == 0)

                Spacer()

                Text("\(index + 1) / \(cards.count)")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.tertiary)
                    .monospacedDigit()

                Spacer()

                Button {
                    withAnimation(.spring(duration: 0.35)) { index = min(cards.count - 1, index + 1) }
                } label: {
                    Image(systemName: "chevron.right.circle.fill")
                        .font(.title)
                        .foregroundStyle(onLastCard ? AnyShapeStyle(.quaternary) : AnyShapeStyle(Theme.gradient))
                }
                .disabled(onLastCard)
            }
            .padding(.horizontal, 8)
            .padding(.bottom, 10)

            if let errorMessage {
                Text(errorMessage)
                    .font(.footnote)
                    .foregroundStyle(Theme.danger)
                    .padding(.bottom, 6)
            }

            // THE button — large, unmissable.
            if cards.count <= Self.maxChain {
                Button(action: why) {
                    HStack(spacing: 12) {
                        if loading {
                            ProgressView().tint(.white)
                        }
                        Text(loading ? "Digging…" : "WHY?")
                            .font(.system(size: 30, weight: .heavy))
                            .kerning(1)
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 22)
                    .background(Theme.gradient, in: RoundedRectangle(cornerRadius: 26))
                    .shadow(color: Theme.accent.opacity(0.4), radius: 16, y: 8)
                }
                .disabled(loading)
            } else {
                Text("You've reached the bottom of this rabbit hole. 🎉")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .padding(.vertical, 16)
            }
        }
        .frame(maxHeight: .infinity)
    }

    /// Forward through answers you've already seen; fetch a deeper one at the end.
    private func why() {
        errorMessage = nil
        if !onLastCard {
            withAnimation(.spring(duration: 0.35)) { index += 1 }
            return
        }
        guard !loading else { return }
        loading = true
        Task {
            do {
                let step = try await APIClient.shared.deeperWhy(
                    topic: result.name, chain: chain, mode: model.mode
                )
                chain.append(step)
                withAnimation(.spring(duration: 0.35)) { index = cards.count - 1 }
            } catch {
                errorMessage = (error as? APIError)?.message ?? "Couldn't go deeper. Try again."
            }
            loading = false
        }
    }
}

/// One full-screen answer: the question small on top, the answer big and central.
private struct AnswerCard: View {
    let card: WhyStep
    let isFirst: Bool

    var body: some View {
        VStack(spacing: 18) {
            Spacer(minLength: 0)

            if isFirst {
                Text(card.question) // the subject name
                    .font(.title.weight(.bold))
                    .multilineTextAlignment(.center)
            } else {
                Text(card.question)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.accent)
                    .multilineTextAlignment(.center)
            }

            Text(card.answer)
                .font(.system(size: 26, weight: .medium, design: .serif))
                .lineSpacing(6)
                .multilineTextAlignment(.center)
                .minimumScaleFactor(0.6)

            Spacer(minLength: 0)
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .glassCard(cornerRadius: 28)
        .padding(.vertical, 14)
        .padding(.horizontal, 2)
    }
}
