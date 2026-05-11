import { LANGUAGE_OPTIONS } from "./types";

export function SettingsModal({ isOpen, settings, onClose, onChange }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="settings-overlay" onClick={onClose} role="presentation">
      <section
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="settings-head">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose} aria-label="Close settings">
            ×
          </button>
        </div>

        <div className="settings-block">
          <h3>Autopilot</h3>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={settings.autopilot}
              onChange={(event) => onChange({ autopilot: event.target.checked })}
            />
            <span className="switch-indicator" />
            <span className="switch-text">{settings.autopilot ? "On" : "Off"}</span>
          </label>
          <p>Automatically start recording when a game URL is loaded</p>
        </div>

        <div className="settings-block">
          <h3>Language / Ngon ngu</h3>
          <select
            value={settings.language}
            onChange={(event) => onChange({ language: event.target.value })}
            className="settings-select"
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <p>System prompt and analysis language</p>
        </div>

        <div className="settings-block">
          <h3>Enable Thinking</h3>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={settings.enableThinking}
              onChange={(event) => onChange({ enableThinking: event.target.checked })}
            />
            <span className="switch-indicator" />
            <span className="switch-text">{settings.enableThinking ? "On" : "Off"}</span>
          </label>
          <p>Let the model reason step-by-step before answering</p>
        </div>

        <div className="settings-block">
          <h3>Max Tokens (Chat)</h3>
          <div className="range-row">
            <input
              type="range"
              min={64}
              max={8192}
              step={64}
              value={settings.maxTokensChat}
              onChange={(event) =>
                onChange({ maxTokensChat: Number.parseInt(event.target.value, 10) })
              }
            />
            <span>{settings.maxTokensChat}</span>
          </div>
          <p>Maximum response length for chat (64-8192)</p>
        </div>

        <div className="settings-block">
          <h3>Max Tokens (Analyze)</h3>
          <div className="range-row">
            <input
              type="range"
              min={64}
              max={4096}
              step={64}
              value={settings.maxTokensAnalyze}
              onChange={(event) =>
                onChange({ maxTokensAnalyze: Number.parseInt(event.target.value, 10) })
              }
            />
            <span>{settings.maxTokensAnalyze}</span>
          </div>
          <p>Maximum response length for auto-analysis (64-4096)</p>
        </div>
      </section>
    </div>
  );
}
