import SwiftUI

/// Five "on this date in history" discovery cards (DailyCards.tsx), one per
/// rabbit-hole category. Tapping one explores its subject through that lens.
struct DailyCardsView: View {
    @Environment(AppModel.self) private var model
    @State private var cards: [DailyCard] = []
    @State private var failed = false
    @State private var loadedForMode: Mode?

    private var monthDay: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US")
        formatter.dateFormat = "MMMM d"
        return formatter.string(from: Date())
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Today, \(monthDay)".uppercased())
                .font(.caption.weight(.bold))
                .kerning(1)
                .foregroundStyle(.secondary)

            if cards.isEmpty && !failed {
                HStack(spacing: 10) {
                    ProgressView()
                    Text("Finding today's stories…")
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 24)
            } else if failed {
                Button("Couldn't load today's cards — tap to retry") {
                    Task { await load(force: true) }
                }
                .font(.footnote)
                .foregroundStyle(.secondary)
            } else {
                ForEach(cards) { card in
                    Button {
                        Task { await model.selectDaily(card) }
                    } label: {
                        DailyCardRow(card: card)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .task(id: model.mode) {
            await load(force: false)
        }
    }

    private func load(force: Bool) async {
        if !force, loadedForMode == model.mode, !cards.isEmpty { return }
        failed = false
        if force { cards = [] }
        do {
            cards = try await APIClient.shared.daily(date: monthDay, mode: model.mode)
            loadedForMode = model.mode
        } catch {
            failed = true
        }
    }
}

private struct DailyCardRow: View {
    let card: DailyCard

    private var category: Category? { Category.forKey(card.category) }

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            Text(category?.emoji ?? "✨")
                .font(.title2)
            VStack(alignment: .leading, spacing: 4) {
                Text(card.title)
                    .font(.headline)
                    .foregroundStyle(.primary)
                Text(card.teaser)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
            Image(systemName: "chevron.right")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.tertiary)
                .padding(.top, 6)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassCard()
        .multilineTextAlignment(.leading)
    }
}
