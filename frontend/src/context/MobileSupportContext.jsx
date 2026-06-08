import { createContext, useContext, useEffect, useMemo, useState } from "react";

const MOBILE_SUPPORT_STORAGE_KEY = "agri-feed-mobile-support-v1";

const MobileSupportContext = createContext(null);

const downloadableGuides = [
  {
    id: "offline-weather-guide",
    title: "Offline Weather Advisory Guide",
    type: "PDF",
    summary: "Daily weather interpretation tips for planting, irrigation, and field safety.",
  },
  {
    id: "offline-pest-guide",
    title: "Pest & Disease Quick Response Guide",
    type: "PDF",
    summary: "Field-ready symptom checks, treatment actions, and prevention routines.",
  },
  {
    id: "offline-recommendations-guide",
    title: "AI Recommendation Field Checklist",
    type: "TXT",
    summary: "Simple offline checklist for planting, fertilization, irrigation, and harvest tasks.",
  },
];

function loadStoredState() {
  try {
    return JSON.parse(localStorage.getItem(MOBILE_SUPPORT_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveStoredState(state) {
  localStorage.setItem(MOBILE_SUPPORT_STORAGE_KEY, JSON.stringify(state));
}

export function MobileSupportProvider({ children }) {
  const stored = useMemo(() => loadStoredState(), []);
  const [browserOnline, setBrowserOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [offlineMode, setOfflineMode] = useState(Boolean(stored.offlineMode));
  const [lowDataMode, setLowDataMode] = useState(Boolean(stored.lowDataMode));
  const [preferredLanguage, setPreferredLanguage] = useState(stored.preferredLanguage || "English");
  const [smsMode, setSmsMode] = useState(stored.smsMode ?? true);
  const [voiceNotes, setVoiceNotes] = useState(stored.voiceNotes || []);
  const [pendingSyncItems, setPendingSyncItems] = useState(stored.pendingSyncItems || []);
  const [lastSyncAt, setLastSyncAt] = useState(stored.lastSyncAt || null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setBrowserOnline(true);
    const handleOffline = () => setBrowserOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    saveStoredState({
      offlineMode,
      lowDataMode,
      preferredLanguage,
      smsMode,
      voiceNotes,
      pendingSyncItems,
      lastSyncAt,
    });
  }, [lastSyncAt, lowDataMode, offlineMode, pendingSyncItems, preferredLanguage, smsMode, voiceNotes]);

  useEffect(() => {
    document.body.classList.toggle("low-data-mode", lowDataMode);
  }, [lowDataMode]);

  const isOffline = offlineMode || !browserOnline;

  const queueSyncItem = (label) => {
    const item = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
      label,
      queuedAt: new Date().toISOString(),
    };
    setPendingSyncItems((current) => [item, ...current].slice(0, 15));
  };

  const syncNow = async () => {
    if (isOffline) return false;
    setSyncing(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setPendingSyncItems([]);
    setLastSyncAt(new Date().toISOString());
    setSyncing(false);
    return true;
  };

  const addVoiceNote = (text) => {
    if (!text?.trim()) return;
    setVoiceNotes((current) => [
      {
        id: `${Date.now()}`,
        text: text.trim(),
        createdAt: new Date().toISOString(),
      },
      ...current,
    ].slice(0, 10));

    if (isOffline) {
      queueSyncItem("Voice field note");
    }
  };

  const downloadGuide = (guide) => {
    const body = [
      guide.title,
      "",
      guide.summary,
      "",
      `Language: ${preferredLanguage}`,
      `Low-data mode: ${lowDataMode ? "Enabled" : "Disabled"}`,
      `Prepared: ${new Date().toLocaleString("en-ZA")}`,
    ].join("\n");

    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${guide.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MobileSupportContext.Provider
      value={{
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
      }}
    >
      {children}
    </MobileSupportContext.Provider>
  );
}

export function useMobileSupport() {
  const context = useContext(MobileSupportContext);
  if (!context) {
    throw new Error("useMobileSupport must be used within a MobileSupportProvider");
  }
  return context;
}
