"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FooterStatus } from "./component/recorder/FooterStatus";
import { HeaderPanel } from "./component/recorder/HeaderPanel";
import { PreviewPanel } from "./component/recorder/PreviewPanel";
import { SettingsModal } from "./component/recorder/SettingsModal";
import { SidebarPanel } from "./component/recorder/SidebarPanel";
import {
  DEFAULT_RECORDER_SETTINGS,
  DEVICE_PRESETS,
} from "./component/recorder/types";

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

  useEffect(() => {
    let cancelled = false;

    const fetchRecords = async () => {
      try {
        const response = await fetch("/api/records", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Could not load recordings");
        }
        const data = await response.json();
        if (cancelled) {
          return;
        }
        setRecords(data.records);
        setSelectedRecordName((prev) => prev ?? data.records[0]?.name ?? null);
      } catch {
        if (!cancelled) {
          setStatus("Could not load recordings");
        }
      }
    };

    void fetchRecords();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (!selectedRecordName) {
      return;
    }

    let cancelled = false;

    const fetchDetail = async () => {
      try {
        const response = await fetch(`/api/records/${encodeURIComponent(selectedRecordName)}/meta`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Could not load detail");
        }
        const data = await response.json();
        if (cancelled) {
          return;
        }
        setSelectedDetail(data.detail);
        setRecords((prev) => {
          const idx = prev.findIndex((item) => item.name === data.detail.name);
          if (idx === -1) {
            return prev;
          }
          const next = [...prev];
          next[idx] = { ...next[idx], ...data.detail };
          return next;
        });
      } catch {
        if (!cancelled) {
          setStatus("Could not load detail");
        }
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
    if (isRecording) {
      return;
    }
    try {
      setStatus("Pick the browser tab/window to capture...");
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "browser",
        },
        audio: true,
        preferCurrentTab: true,
        selfBrowserSurface: "include",
      });

      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9,opus",
      });
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: "video/webm" });
          const filename = `record-${Date.now()}.webm`;
          const file = new File([blob], filename, { type: "video/webm" });

          const formData = new FormData();
          formData.append("file", file);
          formData.append("title", `Gameplay ${new Date().toLocaleTimeString()}`);
          formData.append(
            "description",
            loadedUrl
              ? `Captured from ${new URL(loadedUrl).hostname}`
              : "Screen recording",
          );
          formData.append("sourceUrl", loadedUrl || "about:blank");
          formData.append("sizeLabel", sizeLabel);
          formData.append("settingsSnapshot", JSON.stringify(settings));

          const response = await fetch("/api/records", {
            method: "POST",
            body: formData,
          });
          if (!response.ok) {
            throw new Error("Failed to save recording");
          }

          const saved = await response.json();
          setStatus("Recording saved");
          setRecords((prev) => [saved.record, ...prev]);
          setSelectedRecordName(saved.record.name);
          setSelectedDetail(saved.record);
          setActiveTab("recordings");
        } catch {
          setStatus("Failed to save recording");
        } finally {
          stream.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          recorderRef.current = null;
          setIsRecording(false);
          setRecordingStartedAt(null);
          setElapsedMs(0);
        }
      };

      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.start(1000);
      setIsRecording(true);
      setRecordingStartedAt(Date.now());
      setElapsedMs(0);
      setStatus("Recording in progress");
    } catch {
      setStatus("Capture was cancelled or blocked");
      setIsRecording(false);
      setRecordingStartedAt(null);
      setElapsedMs(0);
    }
  };

  const handleStopRecord = () => {
    if (!recorderRef.current || recorderRef.current.state === "inactive") {
      return;
    }
    setStatus("Saving recording...");
    recorderRef.current.stop();
  };

  const updateDetail = (detail) => {
    setSelectedDetail(detail);
    setRecords((prev) => {
      const idx = prev.findIndex((item) => item.name === detail.name);
      if (idx === -1) {
        return prev;
      }
      const next = [...prev];
      next[idx] = { ...next[idx], ...detail };
      return next;
    });
  };

  const handleReanalyze = async () => {
    if (!selectedRecordName) {
      return;
    }
    setIsDetailWorking(true);
    try {
      const response = await fetch(`/api/records/${encodeURIComponent(selectedRecordName)}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settingsSnapshot: settings }),
      });
      if (!response.ok) {
        throw new Error("Failed analyze");
      }
      const data = await response.json();
      updateDetail(data.detail);
      setStatus("Analysis refreshed");
    } catch {
      setStatus("Could not run analysis");
    } finally {
      setIsDetailWorking(false);
    }
  };

  const handleSendPrompt = async (prompt) => {
    if (!selectedRecordName) {
      return;
    }
    setIsDetailWorking(true);
    try {
      const response = await fetch(`/api/records/${encodeURIComponent(selectedRecordName)}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, settingsSnapshot: settings }),
      });
      if (!response.ok) {
        throw new Error("Failed chat");
      }
      const data = await response.json();
      updateDetail(data.detail);
      setStatus("Chat updated");
    } catch {
      setStatus("Could not send chat message");
    } finally {
      setIsDetailWorking(false);
    }
  };

  const handleClearChat = async () => {
    if (!selectedRecordName) {
      return;
    }
    setIsDetailWorking(true);
    try {
      const response = await fetch(`/api/records/${encodeURIComponent(selectedRecordName)}/clear-chat`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed clear chat");
      }
      const data = await response.json();
      updateDetail(data.detail);
      setStatus("Chat cleared");
    } catch {
      setStatus("Could not clear chat");
    } finally {
      setIsDetailWorking(false);
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
