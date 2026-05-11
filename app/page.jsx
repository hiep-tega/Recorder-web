"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FooterStatus } from "./component/recorder/FooterStatus";
import { HeaderPanel } from "./component/recorder/HeaderPanel";
import { PreviewPanel } from "./component/recorder/PreviewPanel";
import { SettingsModal } from "./component/recorder/SettingsModal";
import { SidebarPanel } from "./component/recorder/SidebarPanel";
import {
  DEFAULT_RECORDER_SETTINGS,
  DEVICE_PRESETS,
} from "./component/recorder/types";

const REMOTE_HOST =
  process.env.NEXT_PUBLIC_REMOTE_HOST?.replace(/\/+$/, "") ||
  "https://a374a6682ea8badf9b.gradio.live";

const SETTINGS_STORAGE_KEY = "recorder.settings.v1";

function getInitialSettings() {
  if (typeof window === "undefined") {
    return DEFAULT_RECORDER_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_RECORDER_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_RECORDER_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_RECORDER_SETTINGS;
  }
}

function normalizeUrl(input) {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function formatTimestamp(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }
  return date.toLocaleString();
}

function elapsedLabel(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

/** Transform a remote recordings-list entry to the local shape */
function remoteToListItem(v) {
  return {
    name: v.filename,
    title: v.title || v.filename,
    description: v.summary || "",
    aiSummary: v.summary || "",
    status: v.status || "new",
    url: `${REMOTE_HOST}/recordings/${encodeURIComponent(v.filename)}`,
    createdAt: null,
  };
}

/** Transform remote detail info + chat history to the local shape */
function remoteToDetail(filename, info, chatHistory) {
  return {
    name: filename,
    title: info.title || filename,
    description: info.summary || "No summary yet.",
    aiSummary: info.summary || "",
    status: info.status || "new",
    url: `${REMOTE_HOST}/recordings/${encodeURIComponent(filename)}`,
    video: info.video || {},
    chatHistory: (chatHistory || []).map((m, i) => ({
      role: m.role,
      content: m.content,
      createdAt: new Date(Date.now() - (chatHistory.length - i) * 500).toISOString(),
    })),
    aiInsight: {
      model: "Claude AI",
      analysis: info.summary || "No analysis yet.",
    },
  };
}

export default function Home() {
  const [urlInput, setUrlInput] = useState("");
  const [loadedUrl, setLoadedUrl] = useState("");
  const [sizeLabel, setSizeLabel] = useState(DEVICE_PRESETS[0].value);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [records, setRecords] = useState([]);
  const [activeTab, setActiveTab] = useState("recordings");
  const [selectedRecordName, setSelectedRecordName] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [recordingStartedAt, setRecordingStartedAt] = useState(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(getInitialSettings);
  const [isDetailWorking, setIsDetailWorking] = useState(false);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const pollTimerRef = useRef(null);

  const selectedRecord = useMemo(() => {
    const fromList = records.find((item) => item.name === selectedRecordName) ?? records[0] ?? null;
    if (!fromList) {
      return null;
    }
    if (selectedDetail?.name === fromList.name) {
      return { ...fromList, ...selectedDetail };
    }
    return fromList;
  }, [records, selectedRecordName, selectedDetail]);

  // ── Load recordings from remote server ─────────────────────────────────────
  const loadRecordings = useCallback(async () => {
    try {
      const resp = await fetch(`${REMOTE_HOST}/recordings`, { cache: "no-store" });
      if (!resp.ok) throw new Error("Could not load recordings");
      const items = await resp.json();
      const mapped = Array.isArray(items) ? items.map(remoteToListItem) : [];
      setRecords(mapped);
      setSelectedRecordName((prev) => prev ?? mapped[0]?.name ?? null);

      const hasAnalyzing = mapped.some((r) => r.status === "analyzing");
      if (hasAnalyzing && !pollTimerRef.current) {
        pollTimerRef.current = setInterval(loadRecordings, 3000);
      } else if (!hasAnalyzing && pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    } catch {
      setStatus("Could not load recordings");
    }
  }, []);

  useEffect(() => {
    void loadRecordings();
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [loadRecordings]);

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // ── Load detail when selection changes ─────────────────────────────────────
  useEffect(() => {
    if (!selectedRecordName) return;
    let cancelled = false;

    const fetchDetail = async () => {
      try {
        const [infoResp, chatResp] = await Promise.all([
          fetch(`${REMOTE_HOST}/api/video/${encodeURIComponent(selectedRecordName)}`, { cache: "no-store" }),
          fetch(`${REMOTE_HOST}/api/video/${encodeURIComponent(selectedRecordName)}/chat`, { cache: "no-store" }),
        ]);
        if (!infoResp.ok) throw new Error("Could not load detail");
        const info = await infoResp.json();
        const chatHistory = chatResp.ok ? await chatResp.json() : [];
        if (cancelled) return;
        const detail = remoteToDetail(selectedRecordName, info, chatHistory);
        setSelectedDetail(detail);
        setRecords((prev) => {
          const idx = prev.findIndex((r) => r.name === selectedRecordName);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], ...remoteToListItem({ filename: selectedRecordName, ...info }) };
          return next;
        });
      } catch {
        if (!cancelled) setStatus("Could not load detail");
      }
    };

    void fetchDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedRecordName]);

  useEffect(() => {
    if (!isRecording || !recordingStartedAt) {
      return;
    }
    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - recordingStartedAt);
    }, 250);
    return () => window.clearInterval(timer);
  }, [isRecording, recordingStartedAt]);

  const handleLoad = () => {
    const normalized = normalizeUrl(urlInput);
    if (!normalized) {
      setStatus("Enter a game URL first");
      return;
    }
    setLoadedUrl(normalized);
    setStatus("Game loaded");
  };

  const handleStartRecord = async () => {
    if (isRecording) return;
    try {
      setStatus("Pick the browser tab/window to capture...");

      const opts = {
        video: { displaySurface: "browser", frameRate: { ideal: 30 } },
        audio: true,
        preferCurrentTab: true,
      };
      try { opts.systemAudio = "include"; } catch (_) {}

      const stream = await navigator.mediaDevices.getDisplayMedia(opts);

      // Attempt to crop to just the game iframe
      const iframe = document.getElementById("gameIframe");
      let cropped = false;
      if (iframe && typeof CropTarget !== "undefined") {
        try {
          const ct = await CropTarget.fromElement(iframe);
          await stream.getVideoTracks()[0].cropTo(ct);
          cropped = true;
        } catch (_) {}
      }

      const hasAudio = stream.getAudioTracks().length > 0;
      setStatus(`Recording ${cropped ? "iframe" : "tab"}${hasAudio ? " with audio" : " (no audio)"}...`);

      let mimeType = "video/webm";
      if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus"))
        mimeType = "video/webm;codecs=vp9,opus";
      else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus"))
        mimeType = "video/webm;codecs=vp8,opus";

      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        try {
          if (!chunksRef.current.length) { setStatus("No data recorded."); return; }
          const blob = new Blob(chunksRef.current, { type: chunksRef.current[0].type || "video/webm" });
          const sizeMB = (blob.size / 1024 / 1024).toFixed(1);
          setStatus(`Converting (${sizeMB} MB)...`);

          const fd = new FormData();
          fd.append("video", blob, "recording.webm");
          const resp = await fetch(`${REMOTE_HOST}/convert`, { method: "POST", body: fd });
          const data = await resp.json();
          if (!resp.ok) throw new Error(data.error || "Conversion failed");

          setStatus(`Saved: ${data.filename} — AI analyzing...`);
          await loadRecordings();
          setSelectedRecordName(data.filename);
          setSelectedDetail(null);
          setActiveTab("recordings");
        } catch (err) {
          setStatus("Error: " + err.message);
        } finally {
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          recorderRef.current = null;
          setIsRecording(false);
          setRecordingStartedAt(null);
          setElapsedMs(0);
        }
      };

      // Handle user stopping screen share via browser UI
      stream.getVideoTracks()[0].onended = () => {
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
          recorderRef.current.stop();
        }
      };

      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.start(1000);
      setIsRecording(true);
      setRecordingStartedAt(Date.now());
      setElapsedMs(0);
    } catch (err) {
      setStatus(err.name === "NotAllowedError" ? "Recording cancelled." : "Error: " + err.message);
      setIsRecording(false);
      setRecordingStartedAt(null);
      setElapsedMs(0);
    }
  };

  const handleStopRecord = () => {
    if (!recorderRef.current || recorderRef.current.state === "inactive") return;
    setStatus("Saving recording...");
    recorderRef.current.stop();
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
  };

  // ── Re-analyze ──────────────────────────────────────────────────────────────
  const handleReanalyze = async () => {
    if (!selectedRecordName) return;
    setIsDetailWorking(true);
    try {
      await fetch(`${REMOTE_HOST}/api/video/${encodeURIComponent(selectedRecordName)}/analyze`, {
        method: "POST",
      });
      setStatus("Re-analyzing " + selectedRecordName + "...");
      await loadRecordings();
      setSelectedDetail(null);
    } catch {
      setStatus("Could not run analysis");
    } finally {
      setIsDetailWorking(false);
    }
  };

  // ── Send chat prompt with SSE streaming ─────────────────────────────────────
  const handleSendPrompt = async (prompt) => {
    if (!selectedRecordName || !prompt.trim()) return;
    setIsDetailWorking(true);

    const now = new Date().toISOString();
    const userMsg = { role: "user", content: prompt, createdAt: now };
    const aiPlaceholder = { role: "assistant", content: "", createdAt: now, streaming: true };

    setSelectedDetail((prev) => ({
      ...prev,
      chatHistory: [...(prev?.chatHistory ?? []), userMsg, aiPlaceholder],
    }));

    try {
      const resp = await fetch(
        `${REMOTE_HOST}/api/video/${encodeURIComponent(selectedRecordName)}/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: prompt }),
        },
      );

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let rawAnswer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.token) {
              rawAnswer += data.token;
              setSelectedDetail((prev) => {
                if (!prev) return prev;
                const history = [...(prev.chatHistory ?? [])];
                const last = history[history.length - 1];
                if (last?.role === "assistant") {
                  history[history.length - 1] = { ...last, content: rawAnswer };
                }
                return { ...prev, chatHistory: history };
              });
            }
            if (data.done || data.error) {
              const finalContent = data.error
                ? rawAnswer + `\n[Error: ${data.error}]`
                : rawAnswer;
              setSelectedDetail((prev) => {
                if (!prev) return prev;
                const history = [...(prev.chatHistory ?? [])];
                const last = history[history.length - 1];
                if (last?.role === "assistant") {
                  history[history.length - 1] = { ...last, content: finalContent, streaming: false };
                }
                return { ...prev, chatHistory: history };
              });
            }
          } catch (_) {}
        }
      }
    } catch (err) {
      setStatus("Chat error: " + err.message);
      setSelectedDetail((prev) => {
        if (!prev) return prev;
        const history = [...(prev.chatHistory ?? [])];
        const last = history[history.length - 1];
        if (last?.role === "assistant" && last.streaming) {
          history[history.length - 1] = {
            ...last,
            content: last.content || "[Error sending message]",
            streaming: false,
          };
        }
        return { ...prev, chatHistory: history };
      });
    } finally {
      setIsDetailWorking(false);
    }
  };

  // ── Clear chat ───────────────────────────────────────────────────────────────
  const handleClearChat = async () => {
    if (!selectedRecordName) return;
    if (!window.confirm("Clear all chat history for this recording?")) return;
    setIsDetailWorking(true);
    try {
      await fetch(`${REMOTE_HOST}/api/video/${encodeURIComponent(selectedRecordName)}/chat`, {
        method: "DELETE",
      });
      setSelectedDetail((prev) => (prev ? { ...prev, chatHistory: [] } : prev));
      setStatus("Chat cleared");
    } catch {
      setStatus("Could not clear chat");
    } finally {
      setIsDetailWorking(false);
    }
  };

  // ── Delete recording ─────────────────────────────────────────────────────────
  const handleDeleteRecord = async (name) => {
    if (!window.confirm("Delete " + name + "?")) return;
    try {
      const resp = await fetch(`${REMOTE_HOST}/recordings/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      if (!resp.ok) {
        const d = await resp.json();
        throw new Error(d.error);
      }
      if (selectedRecordName === name) {
        setSelectedRecordName(null);
        setSelectedDetail(null);
      }
      setStatus("Deleted: " + name);
      void loadRecordings();
    } catch (err) {
      setStatus("Error: " + err.message);
    }
  };

  // ── Rename recording ─────────────────────────────────────────────────────────
  const handleRenameRecord = async (name) => {
    const baseName = name.replace(/\.mp4$/i, "");
    const newBase = window.prompt("Rename recording:", baseName);
    if (!newBase || newBase === baseName) return;
    const newName = newBase.endsWith(".mp4") ? newBase : newBase + ".mp4";
    try {
      const resp = await fetch(`${REMOTE_HOST}/recordings/${encodeURIComponent(name)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newName }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Rename failed");
      if (selectedRecordName === name) setSelectedRecordName(data.filename);
      setStatus("Renamed to: " + data.filename);
      void loadRecordings();
    } catch (err) {
      setStatus("Error: " + err.message);
    }
  };

  // ── Edit title ───────────────────────────────────────────────────────────────
  const handleEditTitle = async (name) => {
    const current = selectedRecord?.title || name;
    const newTitle = window.prompt("Edit title:", current);
    if (!newTitle || newTitle === current) return;
    try {
      await fetch(`${REMOTE_HOST}/api/video/${encodeURIComponent(name)}/title`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      setSelectedDetail((prev) => (prev ? { ...prev, title: newTitle } : prev));
      setRecords((prev) => prev.map((r) => (r.name === name ? { ...r, title: newTitle } : r)));
      setStatus("Title updated");
    } catch (err) {
      setStatus("Error: " + err.message);
    }
  };

  return (
    <div className="recorder-shell">
      <HeaderPanel
        urlInput={urlInput}
        onUrlChange={setUrlInput}
        onLoad={handleLoad}
        sizeLabel={sizeLabel}
        onSizeChange={setSizeLabel}
        presets={DEVICE_PRESETS}
        isRecording={isRecording}
        onStartRecord={handleStartRecord}
        onStopRecord={handleStopRecord}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="stage-layout">
        <PreviewPanel
          loadedUrl={loadedUrl}
          isRecording={isRecording}
          elapsedLabel={elapsedLabel(elapsedMs)}
        />
        <SidebarPanel
          activeTab={activeTab}
          onTabChange={setActiveTab}
          records={records}
          selectedRecord={selectedRecord}
          onSelectRecord={(name) => {
            setSelectedRecordName(name);
            setSelectedDetail(null);
          }}
          formatTimestamp={formatTimestamp}
          isWorking={isDetailWorking}
          onReanalyze={handleReanalyze}
          onClearChat={handleClearChat}
          onSendPrompt={handleSendPrompt}
          onDeleteRecord={handleDeleteRecord}
          onRenameRecord={handleRenameRecord}
          onEditTitle={handleEditTitle}
        />
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onChange={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
      />

      <FooterStatus status={status} savedCount={records.length} />
    </div>
  );
}
