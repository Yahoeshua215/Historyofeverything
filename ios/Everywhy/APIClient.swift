import Foundation

/// Thin async client for the Everywhy Vercel API. The OpenAI key lives server-side;
/// this app only ever talks to our own routes.
struct APIClient {
    static let shared = APIClient()

    private let baseURL = URL(string: "https://historyofeverything.vercel.app")!
    private let session: URLSession

    init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 60
        session = URLSession(configuration: config)
    }

    /// POST /api/identify — base64 JPEG in, story out.
    func identify(imageBase64: String, mode: Mode) async throws -> IdentifyResult {
        try await post(
            path: "/api/identify",
            body: ["image": imageBase64, "mediaType": "image/jpeg", "mode": mode.rawValue]
        )
    }

    /// POST /api/explore — build a story from a text topic, optionally through a lens.
    func explore(topic: String, lens: String?, mode: Mode) async throws -> IdentifyResult {
        var body: [String: Any] = ["topic": topic, "mode": mode.rawValue]
        if let lens { body["lens"] = lens }
        return try await post(path: "/api/explore", body: body)
    }

    /// POST /api/why — one causal layer deeper than the existing chain.
    func deeperWhy(topic: String, chain: [WhyStep], mode: Mode) async throws -> WhyStep {
        let chainPayload = chain.map { ["question": $0.question, "answer": $0.answer] }
        return try await post(
            path: "/api/why",
            body: ["topic": topic, "chain": chainPayload, "mode": mode.rawValue]
        )
    }

    /// POST /api/daily — five "on this date" discovery cards.
    func daily(date: String, mode: Mode) async throws -> [DailyCard] {
        let response: DailyCardsResponse = try await post(
            path: "/api/daily",
            body: ["date": date, "mode": mode.rawValue]
        )
        return response.cards
    }

    // MARK: - Plumbing

    private struct ErrorEnvelope: Codable {
        struct Inner: Codable { let kind: String? }
        let error: Inner?
    }

    private func post<T: Decodable>(path: String, body: [String: Any]) async throws -> T {
        var request = URLRequest(url: baseURL.appendingPathComponent(path))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "content-type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError(kind: nil, isNetwork: true)
        }

        guard let http = response as? HTTPURLResponse else {
            throw APIError(kind: .upstream, isNetwork: false)
        }
        guard (200..<300).contains(http.statusCode) else {
            let envelope = try? JSONDecoder().decode(ErrorEnvelope.self, from: data)
            let kind = envelope?.error?.kind.flatMap(APIErrorKind.init(rawValue:))
            throw APIError(kind: kind ?? .upstream, isNetwork: false)
        }
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw APIError(kind: .upstream, isNetwork: false)
        }
    }
}
