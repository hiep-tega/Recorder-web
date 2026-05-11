import { useState } from "react";

export function DetailChatPanel({
  selectedRecord,
  isWorking,
  onReanalyze,
  onClearChat,
  onSendPrompt,
}) {
  const [prompt, setPrompt] = useState("");

  if (!selectedRecord) {
    return <p className="empty-list">Select a recording to inspect details.</p>;
  }

  const chatHistory = selectedRecord.chatHistory || [];
  const settings = selectedRecord.settingsSnapshot;

  const handleSubmit = (event) => {
    event.preventDefault();
    const cleaned = prompt.trim();
    if (!cleaned || isWorking) {
      return;
    }
    onSendPrompt(cleaned);
    setPrompt("");
  };

  return (
    <div className="detail-chat-wrap">
      <h3>{selectedRecord.title}</h3>
      <p>{selectedRecord.description}</p>
      <p className="detail-muted">{selectedRecord.aiInsight?.model || "local-heuristic-v1"} - ready</p>

      <div className="detail-actions">
        <button onClick={onReanalyze} disabled={isWorking}>Re-analyze</button>
        <button onClick={onClearChat} disabled={isWorking}>Clear chat</button>
        <a href={selectedRecord.url} target="_blank" rel="noreferrer">Download</a>
      </div>

      {settings && (
        <div className="settings-inline">
          <span>Language: {settings.language}</span>
          <span>Thinking: {settings.enableThinking ? "On" : "Off"}</span>
          <span>Chat Tokens: {settings.maxTokensChat}</span>
        </div>
      )}

      <div className="ai-analysis-block">
        <h4>AI Result</h4>
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
              <p>{message.content}</p>
            </article>
          ))
        )}
      </div>

      <form className="chat-form" onSubmit={handleSubmit}>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="How this thing work? What is workflow from record to save video?"
          rows={3}
        />
        <button type="submit" disabled={isWorking || !prompt.trim()}>
          {isWorking ? "Working..." : "Send"}
        </button>
      </form>
    </div>
  );
}
