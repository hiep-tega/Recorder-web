import { DetailChatPanel } from "./DetailChatPanel";

export function SidebarPanel({
  activeTab,
  onTabChange,
  records,
  selectedRecord,
  onSelectRecord,
  formatTimestamp,
  isWorking,
  onReanalyze,
  onClearChat,
  onSendPrompt,
  onDeleteRecord,
  onRenameRecord,
  onEditTitle,
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-tabs">
        <button
          className={activeTab === "recordings" ? "tab active" : "tab"}
          onClick={() => onTabChange("recordings")}
        >
          Recordings
        </button>
        <button
          className={activeTab === "detail" ? "tab active" : "tab"}
          onClick={() => onTabChange("detail")}
        >
          Detail / Chat
        </button>
      </div>

      {activeTab === "recordings" ? (
        <div className="record-list">
          {records.length === 0 ? (
            <p className="empty-list">No recordings yet.</p>
          ) : (
            records.map((item) => {
              const statusCls =
                item.status === "analyzing"
                  ? "rec-status analyzing"
                  : item.status === "ready"
                    ? "rec-status ready"
                    : item.status === "error"
                      ? "rec-status error"
                      : "rec-status";
              const statusText =
                item.status === "analyzing"
                  ? " Analyzing..."
                  : item.status === "error"
                    ? "Error"
                    : item.aiSummary
                      ? item.aiSummary.substring(0, 60) + (item.aiSummary.length > 60 ? "…" : "")
                      : item.description || "New";

              return (
                <article
                  key={item.name}
                  className={item.name === selectedRecord?.name ? "record-item active" : "record-item"}
                  onClick={() => onSelectRecord(item.name)}
                >
                  <div className="record-info">
                    <h3>{item.title}</h3>
                    <p className={statusCls}>{statusText}</p>
                    {item.createdAt && (
                      <div className="record-meta">{formatTimestamp(item.createdAt)}</div>
                    )}
                  </div>
                  <div className="record-actions" onClick={(e) => e.stopPropagation()}>
                    <a
                      href={item.url}
                      download
                      className="btn-icon"
                      title="Download"
                    >
                      ⬇
                    </a>
                    <button
                      className="btn-icon"
                      title="Rename"
                      onClick={() => onRenameRecord?.(item.name)}
                    >
                      ✎
                    </button>
                    <button
                      className="btn-icon del"
                      title="Delete"
                      onClick={() => onDeleteRecord?.(item.name)}
                    >
                      ×
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      ) : (
        <div className="detail-panel">
          <DetailChatPanel
            selectedRecord={selectedRecord}
            isWorking={isWorking}
            onReanalyze={onReanalyze}
            onClearChat={onClearChat}
            onSendPrompt={onSendPrompt}
            onEditTitle={onEditTitle}
          />
        </div>
      )}
    </aside>
  );
}
