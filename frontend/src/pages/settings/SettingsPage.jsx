import {
  CloudOff,
  Download,
  Languages,
  Mic,
  MicOff,
  MessageSquareText,
  RadioTower,
  RefreshCw,
  Smartphone,
  Wifi,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMobileSupport } from "../../context/MobileSupportContext";

export function SettingsPage() {
  const {
    browserOnline,
    isOffline,
    offlineMode,
    setOfflineMode,
    lowDataMode,
    setLowDataMode,
    preferredLanguage,
    setPreferredLanguage,
    smsMode,
    setSmsMode,
    voiceNotes,
    addVoiceNote,
    downloadableGuides,
    downloadGuide,
    pendingSyncItems,
    queueSyncItem,
    syncNow,
    syncing,
    lastSyncAt,
  } = useMobileSupport();

  const recognitionRef = useRef(null);
  const [voiceDraft, setVoiceDraft] = useState("");
  const [voiceStatus, setVoiceStatus] = useState("Ready");
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop?.();
    };
  }, []);

  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceStatus("Voice input not supported on this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = preferredLanguage === "Kinyarwanda" ? "rw-RW" : "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceStatus("Listening...");
    };

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      setVoiceDraft((current) => (current ? `${current} ${transcript}` : transcript));
      setVoiceStatus("Voice note captured.");
    };

    recognition.onerror = () => {
      setVoiceStatus("Could not capture voice note.");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoiceInput = () => {
    recognitionRef.current?.stop?.();
    setVoiceStatus("Voice capture stopped.");
    setIsListening(false);
  };

  const saveVoiceNote = () => {
    if (!voiceDraft.trim()) return;
    addVoiceNote(voiceDraft);
    setVoiceDraft("");
    setVoiceStatus(isOffline ? "Saved offline. Pending sync." : "Voice note saved.");
  };

  const saveMobilePreferences = () => {
    queueSyncItem("Mobile and offline preferences");
  };

  return (
    <section className="management-page mobile-settings-page">
      <div className="page-title-block">
        <h1>Mobile &amp; Offline Access</h1>
        <p>Configure offline sync, low-data mode, SMS fallback, local language support, and field-ready downloads.</p>
      </div>

      <div className="mobile-settings-banner-row">
        <article className="mobile-settings-banner-card status">
          <div className="mobile-settings-banner-icon">
            {isOffline ? <CloudOff size={18} /> : <Wifi size={18} />}
          </div>
          <div>
            <strong>{isOffline ? "Offline Mode Active" : "Connected & Ready"}</strong>
            <span>{browserOnline ? "Browser connection detected." : "Browser is currently offline."}</span>
          </div>
        </article>

        <article className="mobile-settings-banner-card sync">
          <div>
            <strong>Pending Sync Queue</strong>
            <span>{pendingSyncItems.length} offline item(s) waiting to sync</span>
          </div>
          <button type="button" className="mobile-settings-sync-button" onClick={syncNow} disabled={isOffline || syncing}>
            <RefreshCw size={15} className={syncing ? "spinning" : ""} />
            <span>{syncing ? "Syncing..." : "Sync Now"}</span>
          </button>
        </article>
      </div>

      <div className="mobile-settings-grid">
        <article className="prototype-panel mobile-settings-main-card">
          <div className="panel-toolbar">
            <h2>Offline &amp; Device Controls</h2>
            <button type="button" className="text-link-button primary" onClick={saveMobilePreferences}>
              Save Offline Profile
            </button>
          </div>

          <div className="mobile-settings-toggle-list">
            <div className="mobile-settings-toggle-row">
              <div>
                <strong>Offline Mode</strong>
                <p>Store changes locally and queue them for sync when the connection is restored.</p>
              </div>
              <button
                type="button"
                className={offlineMode ? "prototype-alert-toggle enabled" : "prototype-alert-toggle"}
                onClick={() => setOfflineMode(!offlineMode)}
                aria-label="Offline Mode"
              >
                <i />
              </button>
            </div>

            <div className="mobile-settings-toggle-row">
              <div>
                <strong>Low-Data Mode</strong>
                <p>Optimize images and text delivery for low-bandwidth networks and low-end smartphones.</p>
              </div>
              <button
                type="button"
                className={lowDataMode ? "prototype-alert-toggle enabled" : "prototype-alert-toggle"}
                onClick={() => setLowDataMode(!lowDataMode)}
                aria-label="Low Data Mode"
              >
                <i />
              </button>
            </div>

            <div className="mobile-settings-toggle-row">
              <div>
                <strong>SMS Fallback</strong>
                <p>Enable SMS-based interaction for farmers without smartphones or data connectivity.</p>
              </div>
              <button
                type="button"
                className={smsMode ? "prototype-alert-toggle enabled" : "prototype-alert-toggle"}
                onClick={() => setSmsMode(!smsMode)}
                aria-label="SMS Fallback"
              >
                <i />
              </button>
            </div>
          </div>

          <div className="mobile-settings-form-grid">
            <label className="mobile-settings-field">
              <span>Preferred Language</span>
              <select value={preferredLanguage} onChange={(event) => setPreferredLanguage(event.target.value)}>
                <option>English</option>
                <option>Kinyarwanda</option>
                <option>French</option>
                <option>Swahili</option>
              </select>
            </label>

            <div className="mobile-settings-feature-pill-row">
              <span className="mobile-settings-feature-pill"><Smartphone size={15} /> Low-end smartphone ready</span>
              <span className="mobile-settings-feature-pill"><MessageSquareText size={15} /> SMS interaction enabled</span>
              <span className="mobile-settings-feature-pill"><Languages size={15} /> Local language support</span>
            </div>
          </div>
        </article>

        <aside className="prototype-panel mobile-settings-side-card">
          <div className="panel-toolbar">
            <h2>Sync Snapshot</h2>
            <RadioTower size={16} color="#1ea4ff" />
          </div>

          <div className="mobile-settings-meta-grid">
            <div>
              <span>Network State</span>
              <strong>{browserOnline ? "Online" : "Offline"}</strong>
            </div>
            <div>
              <span>Current Mode</span>
              <strong>{isOffline ? "Offline-ready" : "Live Sync"}</strong>
            </div>
            <div>
              <span>Pending Queue</span>
              <strong>{pendingSyncItems.length} item(s)</strong>
            </div>
            <div>
              <span>Last Sync</span>
              <strong>{lastSyncAt ? new Date(lastSyncAt).toLocaleString("en-ZA") : "Not yet synced"}</strong>
            </div>
          </div>
        </aside>
      </div>

      <div className="mobile-settings-grid lower">
        <article className="prototype-panel mobile-settings-main-card">
          <div className="panel-toolbar">
            <h2>Voice Input for Data Logging</h2>
            <button type="button" className="text-link-button primary" onClick={saveVoiceNote}>
              Save Voice Note
            </button>
          </div>

          <div className="mobile-settings-voice-actions">
            <button type="button" className="toolbar-button primary" onClick={startVoiceInput} disabled={isListening}>
              <Mic size={16} />
              <span>Start Voice Input</span>
            </button>
            <button type="button" className="toolbar-button secondary" onClick={stopVoiceInput} disabled={!isListening}>
              <MicOff size={16} />
              <span>Stop</span>
            </button>
            <span className="mobile-settings-voice-status">{voiceStatus}</span>
          </div>

          <textarea
            className="mobile-settings-voice-textarea"
            value={voiceDraft}
            onChange={(event) => setVoiceDraft(event.target.value)}
            placeholder="Record or type field notes, symptom logs, irrigation updates, or market observations..."
          />

          <div className="mobile-settings-note-list">
            {voiceNotes.map((note) => (
              <article key={note.id} className="mobile-settings-note-card">
                <strong>{new Date(note.createdAt).toLocaleString("en-ZA")}</strong>
                <p>{note.text}</p>
              </article>
            ))}
          </div>
        </article>

        <aside className="prototype-panel mobile-settings-side-card">
          <div className="panel-toolbar">
            <h2>Downloadable Offline Guides</h2>
            <Download size={16} color="#1ea4ff" />
          </div>

          <div className="mobile-settings-guide-list">
            {downloadableGuides.map((guide) => (
              <div key={guide.id} className="mobile-settings-guide-card">
                <div>
                  <strong>{guide.title}</strong>
                  <p>{guide.summary}</p>
                </div>
                <button type="button" className="toolbar-button primary full-width" onClick={() => downloadGuide(guide)}>
                  <Download size={15} />
                  <span>Download {guide.type}</span>
                </button>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
