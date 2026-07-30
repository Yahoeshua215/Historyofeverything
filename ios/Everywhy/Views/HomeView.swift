import SwiftUI

/// Root screen — mirrors app/page.tsx: idle (hero + search + daily cards),
/// loading, result (story + lenses + why engine), and error states, plus
/// navigation to History.
struct HomeView: View {
    @Environment(AppModel.self) private var model
    @State private var showHistory = false

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background
                    .allowsHitTesting(false) // never intercept scroll/tap gestures

                switch model.status {
                case .result:
                    // The click-through experience owns the whole screen — no scrolling.
                    if let result = model.result {
                        ResultView(result: result)
                            .padding(.horizontal, 20)
                            .padding(.bottom, 16)
                    }
                case .idle, .loading, .error:
                    ScrollView {
                        VStack(alignment: .leading, spacing: 26) {
                            switch model.status {
                            case .idle:
                                idle
                            case .loading:
                                loading
                            case .error(let message):
                                errorView(message)
                            default:
                                EmptyView()
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 8)
                        .padding(.bottom, 48)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    if model.status != .idle {
                        Button { model.reset() } label: {
                            GradientText(text: "Everywhy", font: .headline)
                        }
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    HStack(spacing: 10) {
                        ModeTogglePill()
                        Button {
                            showHistory = true
                        } label: {
                            Label(
                                model.history.isEmpty
                                    ? "History"
                                    : "History (\(model.history.count))",
                                systemImage: "clock.arrow.circlepath"
                            )
                            .font(.footnote.weight(.semibold))
                        }
                        .buttonStyle(.bordered)
                        .buttonBorderShape(.capsule)
                    }
                }
            }
            .sheet(isPresented: $showHistory) {
                HistoryListView()
            }
        }
    }

    // MARK: - Idle: hero + capture + search + daily cards

    private var idle: some View {
        VStack(alignment: .leading, spacing: 26) {
            VStack(spacing: 10) {
                GradientText(text: "Everywhy", font: .system(size: 52, weight: .heavy))
                Text("Capture the Why behind everything.")
                    .font(.title3)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 28)

            CaptureButton(prominent: true)

            SearchBar(placeholder: "What are you curious about?")

            DailyCardsView()
        }
    }

    // MARK: - Loading

    private var loading: some View {
        VStack(spacing: 14) {
            Text("🔍").font(.system(size: 40))
            Text("Looking it up…")
                .foregroundStyle(.secondary)
            ProgressView()
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 60)
    }

    // MARK: - Error

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 14) {
            Text("😕").font(.system(size: 40))
            Text(message)
                .foregroundStyle(Theme.danger)
                .multilineTextAlignment(.center)
            Button("Try again") { model.reset() }
                .buttonStyle(.borderedProminent)
                .buttonBorderShape(.capsule)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 60)
    }
}

/// Adult/Kid reading-level toggle (ModeToggle.tsx).
struct ModeTogglePill: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        @Bindable var model = model
        Picker("Mode", selection: $model.mode) {
            Text("Adult").tag(Mode.adult)
            Text("Kid").tag(Mode.kid)
        }
        .pickerStyle(.segmented)
        .frame(width: 130)
    }
}

/// Free-text topic search (SearchBox.tsx).
struct SearchBar: View {
    @Environment(AppModel.self) private var model
    @State private var text = ""
    var placeholder: String

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(.secondary)
            TextField(placeholder, text: $text)
                .textInputAutocapitalization(.never)
                .submitLabel(.search)
                .onSubmit(submit)
            if !text.isEmpty {
                Button(action: submit) {
                    Image(systemName: "arrow.right.circle.fill")
                        .font(.title2)
                        .foregroundStyle(Theme.gradient)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 13)
        .glassCard(cornerRadius: 999)
    }

    private func submit() {
        let term = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !term.isEmpty else { return }
        text = ""
        Task { await model.search(term) }
    }
}
