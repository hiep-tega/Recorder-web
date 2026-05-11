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
            <p className="empty-list">No recordings yet. Start one to save into the uploads folder.</p>
          ) : (
            records.map((item) => (
              <article
                key={item.name}
                className={item.name === selectedRecord?.name ? "record-item active" : "record-item"}
                onClick={() => onSelectRecord(item.name)}
              >
                <h3>{item.title}</h3>
                <p>{item.aiSummary || item.description}</p>
                <div className="record-meta">{formatTimestamp(item.createdAt)}</div>
                <a href={item.url} target="_blank" rel="noreferrer" className="record-link">
                  Open recording
                </a>
              </article>
            ))
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
          />
        </div>
      )}
    </aside>
  );
}
