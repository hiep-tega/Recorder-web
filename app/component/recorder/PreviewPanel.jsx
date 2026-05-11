export function PreviewPanel({ loadedUrl, isRecording, elapsedLabel }) {
  return (
    <section className="preview-stage">
      {loadedUrl ? (
        <iframe
          title="game-preview"
          src={loadedUrl}
          className="game-frame"
          sandbox="allow-scripts allow-forms allow-pointer-lock allow-popups allow-same-origin"
        />
      ) : (
        <div className="empty-state">
          <p>Enter a game URL above and click Load</p>
          <p>Then click Record to start capturing</p>
        </div>
      )}

      {isRecording && (
        <div className="record-chip">
          <span className="dot" /> REC {elapsedLabel}
        </div>
      )}
    </section>
  );
}
