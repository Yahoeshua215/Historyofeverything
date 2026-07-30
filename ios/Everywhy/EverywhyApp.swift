import SwiftUI

@main
struct EverywhyApp: App {
    @State private var model = AppModel()

    var body: some Scene {
        WindowGroup {
            HomeView()
                .environment(model)
                .tint(Theme.accent)
        }
    }
}
