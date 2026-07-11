import {
  Bell,
  CheckCircle2,
  Clock,
  Cloud,
  CloudSun,
  Droplets,
  ExternalLink,
  Gauge,
  Info,
  Leaf,
  Plus,
  RefreshCw,
  Sprout,
  Thermometer,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useFarmerData } from "../../context/FarmerDataContext";
import { isBackendSessionActive, phase1BackendService } from "../../services/phase1Backend";
import { PageShell } from "../../components/common/PageShell";
import { PageHeader } from "../../components/common/PageHeader";
import { AppCard } from "../../components/common/AppCard";
import { ActionButton } from "../../components/common/ActionButton";
import { StatusBadge } from "../../components/common/StatusBadge";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const RECENT_LIMIT = 5;
const IRRIGATION_METHODS = [
  "Drip Irrigation",
  "Sprinkler Irrigation",
  "Flood Irrigation",
  "Furrow Irrigation",
  "Manual Irrigation",
  "Center Pivot",
];
const COMPLETION_STATUSES = ["Completed", "Scheduled", "Missed", "Cancelled"];
const MOISTURE_SOURCES = [
  "Manual Entry",
  "IoT Sensor",
  "Uploaded Soil/Lab Record",
  "Saved Field Measurement",
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

function getTodayISO() {
  return new Date().toISOString();
}

function litresToCubicMetres(litres) {
  return (litres / 1000).toFixed(1);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getMoistureStatus(percentage, min, max) {
  if (percentage == null) return "Insufficient Data";
  if (percentage < min) return "Low";
  if (percentage > max) return "High";
  return "Suitable";
}

function getMoistureStatusColor(status) {
  switch (status) {
    case "Low":
      return "#E65100";
    case "High":
      return "#1565C0";
    case "Suitable":
      return "#2E7D32";
    default:
      return "#667085";
  }
}

function getIrrigationStatus(status) {
  switch (status) {
    case "Completed":
      return "completed";
    case "Scheduled":
      return "pending";
    case "Missed":
      return "missed";
    case "Cancelled":
      return "default";
    default:
      return "default";
  }
}

/* ------------------------------------------------------------------ */
/*  Modal component (reusable)                                        */
/* ------------------------------------------------------------------ */

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div
      className="irr-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="irr-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="irr-modal-head">
          <h3 className="irr-modal-title">{title}</h3>
          <button
            type="button"
            className="irr-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="irr-modal-body">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Toast notification                                                */
/* ------------------------------------------------------------------ */

function Toast({ message, type = "success", visible }) {
  if (!visible) return null;
  return (
    <div className={`irr-toast irr-toast-${type}`}>
      <CheckCircle2 size={16} />
      <span>{message}</span>
    </div>
  );
}

/* ================================================================== */
/*  Main Component                                                    */
/* ================================================================== */

export function IrrigationPage() {
  const { currentFarms } = useFarmerData();
  const backendMode = isBackendSessionActive();

  /* ---- Farm selector ---- */
  const [selectedFarmId, setSelectedFarmId] = useState("");

  const sortedFarms = useMemo(
    () => (Array.isArray(currentFarms) ? currentFarms : []),
    [currentFarms],
  );

  const selectedFarm = useMemo(
    () => sortedFarms.find((f) => f.id === selectedFarmId) || sortedFarms[0] || null,
    [sortedFarms, selectedFarmId],
  );

  // Initialise farm selection
  useEffect(() => {
    if (!selectedFarmId && sortedFarms.length > 0) {
      setSelectedFarmId(sortedFarms[0].id);
    }
  }, [sortedFarms, selectedFarmId]);

  /* ---- Backend farm ID ---- */
  const backendFarmId = selectedFarm?.id || null;

  /* ---- Independent data states ---- */
  const [weather, setWeather] = useState({ loading: false, data: null, error: null });
  const [advisory, setAdvisory] = useState({ loading: false, data: null, error: null });
  const [moisture, setMoisture] = useState({ loading: false, data: null, error: null });
  const [records, setRecords] = useState({ loading: false, data: [], error: null });
  const [reminders, setReminders] = useState([]);
  const [cropStage, setCropStage] = useState("");
  const [farmLastIrrigatedDate, setFarmLastIrrigatedDate] = useState(null);

  /* ---- UI state ---- */
  const [toast, setToast] = useState({ message: "", visible: false, type: "success" });
  const toastTimer = useRef(null);
  const [updateMoistureOpen, setUpdateMoistureOpen] = useState(false);
  const [recordIrrigationOpen, setRecordIrrigationOpen] = useState(false);
  const [setReminderOpen, setSetReminderOpen] = useState(false);

  /* ---- Form states ---- */
  const [moistureForm, setMoistureForm] = useState({
    moisture: "",
    measuredAt: getTodayString(),
    source: "Manual Entry",
    notes: "",
  });
  const [irrigationForm, setIrrigationForm] = useState({
    irrigationDate: getTodayString(),
    irrigationTime: formatTime(getTodayISO()) || "06:00",
    waterAmount: "",
    irrigationMethod: "Manual Irrigation",
    durationMinutes: "",
    completionStatus: "Completed",
    notes: "",
  });
  const [reminderForm, setReminderForm] = useState({
    dateKey: "",
    type: "irrigation",
  });
  const [submitting, setSubmitting] = useState(false);

  /* ---- Toast helper ---- */
  const showToast = useCallback((message, type = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, visible: true, type });
    toastTimer.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3500);
  }, []);

  /* ---- Fetch all data when farm changes ---- */
  useEffect(() => {
    if (!backendFarmId) {
      setWeather({ loading: false, data: null, error: null });
      setAdvisory({ loading: false, data: null, error: null });
      setMoisture({ loading: false, data: null, error: null });
      setRecords({ loading: false, data: [], error: null });
      setReminders([]);
      return;
    }

    let cancelled = false;

    async function loadAll() {
      setWeather((prev) => ({ ...prev, loading: true, error: null }));
      setAdvisory((prev) => ({ ...prev, loading: true, error: null }));
      setMoisture((prev) => ({ ...prev, loading: true, error: null }));
      setRecords((prev) => ({ ...prev, loading: true, error: null }));

      const results = await Promise.allSettled([
        phase1BackendService.weather.dashboard(backendFarmId),
        backendMode
          ? phase1BackendService.irrigation.latest(backendFarmId)
          : Promise.reject(new Error("No backend session")),
        phase1BackendService.irrigation.latestMoisture(backendFarmId),
        phase1BackendService.irrigation.listRecords(backendFarmId, { limit: RECENT_LIMIT }),
        phase1BackendService.irrigation.listReminders(backendFarmId),
      ]);

      if (cancelled) return;

      // Weather
      if (results[0].status === "fulfilled") {
        setWeather({ loading: false, data: results[0].value, error: null });
      } else {
        setWeather({ loading: false, data: null, error: true });
      }

      // Advisory
      if (results[1].status === "fulfilled" && results[1].value) {
        setAdvisory({ loading: false, data: results[1].value, error: null });
        setCropStage(results[1].value.cropStage || "");
      } else {
        setAdvisory({ loading: false, data: null, error: null });
      }

      // Moisture
      if (results[2].status === "fulfilled" && results[2].value) {
        setMoisture({ loading: false, data: results[2].value, error: null });
      } else {
        setMoisture({ loading: false, data: null, error: null });
      }

      // Records
      if (results[3].status === "fulfilled") {
        const recordsList = Array.isArray(results[3].value) ? results[3].value : [];
        setRecords({ loading: false, data: recordsList, error: null });
        // Update last irrigated date
        const completedRecords = recordsList.filter((r) => r.completionStatus === "Completed");
        if (completedRecords.length > 0) {
          setFarmLastIrrigatedDate(completedRecords[0].irrigationDate);
        }
      } else {
        setRecords({ loading: false, data: [], error: null });
      }

      // Reminders
      if (results[4].status === "fulfilled") {
        setReminders(Array.isArray(results[4].value) ? results[4].value : []);
      }
    }

    loadAll();

    return () => {
      cancelled = true;
    };
  }, [backendFarmId, backendMode]);

  /* ---- Derived values ---- */

  const currentWeather = weather.data?.current || null;
  const forecastDays = Array.isArray(weather.data?.forecastDays) ? weather.data.forecastDays : [];
  const next3DaysRain = forecastDays
    .slice(0, 3)
    .reduce((sum, d) => sum + (d.rainSum || d.precipitationSum || 0), 0);

  // Advisory data
  const latestAdvisory = advisory.data;
  const scheduleDates = Array.isArray(latestAdvisory?.scheduleDates)
    ? latestAdvisory.scheduleDates
    : [];

  // Find next irrigation from schedule
  const todayStr = getTodayString();
  const nextSchedule = scheduleDates.find((s) => s.dateKey >= todayStr && s.scheduled && s.recommendedMm >= 2);
  const followingSchedule = scheduleDates.find(
    (s) => s.dateKey >= todayStr && s.dateKey !== nextSchedule?.dateKey && s.scheduled,
  );

  // Last completed record
  const lastCompletedRecord = records.data.find((r) => r.completionStatus === "Completed");

  // Irrigation status determination
  const irrigationStatusText = useMemo(() => {
    if (!latestAdvisory && !moisture.data) return "Insufficient Data";
    if (!nextSchedule) return "No Irrigation Needed";
    const nextDate = new Date(nextSchedule.dateKey);
    const now = new Date();
    const diffDays = (nextDate - now) / (1000 * 60 * 60 * 24);
    if (diffDays <= 1) return "Irrigate Now";
    if (diffDays <= 3) return "Irrigation Due Soon";
    return "No Irrigation Needed";
  }, [latestAdvisory, moisture.data, nextSchedule]);

  const irrigationStatusColor = useMemo(() => {
    switch (irrigationStatusText) {
      case "Irrigate Now":
        return { bg: "#FFEBEE", text: "#C62828" };
      case "Irrigation Due Soon":
        return { bg: "#FFF8E1", text: "#E65100" };
      case "No Irrigation Needed":
        return { bg: "#E8F5E9", text: "#2E7D32" };
      default:
        return { bg: "#F0F0F0", text: "#667085" };
    }
  }, [irrigationStatusText]);

  // Moisture
  const latestMoisture = moisture.data;
  const moisturePercentage = latestMoisture?.moisture ?? null;
  const moistureStatus = getMoistureStatus(moisturePercentage, 30, 60);
  const moistureSource = latestMoisture?.source || null;
  const moistureDate = latestMoisture?.measuredAt || null;

  // Water recommendation
  const recommendedLitres = latestAdvisory?.waterRequirementTotal || null;
  const recommendedPerHa = latestAdvisory?.waterRequirementPerHa || null;
  const recommendedMmPerHa = recommendedPerHa ? (recommendedPerHa / 10000).toFixed(1) : null;

  /* ---- Calculate modal submission handlers ---- */

  const handleUpdateMoisture = async () => {
    if (!backendFarmId || submitting) return;
    if (!moistureForm.moisture || Number(moistureForm.moisture) < 0 || Number(moistureForm.moisture) > 100) {
      showToast("Please enter a valid moisture percentage (0-100).", "error");
      return;
    }

    setSubmitting(true);
    try {
      const measuredAt = `${moistureForm.measuredAt}T06:00:00.000Z`;
      await phase1BackendService.irrigation.createMoisture(backendFarmId, {
        moisture: Number(moistureForm.moisture),
        measuredAt,
        source: moistureForm.source,
        notes: moistureForm.notes || null,
      });

      // Reload moisture
      const newMoisture = await phase1BackendService.irrigation.latestMoisture(backendFarmId);
      setMoisture({ loading: false, data: newMoisture, error: null });

      setUpdateMoistureOpen(false);
      showToast("Soil moisture has been updated successfully.");
    } catch (err) {
      showToast(err.message || "Failed to save moisture reading.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordIrrigation = async () => {
    if (!backendFarmId || submitting) return;
    if (!irrigationForm.waterAmount || Number(irrigationForm.waterAmount) <= 0) {
      showToast("Please enter a valid water amount.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const irrigationDate = `${irrigationForm.irrigationDate}T${irrigationForm.irrigationTime || "06:00"}:00.000Z`;
      await phase1BackendService.irrigation.createRecord(backendFarmId, {
        irrigationDate,
        waterAmount: Number(irrigationForm.waterAmount),
        irrigationMethod: irrigationForm.irrigationMethod,
        durationMinutes: irrigationForm.durationMinutes ? Number(irrigationForm.durationMinutes) : null,
        completionStatus: irrigationForm.completionStatus,
        notes: irrigationForm.notes || null,
      });

      // Reload records and recalculate advisory if needed
      const newRecords = await phase1BackendService.irrigation.listRecords(backendFarmId, { limit: RECENT_LIMIT });
      setRecords({ loading: false, data: Array.isArray(newRecords) ? newRecords : [], error: null });

      const completedNew = (Array.isArray(newRecords) ? newRecords : []).filter((r) => r.completionStatus === "Completed");
      if (completedNew.length > 0) {
        setFarmLastIrrigatedDate(completedNew[0].irrigationDate);
      }

      setRecordIrrigationOpen(false);
      showToast("Irrigation activity has been recorded successfully.");
    } catch (err) {
      showToast(err.message || "Failed to record irrigation.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetReminder = async () => {
    if (!backendFarmId || submitting) return;
    if (!reminderForm.dateKey) {
      showToast("Please select a date for the reminder.", "error");
      return;
    }

    setSubmitting(true);
    try {
      await phase1BackendService.irrigation.createReminder(backendFarmId, {
        dateKey: reminderForm.dateKey,
        type: reminderForm.type,
        priority: "Medium",
        status: "Pending",
      });

      const newReminders = await phase1BackendService.irrigation.listReminders(backendFarmId);
      setReminders(Array.isArray(newReminders) ? newReminders : []);

      setSetReminderOpen(false);
      showToast("Irrigation reminder has been set successfully.");
    } catch (err) {
      showToast(err.message || "Failed to set reminder.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---- Render ---- */

  if (!selectedFarm) {
    return (
      <PageShell>
        <PageHeader title="Irrigation Management" description="Irrigation scheduling, soil moisture tracking, and water management for your farm." />
        <div className="irr-empty">Select a farm to view irrigation management.</div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Irrigation Management"
        description="Real-time irrigation scheduling, soil moisture tracking, weather-based recommendations, and activity logging."
      />

      {/* Toast */}
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />

      {/* ================================================================ */}
      {/*  TOP ROW: Active Farm + Farm Info                                 */}
      {/* ================================================================ */}
      <div className="irr-top-bar">
        <div className="irr-top-bar-left">
          <label className="irr-farm-selector">
            <span className="irr-farm-label">Active Farm</span>
            <select
              value={selectedFarmId}
              onChange={(e) => {
                setSelectedFarmId(e.target.value);
                setCropStage("");
              }}
            >
              {sortedFarms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name} — {farm.region}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="irr-top-bar-right">
          <div className="irr-farm-chip">
            <Sprout size={14} />
            <span>{selectedFarm.primaryCrop || "No crop"}</span>
          </div>
          <div className="irr-farm-chip">
            <Leaf size={14} />
            <span>{cropStage || "—"}</span>
          </div>
          <div className="irr-farm-chip">
            <Droplets size={14} />
            <span>{selectedFarm.irrigationType || "—"}</span>
          </div>
          <div className="irr-farm-chip">
            <Gauge size={14} />
            <span>{selectedFarm.sizeHectares || "—"} ha</span>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/*  MAIN ROW: Status, Moisture, Weather                              */}
      {/* ================================================================ */}
      <div className="irr-main-row">
        {/* ---- Current Irrigation Status ---- */}
        <AppCard className="irr-status-card">
          <div className="irr-status-header">
            <h2 className="irr-section-title">Current Irrigation Status</h2>
            <div
              className="irr-status-badge-large"
              style={{ background: irrigationStatusColor.bg, color: irrigationStatusColor.text }}
            >
              {irrigationStatusText}
            </div>
          </div>

          {advisory.loading ? (
            <div className="irr-loading">Loading recommendation...</div>
          ) : latestAdvisory ? (
            <div className="irr-status-details">
              <div className="irr-status-grid">
                <div className="irr-status-field">
                  <span className="irr-field-label">Crop</span>
                  <strong>{latestAdvisory.crop || selectedFarm.primaryCrop || "—"}</strong>
                </div>
                <div className="irr-status-field">
                  <span className="irr-field-label">Growth Stage</span>
                  <strong>{latestAdvisory.cropStage || cropStage || "—"}</strong>
                </div>
                {nextSchedule && (
                  <div className="irr-status-field">
                    <span className="irr-field-label">Recommended Date</span>
                    <strong>{formatDate(nextSchedule.dateKey)} at {formatTime(nextSchedule.dateKey) || "06:00"}</strong>
                  </div>
                )}
                {lastCompletedRecord && (
                  <div className="irr-status-field">
                    <span className="irr-field-label">Last Irrigated</span>
                    <strong>{formatDate(lastCompletedRecord.irrigationDate)}</strong>
                  </div>
                )}
              </div>

              {nextSchedule?.explanation && (
                <p className="irr-status-explanation">{nextSchedule.explanation}</p>
              )}

              {latestAdvisory.advisoryNotice && (
                <p className="irr-status-notice">{latestAdvisory.advisoryNotice}</p>
              )}

              <div className="irr-status-updated">
                <Clock size={12} />
                <span>Data last updated: {formatDateTime(latestAdvisory.updatedAt || latestAdvisory.createdAt)}</span>
              </div>
            </div>
          ) : (
            <div className="irr-empty-data">
              No irrigation recommendation available yet. Complete a soil moisture measurement and record a crop to generate a plan.
            </div>
          )}
        </AppCard>

        {/* ---- Soil Moisture ---- */}
        <AppCard className="irr-moisture-card">
          <div className="irr-section-head">
            <h2 className="irr-section-title">Soil Moisture</h2>
            {!moisture.loading && (
              <ActionButton variant="secondary" size="sm" onClick={() => setUpdateMoistureOpen(true)}>
                <Plus size={14} />
                <span>Update Moisture</span>
              </ActionButton>
            )}
          </div>

          {moisture.loading ? (
            <div className="irr-loading">Loading moisture data...</div>
          ) : moisturePercentage != null ? (
            <div className="irr-moisture-body">
              <div className="irr-moisture-value-row">
                <div className="irr-moisture-circle" style={{ borderColor: getMoistureStatusColor(moistureStatus) }}>
                  <strong>{moisturePercentage}%</strong>
                </div>
                <div className="irr-moisture-meta">
                  <StatusBadge status={moistureStatus === "Suitable" ? "completed" : moistureStatus === "Low" ? "pending" : "default"}>
                    {moistureStatus}
                  </StatusBadge>
                  <span>Recommended: 30 – 60%</span>
                </div>
              </div>
              <div className="irr-moisture-bar-track">
                <div
                  className="irr-moisture-bar-fill"
                  style={{
                    width: `${clamp(moisturePercentage, 0, 100)}%`,
                    background: getMoistureStatusColor(moistureStatus),
                  }}
                />
              </div>
              <div className="irr-moisture-source-row">
                <span>Source: <strong>{moistureSource || "—"}</strong></span>
                <span>Measured: <strong>{moistureDate ? formatDateTime(moistureDate) : "—"}</strong></span>
              </div>
            </div>
          ) : (
            <div className="irr-empty-data">
              No soil moisture measurement is available. Add a measurement to calculate an irrigation plan.
            </div>
          )}
        </AppCard>

        {/* ---- Compact Weather Summary ---- */}
        <AppCard className="irr-weather-card">
          <div className="irr-section-head">
            <h2 className="irr-section-title">Weather</h2>
            {weather.loading && <RefreshCw size={14} className="irr-spin" />}
          </div>

          {weather.error && !weather.data ? (
            <div className="irr-empty-data">Live weather data is currently unavailable.</div>
          ) : currentWeather ? (
            <div className="irr-weather-body">
              <div className="irr-weather-temp-row">
                <Thermometer size={18} />
                <strong>{currentWeather.temperature_2m ?? "—"}°C</strong>
                <span className="irr-weather-desc">
                  {currentWeather.weather_code != null
                    ? ["Clear", "Mainly clear", "Partly cloudy", "Overcast"][Math.min(currentWeather.weather_code, 3)] || "Cloudy"
                    : "—"}
                </span>
              </div>
              <div className="irr-weather-metrics">
                <div className="irr-weather-metric">
                  <CloudSun size={14} />
                  <span>Today rain: <strong>{currentWeather.precipitation ?? currentWeather.rain ?? 0} mm</strong></span>
                </div>
                <div className="irr-weather-metric">
                  <Cloud size={14} />
                  <span>3-day rain: <strong>{next3DaysRain.toFixed(1)} mm</strong></span>
                </div>
                <div className="irr-weather-metric">
                  <Droplets size={14} />
                  <span>Humidity: <strong>{currentWeather.relative_humidity_2m ?? "—"}%</strong></span>
                </div>
              </div>
              <Link to="/weather" className="irr-weather-link">
                <ExternalLink size={12} />
                <span>View full weather forecast</span>
              </Link>
            </div>
          ) : (
            <div className="irr-empty-data">Live weather data is currently unavailable.</div>
          )}
        </AppCard>
      </div>

      {/* ================================================================ */}
      {/*  SECOND ROW: Water Amount + Next Irrigation Schedule             */}
      {/* ================================================================ */}
      <div className="irr-second-row">
        {/* ---- Recommended Water Amount ---- */}
        <AppCard className="irr-water-card">
          <h2 className="irr-section-title">
            <Droplets size={18} />
            <span>Recommended Water Amount</span>
          </h2>

          {advisory.loading ? (
            <div className="irr-loading">Calculating recommendation...</div>
          ) : recommendedLitres != null ? (
            <div className="irr-water-body">
              <div className="irr-water-hero">
                <strong className="irr-water-value">{recommendedLitres.toLocaleString()}</strong>
                <span className="irr-water-unit">litres</span>
              </div>
              <div className="irr-water-equiv">
                <span>Equivalent: <strong>{litresToCubicMetres(recommendedLitres)} m³</strong> for this field</span>
                {recommendedMmPerHa && (
                  <span>≈ <strong>{recommendedMmPerHa} mm</strong> per hectare</span>
                )}
              </div>
              {latestAdvisory?.referenceEt && (
                <p className="irr-water-note">
                  Based on ET₀ {latestAdvisory.referenceEt} × Kc {latestAdvisory.cropCoefficient}, soil moisture, and rainfall forecast.
                </p>
              )}
            </div>
          ) : (
            <div className="irr-empty-data">
              Not enough data to calculate the recommended amount. Required: farm area, crop, growth stage, soil moisture, and weather data.
            </div>
          )}
        </AppCard>

        {/* ---- Next Irrigation Schedule ---- */}
        <AppCard className="irr-schedule-card">
          <h2 className="irr-section-title">
            <Clock size={18} />
            <span>Next Irrigation Schedule</span>
          </h2>

          {reminders.length > 0 || nextSchedule ? (
            <div className="irr-schedule-body">
              {nextSchedule ? (
                <div className="irr-schedule-row highlight">
                  <span className="irr-schedule-label">Next irrigation</span>
                  <strong>{formatDate(nextSchedule.dateKey)} at 06:00</strong>
                </div>
              ) : null}
              {followingSchedule ? (
                <div className="irr-schedule-row">
                  <span className="irr-schedule-label">Following</span>
                  <strong>{formatDate(followingSchedule.dateKey)} at 06:00</strong>
                </div>
              ) : null}
              {lastCompletedRecord ? (
                <div className="irr-schedule-row">
                  <span className="irr-schedule-label">Last completed</span>
                  <strong>{formatDate(lastCompletedRecord.irrigationDate)}</strong>
                </div>
              ) : farmLastIrrigatedDate ? (
                <div className="irr-schedule-row">
                  <span className="irr-schedule-label">Last completed</span>
                  <strong>{formatDate(farmLastIrrigatedDate)}</strong>
                </div>
              ) : null}

              <div className="irr-schedule-actions">
                <ActionButton variant="secondary" size="sm" onClick={() => {
                  setReminderForm((prev) => ({
                    ...prev,
                    dateKey: nextSchedule?.dateKey || getTodayString(),
                  }));
                  setSetReminderOpen(true);
                }}>
                  <Bell size={14} />
                  <span>Set Reminder</span>
                </ActionButton>
                <Link to="/notifications" className="action-button action-button-ghost action-button-sm">
                  <ExternalLink size={14} />
                  <span>View Full Schedule</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="irr-empty-data">
              No upcoming irrigation scheduled. Record a moisture reading and calculate a recommendation to see your schedule.
            </div>
          )}
        </AppCard>
      </div>

      {/* ================================================================ */}
      {/*  BUTTON ROW: Record Irrigation                                   */}
      {/* ================================================================ */}
      <div className="irr-action-row">
        <ActionButton variant="primary" size="lg" onClick={() => {
          setIrrigationForm((prev) => ({
            ...prev,
            irrigationDate: getTodayString(),
            irrigationTime: formatTime(getTodayISO()) || "06:00",
            waterAmount: recommendedLitres ? String(recommendedLitres) : "",
          }));
          setRecordIrrigationOpen(true);
        }}>
          <Plus size={18} />
          <span>Record Irrigation</span>
        </ActionButton>
      </div>

      {/* ================================================================ */}
      {/*  BOTTOM ROW: Recent Irrigation History                           */}
      {/* ================================================================ */}
      <AppCard className="irr-history-card">
        <div className="irr-section-head">
          <h2 className="irr-section-title">
            <Clock size={18} />
            <span>Recent Irrigation History</span>
          </h2>
          <Link to="/analytics" className="action-button action-button-ghost action-button-sm">
            <ExternalLink size={14} />
            <span>View all history</span>
          </Link>
        </div>

        {records.loading ? (
          <div className="irr-loading">Loading history...</div>
        ) : records.data.length > 0 ? (
          <div className="irr-history-table">
            <div className="irr-history-head">
              <span>Date</span>
              <span>Crop</span>
              <span>Water Amount</span>
              <span>Method</span>
              <span>Status</span>
            </div>
            {records.data.slice(0, RECENT_LIMIT).map((rec) => (
              <div key={rec.id} className="irr-history-row">
                <span>{formatDate(rec.irrigationDate)}</span>
                <span>{selectedFarm.primaryCrop || "—"}</span>
                <span><strong>{Number(rec.waterAmount).toLocaleString()} L</strong></span>
                <span>{rec.irrigationMethod}</span>
                <StatusBadge status={getIrrigationStatus(rec.completionStatus)}>
                  {rec.completionStatus}
                </StatusBadge>
              </div>
            ))}
          </div>
        ) : (
          <div className="irr-empty-data">No irrigation records yet. Record your first irrigation activity above.</div>
        )}
      </AppCard>

      {/* ================================================================ */}
      {/*  MODALS                                                        */}
      {/* ================================================================ */}

      {/* ---- Update Moisture Modal ---- */}
      <Modal open={updateMoistureOpen} onClose={() => setUpdateMoistureOpen(false)} title="Update Soil Moisture">
        <div className="irr-form">
          <label className="irr-form-field">
            <span>Moisture (%)</span>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={moistureForm.moisture}
              onChange={(e) => setMoistureForm((p) => ({ ...p, moisture: e.target.value }))}
              placeholder="e.g. 34"
            />
          </label>
          <label className="irr-form-field">
            <span>Measurement Date</span>
            <input
              type="date"
              value={moistureForm.measuredAt}
              onChange={(e) => setMoistureForm((p) => ({ ...p, measuredAt: e.target.value }))}
            />
          </label>
          <label className="irr-form-field">
            <span>Source</span>
            <select
              value={moistureForm.source}
              onChange={(e) => setMoistureForm((p) => ({ ...p, source: e.target.value }))}
            >
              {MOISTURE_SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="irr-form-field">
            <span>Notes (optional)</span>
            <textarea
              value={moistureForm.notes}
              onChange={(e) => setMoistureForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Any observations..."
              rows={2}
            />
          </label>
          <div className="irr-form-actions">
            <ActionButton variant="secondary" onClick={() => setUpdateMoistureOpen(false)}>
              Cancel
            </ActionButton>
            <ActionButton variant="primary" onClick={handleUpdateMoisture} disabled={submitting}>
              {submitting ? "Saving..." : "Save Moisture"}
            </ActionButton>
          </div>
        </div>
      </Modal>

      {/* ---- Record Irrigation Modal ---- */}
      <Modal open={recordIrrigationOpen} onClose={() => setRecordIrrigationOpen(false)} title="Record Irrigation">
        <div className="irr-form">
          <label className="irr-form-field">
            <span>Irrigation Date</span>
            <input
              type="date"
              value={irrigationForm.irrigationDate}
              onChange={(e) => setIrrigationForm((p) => ({ ...p, irrigationDate: e.target.value }))}
            />
          </label>
          <label className="irr-form-field">
            <span>Irrigation Time</span>
            <input
              type="time"
              value={irrigationForm.irrigationTime}
              onChange={(e) => setIrrigationForm((p) => ({ ...p, irrigationTime: e.target.value }))}
            />
          </label>
          <label className="irr-form-field">
            <span>Water Amount (litres)</span>
            <input
              type="number"
              step="0.1"
              min="0"
              value={irrigationForm.waterAmount}
              onChange={(e) => setIrrigationForm((p) => ({ ...p, waterAmount: e.target.value }))}
              placeholder="e.g. 18000"
            />
          </label>
          <label className="irr-form-field">
            <span>Irrigation Method</span>
            <select
              value={irrigationForm.irrigationMethod}
              onChange={(e) => setIrrigationForm((p) => ({ ...p, irrigationMethod: e.target.value }))}
            >
              {IRRIGATION_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>
          <label className="irr-form-field">
            <span>Duration (minutes, optional)</span>
            <input
              type="number"
              min="1"
              value={irrigationForm.durationMinutes}
              onChange={(e) => setIrrigationForm((p) => ({ ...p, durationMinutes: e.target.value }))}
              placeholder="e.g. 60"
            />
          </label>
          <label className="irr-form-field">
            <span>Completion Status</span>
            <select
              value={irrigationForm.completionStatus}
              onChange={(e) => setIrrigationForm((p) => ({ ...p, completionStatus: e.target.value }))}
            >
              {COMPLETION_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="irr-form-field">
            <span>Notes (optional)</span>
            <textarea
              value={irrigationForm.notes}
              onChange={(e) => setIrrigationForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Any notes..."
              rows={2}
            />
          </label>
          <div className="irr-form-actions">
            <ActionButton variant="secondary" onClick={() => setRecordIrrigationOpen(false)}>
              Cancel
            </ActionButton>
            <ActionButton variant="primary" onClick={handleRecordIrrigation} disabled={submitting}>
              {submitting ? "Saving..." : "Record Irrigation"}
            </ActionButton>
          </div>
        </div>
      </Modal>

      {/* ---- Set Reminder Modal ---- */}
      <Modal open={setReminderOpen} onClose={() => setSetReminderOpen(false)} title="Set Irrigation Reminder">
        <div className="irr-form">
          <label className="irr-form-field">
            <span>Reminder Date</span>
            <input
              type="date"
              value={reminderForm.dateKey}
              onChange={(e) => setReminderForm((p) => ({ ...p, dateKey: e.target.value }))}
            />
          </label>
          <div className="irr-form-actions">
            <ActionButton variant="secondary" onClick={() => setSetReminderOpen(false)}>
              Cancel
            </ActionButton>
            <ActionButton variant="primary" onClick={handleSetReminder} disabled={submitting}>
              {submitting ? "Saving..." : "Set Reminder"}
            </ActionButton>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
