import {
  Cloud,
  CloudOff,
  Download,
  FileText,
  Languages,
  Mic,
  MicOff,
  MessageSquareText,
  RadioTower,
  RefreshCw,
  Save,
  Smartphone,
  Wifi,
  WifiOff,
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
    voiceNotes = [],
    addVoiceNote,
    downloadableGuides = [],
    downloadGuide,
    pendingSyncItems = [],
    queueSyncItem,
    syncNow,
    syncing = false,
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
    <section className="st-page">
      <div className="st-header">
        <div className="st-header-left">
          <h1>Mobile &amp; Offline Access</h1>
          <p>Configure offline synchronization, language support, downloadable guides and offline farmer tools.</p>
        </div>
        <div className="st-header-icon">
          <Smartphone size={26} />
        </div>
      </div>

      <div className="st-sync-grid">
        <article className="st-sync-card">
          <div className={`st-sync-icon ${browserOnline ? 'green' : 'amber'}`}>
            {browserOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
          </div>
          <div className="st-sync-info">
            <span>Network Status</span>
            <strong>{browserOnline ? "Online" : "Offline"}</strong>
            <span className={`st-sync-badge ${browserOnline ? 'green' : 'slate'}`}>{browserOnline ? "Connected" : "Disconnected"}</span>
          </div>
        </article>
        <article className="st-sync-card">
          <div className={`st-sync-icon ${isOffline ? 'amber' : 'green'}`}>
            {isOffline ? <CloudOff size={20} /> : <Cloud size={20} />}
          </div>
          <div className="st-sync-info">
            <span>Current Mode</span>
            <strong>{isOffline ? "Offline-ready" : "Live Sync"}</strong>
            <span className={`st-sync-badge ${isOffline ? 'slate' : 'green'}`}>{isOffline ? "Offline" : "Active"}</span>
          </div>
        </article>
        <article className="st-sync-card">
          <div className="st-sync-icon slate">
            <RefreshCw size={20} />
          </div>
          <div className="st-sync-info">
            <span>Pending Queue</span>
            <strong>{pendingSyncItems.length} item{pendingSyncItems.length !== 1 ? 's' : ''}</strong>
            <span className={`st-sync-badge ${pendingSyncItems.length > 0 ? 'amber' : 'green'}`}>{pendingSyncItems.length > 0 ? "Pending" : "Empty"}</span>
          </div>
        </article>
        <article className="st-sync-card">
          <div className="st-sync-icon green">
            <RadioTower size={20} />
          </div>
          <div className="st-sync-info">
            <span>Last Sync</span>
            <strong>{lastSyncAt ? new Date(lastSyncAt).toLocaleString("en-ZA") : "Not yet synced"}</strong>
            <span className="st-sync-badge green">{lastSyncAt ? "Synced" : "Never"}</span>
          </div>
        </article>
      </div>

      <div className="st-main-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <article className="st-card">
            <div className="st-card-header">
              <h2>Offline &amp; Device Controls</h2>
              <button type="button" className="st-btn primary" onClick={saveMobilePreferences}>
                <Download size={18} />
                <span>Save Offline Profile</span>
              </button>
            </div>

            <div className="st-toggle-row">
              <div className="st-toggle-icon">{isOffline ? <CloudOff size={22} /> : <Cloud size={22} />}</div>
              <div className="st-toggle-body">
                <strong>Offline Mode</strong>
                <p>Store changes locally and queue them for sync when the connection is restored.</p>
              </div>
              <button type="button" className={`st-toggle-switch ${offlineMode ? 'active' : ''}`} onClick={() => setOfflineMode(!offlineMode)} aria-label="Offline Mode" role="switch" aria-checked={offlineMode}>
                <i />
              </button>
            </div>

            <div className="st-toggle-row">
              <div className="st-toggle-icon"><Smartphone size={22} /></div>
              <div className="st-toggle-body">
                <strong>Low-Data Mode</strong>
                <p>Optimize images and text delivery for low-bandwidth networks and low-end smartphones.</p>
              </div>
              <button type="button" className={`st-toggle-switch ${lowDataMode ? 'active' : ''}`} onClick={() => setLowDataMode(!lowDataMode)} aria-label="Low Data Mode" role="switch" aria-checked={lowDataMode}>
                <i />
              </button>
            </div>

            <div className="st-toggle-row">
              <div className="st-toggle-icon"><MessageSquareText size={22} /></div>
              <div className="st-toggle-body">
                <strong>SMS Fallback</strong>
                <p>Enable SMS-based interaction for farmers without smartphones or data connectivity.</p>
              </div>
              <button type="button" className={`st-toggle-switch ${smsMode ? 'active' : ''}`} onClick={() => setSmsMode(!smsMode)} aria-label="SMS Fallback" role="switch" aria-checked={smsMode}>
                <i />
              </button>
            </div>

            <div className="st-form-row">
              <label>Preferred Language</label>
              <select className="st-select" value={preferredLanguage} onChange={(event) => setPreferredLanguage(event.target.value)}>
                <option>English</option>
                <option>Kinyarwanda</option>
                <option>French</option>
                <option>Swahili</option>
              </select>
            </div>

            <div className="st-badge-row">
              <span className="st-badge"><Smartphone size={15} /> Low-end smartphone ready</span>
              <span className="st-badge"><MessageSquareText size={15} /> SMS enabled</span>
              <span className="st-badge"><Languages size={15} /> Local language support</span>
              <span className="st-badge"><CloudOff size={15} /> Offline ready</span>
            </div>
          </article>

          <article className="st-card">
            <div className="st-card-header">
              <h2>Voice Input for Data Logging</h2>
              <button type="button" className="st-btn primary" onClick={saveVoiceNote}>
                <Save size={18} />
                <span>Save Voice Note</span>
              </button>
            </div>
            <div className="st-voice-card">
              <div className="st-mic-row">
                <button type="button" className={`st-mic-btn ${isListening ? 'listening' : 'idle'}`} onClick={isListening ? stopVoiceInput : startVoiceInput} aria-label={isListening ? 'Stop recording' : 'Start recording'}>
                  {isListening ? <MicOff size={26} /> : <Mic size={26} />}
                </button>
                <span className="st-mic-status">{voiceStatus}</span>
                {isListening ? <span className="st-mic-timer">● Recording...</span> : null}
              </div>
              <textarea className="st-textarea" value={voiceDraft} onChange={(event) => setVoiceDraft(event.target.value)} placeholder="Record or type field notes, symptom logs, irrigation updates, or market observations..." />
            </div>
            {voiceNotes.length > 0 ? (
              <div className="st-note-list">
                {voiceNotes.map((note) => (
                  <div key={note.id} className="st-note-card">
                    <strong>{new Date(note.createdAt).toLocaleString("en-ZA")}</strong>
                    <p>{note.text}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <article className="st-card">
            <div className="st-card-header">
              <h2>Sync Snapshot</h2>
              <RadioTower size={22} color="var(--primary-green)" />
            </div>
            <div className="st-sync-info-grid">
              <div className="st-sync-info-item">
                <span>Network State</span>
                <strong>{browserOnline ? "Online" : "Offline"}</strong>
              </div>
              <div className="st-sync-info-item">
                <span>Current Mode</span>
                <strong>{isOffline ? "Offline-ready" : "Live Sync"}</strong>
              </div>
              <div className="st-sync-info-item">
                <span>Pending Queue</span>
                <strong>{pendingSyncItems.length} item(s)</strong>
              </div>
              <div className="st-sync-info-item">
                <span>Last Sync</span>
                <strong>{lastSyncAt ? new Date(lastSyncAt).toLocaleString("en-ZA") : "Not yet synced"}</strong>
              </div>
            </div>
            <button type="button" className="st-btn secondary full" onClick={syncNow} disabled={isOffline || syncing}>
              <RefreshCw size={18} className={syncing ? "spinning" : ""} />
              <span>{syncing ? "Syncing..." : "Sync Now"}</span>
            </button>
          </article>

          <article className="st-card">
            <div className="st-card-header">
              <h2>Downloadable Offline Guides</h2>
              <Download size={22} color="var(--primary-green)" />
            </div>
            <div className="st-guide-list">
              {downloadableGuides.map((guide) => (
                <div key={guide.id} className="st-guide-card">
                  <div className="st-guide-icon"><FileText size={20} /></div>
                  <div className="st-guide-body">
                    <strong>{guide.title}</strong>
                    <span>{guide.summary}</span>
                  </div>
                  <button type="button" className="st-btn secondary" onClick={() => downloadGuide(guide)}>
                    <Download size={15} />
                    <span>{guide.type}</span>
                  </button>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </div>
    </section>
  );
}
