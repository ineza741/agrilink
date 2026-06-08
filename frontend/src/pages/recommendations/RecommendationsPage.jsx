import {
  BookOpen,
  Bug,
  CalendarClock,
  Check,
  ChevronDown,
  Clock3,
  Database,
  Download,
  Droplets,
  FileDown,
  FlaskConical,
  Plus,
  Search,
  Sparkles,
  Sprout,
  TestTube2,
  Trash2,
  Bell,
  Pencil,
  BrainCircuit,
  TrendingUp,
  ThermometerSun,
  Coins,
  ShieldAlert,
  Wheat,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useFarmerData } from "../../context/FarmerDataContext";
import { FarmerPrototypeTopbar } from "../../components/common/FarmerPrototypeTopbar";

const FEEDBACK_STORAGE_KEY = "agri-feed-recommendation-feedback-v1";
const ADMIN_CONTENT_STORAGE_KEY = "agri-feed-admin-content-v1";

const recommendationTypeMeta = {
  fertilize: {
    icon: FlaskConical,
    tone: "blue",
    actionLabel: "Fertilize",
  },
  irrigate: {
    icon: Droplets,
    tone: "sky",
    actionLabel: "Irrigate",
  },
  plant: {
    icon: Sprout,
    tone: "green",
    actionLabel: "Plant",
  },
  harvest: {
    icon: Wheat,
    tone: "amber",
    actionLabel: "Harvest",
  },
};

const cropRows = [
  { crop: "Hard Winter Wheat", cycle: "240 Days", zone: "Temperate", status: "Verified" },
  { crop: "Sweet Corn (Yellow)", cycle: "90 Days", zone: "Tropical/Sub", status: "Verified" },
  { crop: "High-Yield Soybean", cycle: "120 Days", zone: "Varied", status: "Draft" },
  { crop: "Basmati Rice", cycle: "150 Days", zone: "Tropical", status: "Verified" },
];

const fertilizerCards = [
  { title: "Nitrogen Optimization", state: "Active" },
  { title: "Phosphorus Protocol", state: "Pending" },
];

const recentModifications = [
  { title: "Basmati Rice Guidelines Updated", meta: "By Admin Smith · 2 hours ago" },
  { title: "Pest Entry: 'Locust V2' Deleted", meta: "By Admin Doe · 5 hours ago" },
  { title: "Fertilizer Logic: NPK Ratios Adjusted", meta: "System Auto-Update · Yesterday" },
];

