import Foundation

// Mirrors lib/types.ts — the contract between the Vercel API routes and this app.

/// Reading-level / tone for generated content.
enum Mode: String, Codable, CaseIterable {
    case adult
    case kid
}

/// The story payload returned by /api/identify and /api/explore.
struct IdentifyResult: Codable, Equatable {
    let name: String
    let confidence: Double
    let instantAnswer: String
}

/// One layer of the recursive "But why?" chain (/api/why).
struct WhyStep: Codable, Equatable {
    let question: String
    let answer: String
}

/// One "on this date in history" discovery card (/api/daily).
struct DailyCard: Codable, Equatable, Identifiable {
    let category: String
    let title: String
    let teaser: String
    let subject: String

    var id: String { category + title }
}

struct DailyCardsResponse: Codable {
    let cards: [DailyCard]
}

/// The rabbit-hole lenses a subject can be explored through (lib/categories.ts).
struct Category: Identifiable, Equatable {
    let key: String
    let label: String
    let emoji: String

    var id: String { key }

    static let all: [Category] = [
        Category(key: "history", label: "History", emoji: "📜"),
        Category(key: "science", label: "Science", emoji: "🔬"),
        Category(key: "people", label: "People", emoji: "👤"),
        Category(key: "geography", label: "Geography", emoji: "🌎"),
        Category(key: "economics", label: "Economics", emoji: "💰"),
    ]

    static func forKey(_ key: String?) -> Category? {
        guard let key else { return nil }
        return all.first { $0.key == key }
    }
}

/// A locally-persisted past exploration (lib/history.ts).
struct ScanRecord: Codable, Equatable, Identifiable {
    let id: UUID
    let name: String
    let confidence: Double
    let instantAnswer: String
    let mode: Mode
    let date: Date

    var asResult: IdentifyResult {
        IdentifyResult(name: name, confidence: confidence, instantAnswer: instantAnswer)
    }
}

/// The typed failure modes the API surfaces — mapped to friendly, retryable copy.
enum APIErrorKind: String, Codable {
    case badRequest = "bad_request"
    case unidentifiable
    case refused
    case upstream
}

struct APIError: Error {
    let kind: APIErrorKind?
    let isNetwork: Bool

    /// Friendly messages mirroring app/page.tsx ERROR_MESSAGES.
    var message: String {
        if isNetwork { return "Network problem — check your connection and try again." }
        switch kind {
        case .badRequest: return "Something was off with that image. Try capturing it again."
        case .unidentifiable: return "Couldn't quite identify that. Try a clearer, closer photo."
        case .refused: return "Couldn't analyse that. Try a different subject."
        case .upstream, .none: return "Our service had a hiccup. Give it another try."
        }
    }
}
