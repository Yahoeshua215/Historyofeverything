import SwiftUI

/// Past explorations (HistoryView.tsx) — tap to reopen, or clear the lot.
struct HistoryListView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Group {
                if model.history.isEmpty {
                    ContentUnavailableView(
                        "Nothing yet",
                        systemImage: "clock.arrow.circlepath",
                        description: Text("Things you capture or explore will show up here.")
                    )
                } else {
                    List {
                        ForEach(model.history) { record in
                            Button {
                                model.openRecord(record)
                                dismiss()
                            } label: {
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack {
                                        Text(record.name)
                                            .font(.headline)
                                            .foregroundStyle(.primary)
                                        Spacer()
                                        Text(record.date, style: .date)
                                            .font(.caption)
                                            .foregroundStyle(.tertiary)
                                    }
                                    Text(record.instantAnswer)
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                        .lineLimit(2)
                                }
                                .padding(.vertical, 2)
                            }
                        }
                    }
                    .listStyle(.insetGrouped)
                }
            }
            .navigationTitle("History")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Done") { dismiss() }
                }
                if !model.history.isEmpty {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Clear", role: .destructive) {
                            model.clearHistory()
                        }
                    }
                }
            }
        }
    }
}
