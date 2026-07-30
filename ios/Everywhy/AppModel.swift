import SwiftUI

/// Central state machine mirroring app/page.tsx: idle → loading → result | error,
/// with a stable subject + active lens so the lens bar filters one thing.
@Observable
final class AppModel {
    enum Status: Equatable {
        case idle
        case loading
        case result
        case error(String)
    }

    var status: Status = .idle
    var result: IdentifyResult?
    var mode: Mode {
        didSet { UserDefaults.standard.set(mode.rawValue, forKey: Self.modeKey) }
    }
    var history: [ScanRecord] = []
    /// The stable thing being explored + which lens (if any) is applied to it.
    var subject: String?
    var activeLens: String?

    private static let modeKey = "everywhy.mode"
    private static let historyKey = "everywhy.history"
    private static let maxHistory = 50

    init() {
        let raw = UserDefaults.standard.string(forKey: Self.modeKey)
        mode = raw.flatMap(Mode.init(rawValue:)) ?? .adult
        history = Self.loadHistory()
    }

    // MARK: - Actions

    func reset() {
        status = .idle
        result = nil
        subject = nil
        activeLens = nil
    }

    func identify(imageBase64: String) async {
        status = .loading
        do {
            let data = try await APIClient.shared.identify(imageBase64: imageBase64, mode: mode)
            saveScan(data)
            result = data
            subject = data.name // a fresh scan is the new subject, no lens yet
            activeLens = nil
            status = .result
        } catch {
            fail(error)
        }
    }

    /// Build a story from a text topic — powers search, daily cards, and lenses.
    func explore(topic: String, lens: String?) async {
        status = .loading
        do {
            let data = try await APIClient.shared.explore(topic: topic, lens: lens, mode: mode)
            saveScan(data)
            result = data
            status = .result
        } catch {
            fail(error)
        }
    }

    func search(_ term: String) async {
        subject = term
        activeLens = nil
        await explore(topic: term, lens: nil)
    }

    func selectDaily(_ card: DailyCard) async {
        subject = card.subject
        activeLens = card.category
        await explore(topic: card.subject, lens: card.category)
    }

    /// Re-view the current subject through a lens.
    func applyLens(_ category: Category) async {
        guard let subject else { return }
        activeLens = category.key
        await explore(topic: subject, lens: category.key)
    }

    func openRecord(_ record: ScanRecord) {
        result = record.asResult
        subject = record.name
        activeLens = nil
        status = .result
    }

    func clearHistory() {
        history = []
        UserDefaults.standard.removeObject(forKey: Self.historyKey)
    }

    func captureFailed(_ message: String) {
        status = .error(message)
    }

    // MARK: - Internals

    private func fail(_ error: Error) {
        let message = (error as? APIError)?.message
            ?? APIError(kind: .upstream, isNetwork: false).message
        status = .error(message)
    }

    private func saveScan(_ result: IdentifyResult) {
        let record = ScanRecord(
            id: UUID(),
            name: result.name,
            confidence: result.confidence,
            instantAnswer: result.instantAnswer,
            mode: mode,
            date: Date()
        )
        history.insert(record, at: 0)
        if history.count > Self.maxHistory {
            history = Array(history.prefix(Self.maxHistory))
        }
        if let data = try? JSONEncoder().encode(history) {
            UserDefaults.standard.set(data, forKey: Self.historyKey)
        }
    }

    private static func loadHistory() -> [ScanRecord] {
        guard let data = UserDefaults.standard.data(forKey: historyKey),
              let records = try? JSONDecoder().decode([ScanRecord].self, from: data)
        else { return [] }
        return records
    }
}