function loadFeedback() {
  try {
    return JSON.parse(localStorage.getItem(FEEDBACK_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function persistFeedback(state) {
  localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(state));
}

function loadAdminContentState() {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_CONTENT_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveAdminContentState(state) {
  localStorage.setItem(ADMIN_CONTENT_STORAGE_KEY, JSON.stringify(state));
}

function createDefaultFarm() {
  return {
    id: "rec-default-farm",
    name: "Primary Advisory Plot",
    region: "Northern Highlands",
    sizeHectares: 14,
    landType: "Loamy",
    irrigationType: "Drip Irrigation",
    primaryCrop: "Maize",
    history: [],
    location: { lat: -1.94, lng: 29.87, mapX: 50, mapY: 50, label: "Primary advisory zone" },
  };
}

function hashFarm(farm) {
  return (
    Math.round(Math.abs(Number(farm?.location?.lat || 0)) * 100) +
    Math.round(Math.abs(Number(farm?.location?.lng || 0)) * 100) +
    Math.round(Number(farm?.sizeHectares || 0)) * 3 +
    Number(farm?.location?.mapX || 0) +
    Number(farm?.location?.mapY || 0)
  );
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function recommendationBaseForFarm(farm, feedbackEntry) {
  const seed = hashFarm(farm);
  const moisture = clamp(22 + (seed % 49), 14, 82);
  const rainfallChance = clamp(24 + (seed % 55), 16, 92);
  const soilNitrogenGap = clamp(8 + (seed % 17), 4, 22);
  const heatStress = clamp(18 + (seed % 62), 8, 88);
  const priceMomentum = clamp(35 + (seed % 54), 18, 91);
  const stage =
    ["Establishment", "Vegetative", "Flowering", "Grain Fill"][seed % 4];
  const season =
    rainfallChance > 60 ? "Wet-season transition" : heatStress > 60 ? "Dry-season stress" : "Stable in-season";
  const adaptiveBoost = feedbackEntry?.accepted > feedbackEntry?.rejected ? 4 : 0;
  const adaptivePenalty = feedbackEntry?.rejected > feedbackEntry?.accepted ? 5 : 0;

  const actions = [
    {
      id: `${farm.id}-fertilize`,
      type: "fertilize",
      title: `Apply targeted nitrogen blend on ${farm.name}`,
      subtitle: `Stage: ${stage} · ${farm.primaryCrop || "Field crop"} support`,
      confidence: clamp(88 + Math.round(soilNitrogenGap / 2) + adaptiveBoost - adaptivePenalty, 62, 97),
      priorityScore: soilNitrogenGap * 2 + (moisture > 40 ? 8 : 3),
      scheduler: "Within the next 48 hours",
      why: [
        `Soil + crop: Estimated nitrogen gap is ${soilNitrogenGap}% below the stage target for ${farm.primaryCrop || "the current crop"}.`,
        `Weather + timing: Rainfall probability is ${rainfallChance}% which still leaves a safe top-dress window before runoff risk increases.`,
      ],
      guidance: [
        "Inspect the lower canopy for uniform color response before application.",
        "Apply split doses across two passes to reduce leaching risk.",
        "Review follow-up moisture status after 72 hours.",
      ],
    },
    {
      id: `${farm.id}-irrigate`,
      type: "irrigate",
      title: `Adjust irrigation cycle for ${farm.name}`,
      subtitle: `Moisture status: ${moisture}% · ${farm.irrigationType || "Scheduled irrigation"}`,
      confidence: clamp(72 + Math.round((40 - Math.min(moisture, 40)) / 2) + adaptiveBoost - adaptivePenalty, 58, 95),
      priorityScore: moisture < 30 ? 86 : 61,
      scheduler: moisture < 30 ? "Immediate evening cycle" : "Review in 24 hours",
      why: [
        `Soil + weather: Current modeled soil moisture is ${moisture}%, which is ${moisture < 30 ? "below" : "near"} the stress threshold.`,
        `Operational: ${rainfallChance > 65 ? "Incoming rain may offset one cycle, so use a shorter pulse irrigation plan." : "No heavy rainfall spike is expected, making a standard irrigation cycle efficient."}`,
      ],
      guidance: [
        "Prioritize the drier sub-blocks first.",
        "Use evening or early-morning irrigation to reduce evaporative losses.",
        "Re-check leaf turgor and soil moisture before repeating the cycle.",
      ],
    },
    {
      id: `${farm.id}-plant`,
      type: "plant",
      title: `Plan the next planting window for ${farm.name}`,
      subtitle: `${season} · Rotation support`,
      confidence: clamp(70 + Math.round(rainfallChance / 4) + adaptiveBoost - adaptivePenalty, 57, 93),
      priorityScore: rainfallChance + 8,
      scheduler: rainfallChance > 55 ? "Next 5-7 days" : "Reassess after 1 week",
      why: [
        `Climate + soil: Rainfall probability of ${rainfallChance}% supports seed establishment when combined with ${farm.landType || "current"} soil texture.`,
        `Rotation + market: Rotating into legumes or short-cycle cereals can protect soil health while keeping market exposure flexible.`,
      ],
      guidance: [
        "Reserve the heavier plots for crops that tolerate moisture variability.",
        "Use certified seed lots with high emergence rates.",
        "Keep field residue where possible to preserve early-season moisture.",
      ],
    },
    {
      id: `${farm.id}-harvest`,
      type: "harvest",
      title: `Prepare harvest and sale timing for ${farm.name}`,
      subtitle: `Market momentum score: ${priceMomentum}%`,
      confidence: clamp(65 + Math.round(priceMomentum / 4) + adaptiveBoost - adaptivePenalty, 52, 90),
      priorityScore: priceMomentum,
      scheduler: priceMomentum > 65 ? "Monitor over the next 5 days" : "Archive for later review",
      why: [
        `Market + climate: Price momentum is ${priceMomentum}% and short-term weather is ${heatStress > 60 ? "warm and drying" : "stable"}, which affects harvest readiness and storage quality.`,
        `Decision support: Aligning harvest with higher market confidence can improve net return after transport and handling.`,
      ],
      guidance: [
        "Check grain or crop maturity thresholds before mobilizing labor.",
        "Confirm storage or buyer availability before final harvest scheduling.",
        "Capture post-harvest loss data for future recommendation tuning.",
      ],
    },
  ];

  return {
    farm,
    season,
    stage,
    actions: actions.sort((a, b) => b.priorityScore - a.priorityScore),
    metrics: {
      moisture,
      rainfallChance,
      soilNitrogenGap,
      heatStress,
      priceMomentum,
    },
  };
}

function FarmerRecommendationsView() {
  const { user } = useAuth();
  const { currentFarms, currentProfile } = useFarmerData();
  const farms = currentFarms.length ? currentFarms : [createDefaultFarm()];
  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || "rec-default-farm");
  const [feedback, setFeedback] = useState(() => loadFeedback());
  const [activeTab, setActiveTab] = useState("all");
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    persistFeedback(feedback);
  }, [feedback]);

  useEffect(() => {
    if (!farms.some((farm) => farm.id === selectedFarmId)) {
      setSelectedFarmId(farms[0]?.id || "rec-default-farm");
    }
  }, [farms, selectedFarmId]);

  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === selectedFarmId) || farms[0],
    [farms, selectedFarmId]
  );

  const dataset = useMemo(() => {
    const feedbackEntry = feedback[selectedFarm?.id] || { accepted: 0, rejected: 0, decisions: {} };
    return recommendationBaseForFarm(selectedFarm, feedbackEntry);
  }, [feedback, selectedFarm]);

  const allRecommendations = useMemo(() => {
    const farmFeedback = feedback[selectedFarm?.id] || { decisions: {} };

    return dataset.actions.map((action, index) => ({
      ...action,
      meta: recommendationTypeMeta[action.type],
      status: farmFeedback.decisions?.[action.id] || "pending",
      rank: index + 1,
    }));
  }, [dataset.actions, feedback, selectedFarm?.id]);

  const visibleRecommendations = useMemo(() => {
    if (activeTab === "high") {
      return allRecommendations.filter((item) => item.confidence >= 90);
    }
    if (activeTab === "review") {
      return allRecommendations.filter((item) => item.status === "rejected" || item.confidence < 75);
    }
    return allRecommendations;
  }, [activeTab, allRecommendations]);

  const acceptedCount = allRecommendations.filter((item) => item.status === "accepted").length;
  const rejectedCount = allRecommendations.filter((item) => item.status === "rejected").length;
  const projectedImpact = (acceptedCount * 1.8 + Math.max(0, allRecommendations[0]?.confidence - 80) * 0.08).toFixed(1);

  const handleDecision = (recommendationId, decision) => {
    setFeedback((current) => {
      const farmEntry = current[selectedFarm.id] || { accepted: 0, rejected: 0, decisions: {} };
      const previous = farmEntry.decisions?.[recommendationId];
      let accepted = farmEntry.accepted || 0;
      let rejected = farmEntry.rejected || 0;

      if (previous === "accepted") accepted -= 1;
      if (previous === "rejected") rejected -= 1;
      if (decision === "accepted") accepted += 1;
      if (decision === "rejected") rejected += 1;

      return {
        ...current,
        [selectedFarm.id]: {
          accepted,
          rejected,
          decisions: {
            ...farmEntry.decisions,
            [recommendationId]: decision,
          },
        },
      };
    });
  };

  const toggleExpanded = (recommendationId) => {
    setExpanded((current) => ({
      ...current,
      [recommendationId]: !current[recommendationId],
    }));
  };

  const tabItems = [
    { id: "all", label: `All Recommendations (${allRecommendations.length})` },
    { id: "high", label: `High Confidence (${allRecommendations.filter((item) => item.confidence >= 90).length})` },
    { id: "review", label: `Needs Review (${allRecommendations.filter((item) => item.status === "rejected" || item.confidence < 75).length})` },
  ];

  return (
    <section className="management-page prototype-recommendations-page">
      <FarmerPrototypeTopbar
        brand="AgriLogic AI"
        items={["Dashboard", "Recommendations", "Analytics", "Field Data"]}
        active="Recommendations"
        placeholder="Search fields, nutrients, or data..."
      />

      <div className="page-title-block prototype-recommendations-title">
        <h1>Academic-Led Recommendations</h1>
        <p>
          Personalized machine-learning style advice built from your farm profile, local conditions,
          and feedback history.
        </p>
      </div>

      <div className="recommendation-dashboard-strip">
        <article className="prototype-panel recommendation-summary-card">
          <span>Personalized farm</span>
          <strong>{selectedFarm.name}</strong>
          <p>{selectedFarm.region} · {selectedFarm.primaryCrop || "Mixed crop profile"}</p>
        </article>
        <article className="prototype-panel recommendation-summary-card">
          <span>Priority queue</span>
          <strong>{allRecommendations[0]?.meta.actionLabel || "Action"} first</strong>
          <p>{dataset.stage} stage · {dataset.season}</p>
        </article>
        <article className="prototype-panel recommendation-summary-card">
          <span>Adaptive learning</span>
          <strong>{acceptedCount} accepted / {rejectedCount} rejected</strong>
          <p>Feedback is tuning next-cycle prioritization locally.</p>
        </article>
      </div>

      <div className="recommendations-toolbar">
        <div className="recommendation-toolbar-left">
          <label className="recommendation-farm-selector">
            <span>Recommendation source farm</span>
            <select value={selectedFarmId} onChange={(event) => setSelectedFarmId(event.target.value)}>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name} - {farm.region}
                </option>
              ))}
            </select>
          </label>
          <div className="recommendation-tabs">
            {tabItems.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? "recommendation-tab active" : "recommendation-tab"}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <button type="button" className="recommendation-export-button">
          <Download size={15} />
          <span>Export Dataset</span>
        </button>
      </div>

      <div className="recommendation-scheduler-grid">
        <article className="prototype-panel recommendation-scheduler-card">
          <div className="recommendation-scheduler-head">
            <CalendarClock size={18} />
            <h2>Seasonal &amp; stage-based advice scheduler</h2>
          </div>
          <div className="recommendation-scheduler-list">
            {allRecommendations.map((item) => (
              <div key={`${item.id}-schedule`} className="recommendation-scheduler-item">
                <div>
                  <strong>{item.meta.actionLabel}</strong>
                  <span>{item.scheduler}</span>
                </div>
                <small>Rank #{item.rank}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="prototype-panel recommendation-priority-card">
          <div className="recommendation-scheduler-head">
            <TrendingUp size={18} />
            <h2>Multi-criteria decision support</h2>
          </div>
          <ul className="recommendation-priority-list">
            <li><ThermometerSun size={15} /> Weather stress signal: {dataset.metrics.heatStress}%</li>
            <li><Droplets size={15} /> Soil moisture signal: {dataset.metrics.moisture}%</li>
            <li><FlaskConical size={15} /> Nutrient gap estimate: {dataset.metrics.soilNitrogenGap}%</li>
            <li><Coins size={15} /> Market momentum: {dataset.metrics.priceMomentum}%</li>
          </ul>
        </article>
      </div>

      <div className="recommendation-card-list">
        {visibleRecommendations.map((item) => {
          const Icon = item.meta.icon;
          const isExpanded = Boolean(expanded[item.id]);
          return (
            <article key={item.id} className="prototype-panel recommendation-card functional">
              <div className="recommendation-card-head">
                <div className="recommendation-head-main">
                  <div className={`recommendation-icon tone-${item.meta.tone}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <h2>{item.title}</h2>
                    <p>{item.subtitle}</p>
                  </div>
                </div>

                <div className="recommendation-confidence">
                  <span>Confidence Score</span>
                  <strong>{item.confidence}%</strong>
                </div>
              </div>

              <div className="recommendation-rank-row">
                <span className="recommendation-rank-badge">Priority #{item.rank}</span>
                <span className={`recommendation-status-chip ${item.status}`}>
                  {item.status === "accepted" ? "Accepted" : item.status === "rejected" ? "Rejected" : "Pending"}
                </span>
              </div>

              <button
                type="button"
                className="recommendation-explain-toggle"
                onClick={() => toggleExpanded(item.id)}
              >
                <span>Why this recommendation?</span>
                <ChevronDown size={16} className={isExpanded ? "open" : ""} />
              </button>

              {isExpanded ? (
                <div className="recommendation-logic-box">
                  <div className="recommendation-logic-head">
                    <Sparkles size={16} />
                    <strong>Interpretability Logic</strong>
                  </div>

                  <div className="recommendation-logic-grid">
                    <div className="recommendation-logic-item">
                      <Database size={15} />
                      <p>{item.why[0]}</p>
                    </div>
                    <div className="recommendation-logic-item">
                      <BrainCircuit size={15} />
                      <p>{item.why[1]}</p>
                    </div>
                  </div>

                  <div className="recommendation-guidance-box">
                    <div className="recommendation-guidance-head">
                      <Check size={16} />
                      <strong>Step-by-step guidance</strong>
                    </div>
                    <ol>
                      {item.guidance.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              ) : null}

              <div className="recommendation-card-footer">
                <div className="recommendation-reviewer">
                  <i className={item.status === "rejected" ? "muted" : ""} />
                  <span>
                    {currentProfile?.farmerType || "Farmer"} feedback is used to adapt later ranking
                  </span>
                </div>

                <div className="recommendation-actions">
                  <button
                    type="button"
                    className="recommendation-secondary-button"
                    onClick={() => handleDecision(item.id, "rejected")}
                  >
                    <X size={15} />
                    <span>Reject</span>
                  </button>
                  <button
                    type="button"
                    className="recommendation-primary-button"
                    onClick={() => handleDecision(item.id, "accepted")}
                  >
                    <Check size={15} />
                    <span>Accept Action</span>
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <article className="prototype-panel recommendation-impact-card">
        <div className="recommendation-impact-copy">
          <div className="recommendation-impact-icon">
            <Sparkles size={18} />
          </div>
          <div>
            <strong>Projected Yield Impact</strong>
            <p>Applying the currently accepted actions may increase expected output by +{projectedImpact}%</p>
          </div>
        </div>

        <button type="button" className="recommendation-dark-button">
          Apply All Approved
        </button>
      </article>
    </section>
  );
}

function AdminContentManagementView() {
  const stored = useMemo(() => loadAdminContentState(), []);
  const [activeTab, setActiveTab] = useState(stored.activeTab || "Crops");
  const [entries, setEntries] = useState(
    stored.entries || {
      Crops: cropRows,
      Pests: [
        { crop: "Fall Armyworm", cycle: "Larval Stage", zone: "Warm Humid", status: "Verified" },
        { crop: "Late Blight", cycle: "Outbreak Window", zone: "Cool Wet", status: "Verified" },
        { crop: "Aphid Surge", cycle: "Early Stage", zone: "Temperate", status: "Draft" },
      ],
      "Advisory Logic": [
        { crop: "Moisture Stress Rule", cycle: "Triggered", zone: "All Regions", status: "Verified" },
        { crop: "Heatwave Escalation", cycle: "Triggered", zone: "Semi-Arid", status: "Draft" },
      ],
      "Fertilizer Standards": [
        { crop: "Nitrogen Optimization", cycle: "Active", zone: "Maize Belt", status: "Verified" },
        { crop: "Phosphorus Protocol", cycle: "Pending Review", zone: "Highland Farms", status: "Draft" },
      ],
    }
  );
  const [triggerParameter, setTriggerParameter] = useState(
    stored.triggerParameter || "Soil Moisture Deficiency (%)"
  );
  const [severity, setSeverity] = useState(stored.severity || "Medium");
  const [recommendationContent, setRecommendationContent] = useState(
    stored.recommendationContent || ""
  );
  const [jsonLogic, setJsonLogic] = useState(
    stored.jsonLogic ||
      `{
  "irrigation": "scheduled_increase",
  "volume_m3": 15,
  "duration_min": 45,
  "alert_sms": true
}`
  );
  const [modifications, setModifications] = useState(
    stored.modifications || recentModifications
  );
  const [entryName, setEntryName] = useState("");

  useEffect(() => {
    saveAdminContentState({
      activeTab,
      entries,
      triggerParameter,
      severity,
      recommendationContent,
      jsonLogic,
      modifications,
    });
  }, [
    activeTab,
    entries,
    triggerParameter,
    severity,
    recommendationContent,
    jsonLogic,
    modifications,
  ]);

  const tabIcons = {
    Crops: Sprout,
    Pests: Bug,
    "Advisory Logic": BrainCircuit,
    "Fertilizer Standards": TestTube2,
  };

  const addModification = (title, meta) => {
    setModifications((current) => [{ title, meta }, ...current].slice(0, 6));
  };

  const addEntry = () => {
    const trimmed = entryName.trim();
    if (!trimmed) return;

    const newEntry = {
      crop: trimmed,
      cycle: activeTab === "Crops" ? "120 Days" : activeTab === "Pests" ? "Monitored" : "Draft",
      zone: activeTab === "Crops" ? "Regional" : activeTab === "Pests" ? "All Regions" : "System",
      status: "Draft",
    };

    setEntries((current) => ({
      ...current,
      [activeTab]: [newEntry, ...(current[activeTab] || [])],
    }));
    addModification(
      `${activeTab.slice(0, -1) || activeTab} entry '${trimmed}' created`,
      "By AgriFeed Admin · just now"
    );
    setEntryName("");
  };

  const toggleStatus = (cropName) => {
    setEntries((current) => ({
      ...current,
      [activeTab]: (current[activeTab] || []).map((row) =>
        row.crop === cropName
          ? { ...row, status: row.status === "Verified" ? "Draft" : "Verified" }
          : row
      ),
    }));
    addModification(
      `${cropName} status updated`,
      "By AgriFeed Admin · just now"
    );
  };

  const removeEntry = (cropName) => {
    setEntries((current) => ({
      ...current,
      [activeTab]: (current[activeTab] || []).filter((row) => row.crop !== cropName),
    }));
    addModification(
      `${cropName} removed from ${activeTab}`,
      "By AgriFeed Admin · just now"
    );
  };

  const saveLogic = () => {
    addModification(
      `Advisory logic saved for ${triggerParameter}`,
      "System Save · just now"
    );
  };

  const visibleEntries = entries[activeTab] || [];

  return (
    <section className="management-page prototype-admin-content-page">
      <div className="prototype-admin-content-main">
        <div className="page-title-block prototype-admin-content-title">
          <h1>Content Management</h1>
          <p>Centralized database for crop intelligence and AI advisory logic standards.</p>
        </div>

        <div className="prototype-admin-content-actions">
          <button type="button" className="prototype-admin-secondary-button">
            <FileDown size={15} />
            <span>Export Data</span>
          </button>
          <div className="prototype-admin-entry-inline">
            <input
              type="text"
              value={entryName}
              onChange={(event) => setEntryName(event.target.value)}
              placeholder={`Add new ${activeTab.toLowerCase()} entry`}
            />
            <button type="button" className="prototype-admin-primary-button" onClick={addEntry}>
            <Plus size={16} />
            <span>Add New Entry</span>
            </button>
          </div>
        </div>

        <div className="prototype-admin-content-tabs">
          {Object.entries(tabIcons).map(([label, Icon]) => (
            <button
              key={label}
              type="button"
              className={activeTab === label ? "active" : ""}
              onClick={() => setActiveTab(label)}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="prototype-admin-content-grid">
          <div className="prototype-admin-content-left">
            <article className="prototype-panel prototype-admin-content-table-card">
              <div className="prototype-admin-content-card-head">
                <h2>{activeTab} Database</h2>
                <span>{visibleEntries.length} Total Entries</span>
              </div>

              <div className="prototype-admin-content-table">
                <div className="prototype-admin-content-table-head">
                  <span>{activeTab === "Pests" ? "Pest / Disease" : "Entry Name"}</span>
                  <span>{activeTab === "Advisory Logic" ? "Execution State" : "Growth Cycle"}</span>
                  <span>{activeTab === "Fertilizer Standards" ? "Coverage Zone" : "Climate Zone"}</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>

                {visibleEntries.map((row) => (
                  <div key={row.crop} className="prototype-admin-content-row">
                    <strong>{row.crop}</strong>
                    <span>{row.cycle}</span>
                    <span>{row.zone}</span>
                    <span className={row.status === "Verified" ? "prototype-admin-content-status verified" : "prototype-admin-content-status draft"}>
                      {row.status}
                    </span>
                    <div className="prototype-admin-content-row-actions">
                      <button type="button" onClick={() => toggleStatus(row.crop)}><Pencil size={16} /></button>
                      <button type="button" onClick={() => removeEntry(row.crop)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="prototype-admin-content-pagination">
                <button type="button">Previous</button>
                <div>
                  <button type="button" className="active">1</button>
                  <button type="button">2</button>
                  <button type="button">3</button>
                </div>
                <button type="button">Next</button>
              </div>
            </article>

            <article className="prototype-panel prototype-admin-logic-card">
              <div className="prototype-admin-content-card-head align-start">
                <div>
                  <h2>Edit Advisory Recommendation Logic</h2>
                  <p>Configure how the AI generates advice based on environmental triggers.</p>
                </div>
              </div>

              <div className="prototype-admin-logic-grid">
                <label>
                  <span>Trigger Parameter</span>
                  <select value={triggerParameter} onChange={(event) => setTriggerParameter(event.target.value)}>
                    <option>Soil Moisture Deficiency (%)</option>
                    <option>Leaf Temperature Spike</option>
                    <option>Nitrogen Deficit</option>
                  </select>
                </label>

                <div className="prototype-admin-severity-block">
                  <span>Severity Level</span>
                  <div className="prototype-admin-radio-row">
                    {["Low", "Medium", "Critical"].map((option) => (
                      <label key={option}>
                        <input
                          type="radio"
                          name="severity"
                          checked={severity === option}
                          onChange={() => setSeverity(option)}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <label className="prototype-admin-content-field">
                <span>Recommendation Content (Output for Farmer)</span>
                <textarea
                  rows="4"
                  placeholder="Enter the advice text that will be shown to users..."
                  value={recommendationContent}
                  onChange={(event) => setRecommendationContent(event.target.value)}
                />
              </label>

              <label className="prototype-admin-content-field">
                <span>Actionable Steps (.JSON Logic)</span>
                <textarea
                  rows="6"
                  className="code"
                  value={jsonLogic}
                  onChange={(event) => setJsonLogic(event.target.value)}
                />
              </label>

              <div className="prototype-admin-logic-actions">
                <button type="button" className="prototype-admin-secondary-button">Test Logic</button>
                <button type="button" className="prototype-admin-primary-button" onClick={saveLogic}>Save Recommendation</button>
              </div>
            </article>
          </div>

          <aside className="prototype-admin-content-right">
            <article className="prototype-panel prototype-admin-sync-card">
              <div className="prototype-admin-side-head">
                <TestTube2 size={18} />
                <h3>Update Fertilizer Standards</h3>
              </div>
              <p>Periodically sync local standards with global academic fertilizer benchmarks (FAO/USDA). Last synced: 14 Oct 2023.</p>
              <div className="prototype-admin-sync-list">
                {fertilizerCards.map((item) => (
                  <div key={item.title} className="prototype-admin-sync-item">
                    <strong>{item.title}</strong>
                    <span className={item.state === "Active" ? "active" : "pending"}>{item.state}</span>
                  </div>
                ))}
              </div>
              <button type="button" className="prototype-admin-primary-button full">
                <Sparkles size={15} />
                <span>Sync Guidelines Now</span>
              </button>
            </article>

            <article className="prototype-panel prototype-admin-recent-card">
              <div className="prototype-admin-side-head">
                <Clock3 size={18} />
                <h3>Recent Modifications</h3>
              </div>
              <div className="prototype-admin-recent-list">
                {recentModifications.map((item) => (
                  <div key={item.title}>
                    <strong>{item.title}</strong>
                    <span>{item.meta}</span>
                  </div>
                ))}
              </div>
              <button type="button" className="prototype-admin-text-link">View Full Audit Trail</button>
            </article>

            <article className="prototype-admin-help-card">
              <h3>Need Help?</h3>
              <p>Access the documentation for managing the AI-decision engine and knowledge graphs.</p>
              <button type="button">Documentation</button>
              <BookOpen size={58} />
            </article>
          </aside>
        </div>

        <footer className="prototype-admin-content-footer">
          <span>© 2023 AgriSupport Academic Research Project. All rights reserved.</span>
          <div>
            <span>System Status</span>
            <span>Terms of Access</span>
            <span>Privacy Policy</span>
          </div>
        </footer>
      </div>
    </section>
  );
}

export function RecommendationsPage() {
  const { user } = useAuth();
  return user?.role === "admin" ? <AdminContentManagementView /> : <FarmerRecommendationsView />;
}
