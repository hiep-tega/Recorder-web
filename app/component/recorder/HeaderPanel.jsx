export function HeaderPanel({
  urlInput,
  onUrlChange,
  onLoad,
  sizeLabel,
  onSizeChange,
  presets,
  isRecording,
  onStartRecord,
  onStopRecord,
  onOpenSettings,
}) {
  return (
    <header className="topbar flex justify-between gap-1 width-full">
      <div className="flex items-center gap-1">
        <input
          value={urlInput}
          onChange={(event) => onUrlChange(event.target.value)}
          placeholder="Enter game URL (e.g. https://example.com/game)"
          className="url-input"
        />
        <button className="action-btn load" onClick={onLoad}>
          Load
        </button>
        <div className="size-select-wrap">
          <label htmlFor="size">Size:</label>
          <select
            id="size"
            value={sizeLabel}
            onChange={(event) => onSizeChange(event.target.value)}
            className="size-select"
          >
            {presets.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>
        <button className="action-btn record" onClick={onStartRecord} disabled={isRecording}>
          Record
        </button>
        <button className="action-btn stop" onClick={onStopRecord} disabled={!isRecording}>
          Stop
        </button>
      </div>
      <div className="flex justify-end">
        <button className="settings-btn" aria-label="settings" onClick={onOpenSettings}>
          ⚙
        </button>
      </div>
    </header>
  );
}
