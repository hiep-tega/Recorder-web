import { useState } from "react";

export function DetailChatPanel({
  selectedRecord,
  isWorking,
  onReanalyze,
  onClearChat,
  onSendPrompt,
  onEditTitle,
}) {
  const [prompt, setPrompt] = useState("");

  if (!selectedRecord) {
    return <p className="empty-list">Select a recording to inspect details.</p>;
  }

  const chatHistory = selectedRecord.chatHistory || [];
  const video = selectedRecord.video || {};
  const res = video.width ? `${video.width}×${video.height}` : null;
  const dur = video.duration ? `${video.duration.toFixed(1)}s` : null;

  const handleSubmit = (event) => {
    event.preventDefault();
    const cleaned = prompt.trim();
    if (!cleaned || isWorking) return;
    onSendPrompt(cleaned);
    setPrompt("");
  };

  return (
    <div className="detail-chat-wrap">
      <h3
        style={{ cursor: "pointer" }}
        title="Click to edit title"
        onClick={() => onEditTitle?.(selectedRecord.name)}
      >
        {selectedRecord.title}
      </h3>
      <p>{selectedRecord.description}</p>
      {(res || dur) && (
        <p className="detail-muted">
          {[res, dur, selectedRecord.status].filter(Boolean).join(" · ")}
        </p>
      )}

      <div className="detail-actions">
        <button onClick={onReanalyze} disabled={isWorking}>🔄 Re-analyze</button>
        <button onClick={onClearChat} disabled={isWorking}>🗑 Clear chat</button>
        <a href={selectedRecord.url} download>⬇ Download</a>
      </div>

      <div className="ai-analysis-block">
        <h4>AI Analysis</h4>
        <pre>{selectedRecord.aiInsight?.analysis || "No analysis yet."}</pre>
      </div>

      <div className="chat-history">
        {chatHistory.length === 0 ? (
          <p className="empty-list">Ask a question about this recording to start chat history.</p>
        ) : (
          chatHistory.map((message, idx) => (
            <article
              key={`${message.createdAt}-${idx}`}
              className={message.role === "user" ? "chat-item user" : "chat-item assistant"}
            >
              <div className="chat-role">{message.role === "user" ? "You" : "AI"}</div>
              <p style={{ whiteSpace: "pre-wrap" }}>
                {message.content}
                {message.streaming && <span className="streaming-cursor">▌</span>}
              </p>
            </article>
          ))
        )}
      </div>

      <form className="chat-form" onSubmit={handleSubmit}>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Ask about this recording... (Shift+Enter for new line)"
          rows={3}
          disabled={isWorking}
        />
        <button type="submit" disabled={isWorking || !prompt.trim()}>
          {isWorking ? "Working..." : "Send"}
        </button>
      </form>
    </div>
  );
}
