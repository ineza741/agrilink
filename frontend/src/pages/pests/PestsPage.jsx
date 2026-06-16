import {
  AlertTriangle,
  ArrowUpRight,
  Bug,
  Check,
  ChevronDown,
  CloudLightning,
  ImageUp,
  MapPinned,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFarmerData } from "../../context/FarmerDataContext";
import { downloadJsonFile, downloadTextFile } from "../../utils/actions";

const PEST_STORAGE_KEY = "agri-feed-pest-module-v1";

const diseaseLibrary = [
  {
    id: "late-blight",
    title: "Late Blight",
    subtitle: "Phytophthora infestans",
    tone: "leaf",
    crop: "Potato",
    symptoms: ["Yellow Spots", "White Mold"],
    treatment: {
      chemical: "Copper-based fungicide spray in 7-day intervals",
      organic: "Trichoderma bio-control + strict canopy ventilation",
    },
    prevention: "Avoid overhead irrigation and remove infected debris immediately.",
  },
  {
    id: "green-peach-aphid",
    title: "Green Peach Aphid",
    subtitle: "Myzus persicae",
    tone: "aphid",
    crop: "Vegetables",
    symptoms: ["Wilting", "Yellow Spots"],
    treatment: {
      chemical: "Selective systemic insecticide at threshold breach",
      organic: "Neem extract + beneficial predator release",
    },
    prevention: "Scout underside of leaves weekly and control alternate host weeds.",
  },
  {
    id: "powdery-mildew",
    title: "Powdery Mildew",
    subtitle: "Erysiphales sp.",
    tone: "mildew",
    crop: "Beans",
    symptoms: ["White Mold", "Yellow Spots"],
    treatment: {
      chemical: "Sulfur-based fungicide under dry canopy hours",
      organic: "Bicarbonate foliar wash with resistant variety rotation",
    },
    prevention: "Increase air movement and avoid excessive nitrogen application.",
  },
  {
    id: "desert-locust",
    title: "Desert Locust",
    subtitle: "Schistocerca gregaria",
    tone: "locust",
    crop: "Cereals",
    symptoms: ["Brown Holes", "Wilting"],
    treatment: {
      chemical: "Regional aerial control when swarms cross threshold",
      organic: "Community trench barriers and mechanical removal in early nymph stages",
    },
    prevention: "Trigger early warning action when regional hatch conditions intensify.",
  },
];

const cropOptions = ["Potato", "Maize", "Beans", "Tomato", "Vegetables", "Cereals"];
const symptomOptions = ["Yellow Spots", "Brown Holes", "White Mold", "Wilting"];

const outbreakHistorySeed = [
  { date: "Aug 2023", pathogen: "Fusarium oxysporum", severity: "Moderate", action: "Precision soil amendment" },
  { date: "May 2023", pathogen: "Spodoptera frugiperda", severity: "Extreme", action: "UAV-targeted spraying" },
  { date: "Jan 2023", pathogen: "Puccinia graminis", severity: "Low", action: "Controlled harvesting" },
  { date: "Dec 2022", pathogen: "Bemisia tabaci", severity: "Moderate", action: "Bio-control program" },
];

function createDefaultFarm() {
  return {
    id: "pest-default-farm",
    name: "Primary Advisory Plot",
    region: "Northern Highlands",
    landType: "Loamy",
    irrigationType: "Drip Irrigation",
    primaryCrop: "Potato",
    location: { lat: -1.94, lng: 29.87, mapX: 50, mapY: 50, label: "Primary advisory zone" },
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function hashFarm(farm) {
  return (
    Math.round(Math.abs(Number(farm?.location?.lat || 0)) * 100) +
    Math.round(Math.abs(Number(farm?.location?.lng || 0)) * 100) +
    Number(farm?.location?.mapX || 0) +
    Number(farm?.location?.mapY || 0) +
    Math.round(Number(farm?.sizeHectares || 0))
  );
}

function loadPestState() {
  try {
    return JSON.parse(localStorage.getItem(PEST_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function savePestState(state) {
  localStorage.setItem(PEST_STORAGE_KEY, JSON.stringify(state));
}

function computeRiskModel(farm, symptom, affectedArea, uploadedImageName) {
  const seed = hashFarm(farm);
  const humidity = clamp(58 + (seed % 32), 45, 92);
  const temperature = clamp(18 + (seed % 14), 16, 34);
  const rainfallPressure = clamp(22 + (seed % 51), 15, 91);
  const imageConfidenceBoost = uploadedImageName ? 4 : 0;
  const symptomBoost =
    symptom === "White Mold" ? 18 : symptom === "Yellow Spots" ? 12 : symptom === "Brown Holes" ? 16 : 10;

  const riskScore = clamp(
    Math.round(
      humidity * 0.35 +
        rainfallPressure * 0.24 +
        affectedArea * 0.22 +
        symptomBoost +
        imageConfidenceBoost -
        (temperature > 30 ? 8 : 0)
    ),
    18,
    96
  );

  const matchingLibrary =
    diseaseLibrary.find(
      (item) =>
        item.symptoms.includes(symptom) &&
        (item.crop === farm.primaryCrop || item.crop === "Vegetables" || item.crop === "Cereals")
    ) || diseaseLibrary[0];

  const severity = riskScore >= 78 ? "High" : riskScore >= 52 ? "Moderate" : "Low";
  const alerts = [
    riskScore >= 78
      ? {
          title: "Critical Detection: Immediate Action Required",
          message:
            "Potential outbreak thresholds have been crossed for the selected field. Rapid intervention is advised within the next 6-12 hours.",
        }
      : null,
    rainfallPressure >= 70
      ? {
          title: "Rain-assisted spread warning",
          message:
            "Regional rainfall probability may accelerate spore or pest migration across neighboring plots.",
        }
      : null,
  ].filter(Boolean);

  const regionalOutbreak = {
    activeClusters: 2 + (seed % 4),
    hotspot: farm.region,
    spreadTrend: riskScore >= 78 ? "Accelerating" : riskScore >= 52 ? "Watch closely" : "Contained",
  };

  return {
    humidity,
    temperature,
    rainfallPressure,
    riskScore,
    severity,
    library: matchingLibrary,
    alerts,
    regionalOutbreak,
  };
}

export function PestsPage() {
  const { currentFarms } = useFarmerData();
  const farms = currentFarms.length ? currentFarms : [createDefaultFarm()];
  const stored = useMemo(() => loadPestState(), []);
  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || "pest-default-farm");
  const [selectedCrop, setSelectedCrop] = useState(farms[0]?.primaryCrop || "Potato");
  const [selectedSymptom, setSelectedSymptom] = useState("Yellow Spots");
  const [affectedArea, setAffectedArea] = useState(34);
  const [uploadedImageName, setUploadedImageName] = useState("");
  const [librarySearch, setLibrarySearch] = useState("");
  const [historyLog, setHistoryLog] = useState(() => stored.historyLog || outbreakHistorySeed);

  useEffect(() => {
    if (!farms.some((farm) => farm.id === selectedFarmId)) {
      setSelectedFarmId(farms[0]?.id || "pest-default-farm");
    }
  }, [farms, selectedFarmId]);

  useEffect(() => {
    savePestState({ historyLog });
  }, [historyLog]);

  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === selectedFarmId) || farms[0],
    [farms, selectedFarmId]
  );

  useEffect(() => {
    setSelectedCrop(selectedFarm?.primaryCrop || "Potato");
  }, [selectedFarm]);

  const riskModel = useMemo(
    () => computeRiskModel({ ...selectedFarm, primaryCrop: selectedCrop }, selectedSymptom, affectedArea, uploadedImageName),
    [affectedArea, selectedCrop, selectedFarm, selectedSymptom, uploadedImageName]
  );

  const displayedLibrary = useMemo(
    () =>
      diseaseLibrary.filter((item) => {
        const query = librarySearch.toLowerCase();
        return (
          !query ||
          item.title.toLowerCase().includes(query) ||
          item.subtitle.toLowerCase().includes(query) ||
          item.crop.toLowerCase().includes(query)
        );
      }),
    [librarySearch]
  );

  const treatmentRecommendations = [
    { label: "Chemical treatment", value: riskModel.library.treatment.chemical },
    { label: "Organic / IPM option", value: riskModel.library.treatment.organic },
    { label: "Preventive measure", value: riskModel.library.prevention },
  ];

  const hotspotIndex = useMemo(() => hashFarm(selectedFarm) % 24, [selectedFarm]);
  const mapCells = useMemo(
    () =>
      Array.from({ length: 24 }, (_, index) => {
        const row = Math.floor(index / 6);
        const col = (index % 6) + 1;
        const distance = Math.abs(index - hotspotIndex);
        const tone =
          index === hotspotIndex
            ? "critical"
            : distance === 1 || distance === 6
              ? "elevated"
              : distance === 2 || distance === 5
                ? "watch"
                : "normal";

        return { id: `${String.fromCharCode(65 + row)}${col}`, tone };
      }),
    [hotspotIndex]
  );

  const submitSymptomCheck = () => {
    const event = {
      date: new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date()),
      pathogen: riskModel.library.subtitle,
      severity: riskModel.severity,
      action:
        riskModel.severity === "High"
          ? "Immediate intervention"
          : riskModel.severity === "Moderate"
            ? "Field scouting"
            : "Observation",
    };

    setHistoryLog((current) => [event, ...current].slice(0, 8));
  };

  const downloadProtocol = () => {
    downloadTextFile(
      `${riskModel.library.title.toLowerCase().replace(/\s+/g, "-")}-protocol.txt`,
      `Protocol: ${riskModel.library.title}\n\nChemical treatment:\n${riskModel.library.treatment.chemical}\n\nOrganic / IPM:\n${riskModel.library.treatment.organic}\n\nPreventive measure:\n${riskModel.library.prevention}`
    );
  };

  const downloadHistoryReport = () => {
    downloadJsonFile("pest-disease-history.json", {
      farm: selectedFarm,
      crop: selectedCrop,
      symptom: selectedSymptom,
      affectedArea,
      riskScore: riskModel.riskScore,
      severity: riskModel.severity,
      historyLog,
    });
  };

  return (
    <section className="management-page prototype-pest-page">
      <div className="prototype-pest-shell">
        <div className="prototype-pest-main">
          <div className="page-title-block prototype-pest-title">
            <h1>Pest &amp; Disease Intelligence</h1>
            <p>
              Academic-grade risk assessment combining crop symptoms, farm location, and outbreak
              intelligence for each registered plot.
            </p>
          </div>

          {riskModel.alerts[0] ? (
            <article className="prototype-pest-banner">
              <div className="prototype-pest-banner-icon">
                <AlertTriangle size={22} />
              </div>
              <div className="prototype-pest-banner-copy">
                <strong>{riskModel.alerts[0].title}</strong>
                <p>{riskModel.alerts[0].message}</p>
              </div>
              <button type="button" onClick={downloadProtocol}>Review Protocol</button>
            </article>
          ) : null}

          <div className="prototype-pest-bento">
            <article className="prototype-panel prototype-pest-risk-card prototype-pest-span-8">
              <div className="prototype-pest-risk-head">
                <div>
                  <h2>Regional Threat Level</h2>
                  <p>Aggregate risk across 42 monitored variables</p>
                </div>
                <span>{riskModel.severity} Alert</span>
              </div>

              <div className="prototype-pest-risk-summary">
                <div className="prototype-pest-risk-score">
                  <strong>{riskModel.riskScore}</strong>
                  <small>/100</small>
                </div>

                <div className="prototype-pest-risk-change">
                  <ArrowUpRight size={16} />
                  <div>
                    <span>+{Math.max(6, Math.round(riskModel.rainfallPressure / 6))}% vs previous 24h</span>
                    <small>
                      Risk velocity:{" "}
                      {riskModel.severity === "High"
                        ? "Accelerating"
                        : riskModel.severity === "Moderate"
                          ? "Watch closely"
                          : "Contained"}
                    </small>
                  </div>
                </div>
              </div>

              <div className="prototype-pest-risk-bar">
                <div className="low" />
                <div className="mid" />
                <div className="high" />
              </div>

              <div className="prototype-pest-risk-scale">
                <span>Normal</span>
                <span>Elevated</span>
                <span>Moderate</span>
                <span>Critical</span>
              </div>

              <div className="prototype-pest-risk-note">
                <Check size={16} />
                <p>
                  Humidity ({riskModel.humidity}%) and temperature ({riskModel.temperature}C) support{" "}
                  <em>{riskModel.library.subtitle}</em> risk development on {selectedFarm.name}.
                </p>
              </div>
            </article>

            <aside className="prototype-pest-advice-card prototype-pest-span-4">
              <div className="prototype-pest-advice-head">
                <Sparkles size={18} />
                <h2>Intelligence-Led Actions</h2>
              </div>

              <ul>
                {treatmentRecommendations.map((item) => (
                  <li key={item.label}>
                    <strong>{item.label}:</strong> {item.value}
                  </li>
                ))}
              </ul>

              <button type="button" onClick={downloadProtocol}>Download Protocol PDF</button>
            </aside>

            <article className="prototype-panel prototype-pest-symptom-card prototype-pest-span-6">
              <div className="prototype-pest-card-head">
                <div>
                  <h2>AI Symptom Diagnostic</h2>
                  <p>Field-level identification wizard</p>
                </div>
                <span>Step 1 of 3</span>
              </div>

              <label>
                <span>Select Farm Location</span>
                <div className="prototype-pest-select">
                  <select
                    value={selectedFarmId}
                    onChange={(event) => setSelectedFarmId(event.target.value)}
                    className="prototype-pest-inline-select"
                  >
                    {farms.map((farm) => (
                      <option key={farm.id} value={farm.id}>
                        {farm.name} - {farm.region}
                      </option>
                    ))}
                  </select>
                  <MapPinned size={18} />
                </div>
              </label>

              <label>
                <span>Select Crop Taxonomy</span>
                <div className="prototype-pest-select">
                  <select
                    value={selectedCrop}
                    onChange={(event) => setSelectedCrop(event.target.value)}
                    className="prototype-pest-inline-select"
                  >
                    {cropOptions.map((crop) => (
                      <option key={crop} value={crop}>
                        {crop}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={18} />
                </div>
              </label>

              <div className="prototype-pest-symptoms">
                <span>Primary Observable Symptoms</span>
                <div className="prototype-pest-symptom-grid">
                  {symptomOptions.map((symptom) => (
                    <button
                      key={symptom}
                      type="button"
                      className={selectedSymptom === symptom ? "active" : ""}
                      onClick={() => setSelectedSymptom(symptom)}
                    >
                      {symptom}
                    </button>
                  ))}
                </div>
              </div>

              <div className="prototype-pest-slider">
                <span>Affected Canopy Coverage</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={affectedArea}
                  onChange={(event) => setAffectedArea(Number(event.target.value))}
                  className="prototype-pest-range-input"
                />
                <div className="prototype-pest-slider-scale">
                  <small>0% (Isolated)</small>
                  <small>{affectedArea}% detected</small>
                  <small>100% (Field-wide)</small>
                </div>
              </div>

              <div className="prototype-pest-upload-panel">
                <div className="prototype-pest-upload-head">
                  <ImageUp size={16} />
                  <span>Image-based symptom recognition</span>
                </div>
                <label className="prototype-pest-upload-box">
                  <Upload size={18} />
                  <span>{uploadedImageName || "Upload crop image for symptom recognition"}</span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={(event) => setUploadedImageName(event.target.files?.[0]?.name || "")}
                  />
                </label>
              </div>

              <div className="prototype-pest-step-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setSelectedSymptom("Yellow Spots");
                    setAffectedArea(20);
                    setUploadedImageName("");
                  }}
                >
                  Reset Form
                </button>
                <button type="button" className="primary" onClick={submitSymptomCheck}>
                  Continue To Scan
                </button>
              </div>
            </article>

            <article className="prototype-panel prototype-pest-map-card prototype-pest-span-6">
              <div className="prototype-pest-card-head">
                <div>
                  <h2>Spatial Risk Distribution</h2>
                  <p>Real-time telemetry map</p>
                </div>
                <div className="prototype-pest-map-legend">
                  <span><i className="critical" /> Critical</span>
                  <span><i className="normal" /> Nominal</span>
                </div>
              </div>

              <div className="prototype-pest-map-surface">
                <div className="prototype-pest-map-grid">
                  {mapCells.map((cell) => (
                    <div key={cell.id} className={`prototype-pest-map-cell ${cell.tone}`}>
                      {cell.tone === "critical" || cell.tone === "elevated" ? cell.id : ""}
                    </div>
                  ))}
                </div>

                <div className="prototype-pest-map-location">
                  <MapPinned size={16} />
                  <div>
                    <strong>{selectedFarm.region}</strong>
                    <span>
                      {typeof selectedFarm.location?.lat === "number"
                        ? selectedFarm.location.lat.toFixed(4)
                        : selectedFarm.location?.lat}
                      ,{" "}
                      {typeof selectedFarm.location?.lng === "number"
                        ? selectedFarm.location.lng.toFixed(4)
                        : selectedFarm.location?.lng}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          </div>

          <div className="prototype-pest-bottom-grid">
            <article className="prototype-panel prototype-pest-history-card">
              <div className="prototype-pest-card-head">
                <h2>Historical Pathogen Records</h2>
                <button type="button" className="prototype-pest-table-action" onClick={downloadHistoryReport}>Generate Report</button>
              </div>

              <div className="prototype-pest-history-table">
                <div className="prototype-pest-history-head">
                  <span>Detection Date</span>
                  <span>Confirmed Pathogen</span>
                  <span>Severity Index</span>
                  <span>Intervention Method</span>
                </div>

                {historyLog.map((row) => (
                  <div key={`${row.date}-${row.pathogen}`} className="prototype-pest-history-row">
                    <span>{row.date}</span>
                    <strong>{row.pathogen}</strong>
                    <span className={`prototype-pest-severity ${row.severity.toLowerCase().replace(" ", "-")}`}>
                      {row.severity}
                    </span>
                    <span>{row.action}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="prototype-panel prototype-pest-activity-card">
              <div className="prototype-pest-card-head">
                <h2>Security &amp; Activity Log</h2>
              </div>

              <div className="prototype-pest-activity-list">
                <div className="prototype-pest-activity-item">
                  <i className="live" />
                  <div>
                    <strong>Today, 09:42 AM</strong>
                    <p>
                      Node alert triggered on <em>{selectedFarm.name}</em> after humidity crossed{" "}
                      {riskModel.humidity}% with heightened canopy moisture pressure.
                    </p>
                  </div>
                </div>

                <div className="prototype-pest-activity-item">
                  <i className="review" />
                  <div>
                    <strong>Today, 07:15 AM</strong>
                    <p>
                      Diagnostic model aligned with <em>{riskModel.library.title}</em>. Treatment
                      guidance refreshed for the active plot.
                    </p>
                  </div>
                </div>

                <div className="prototype-pest-regional-box">
                  <div className="prototype-pest-regional-head">
                    <CloudLightning size={16} />
                    <strong>Regional outbreak tracking</strong>
                  </div>
                  <p>
                    {riskModel.regionalOutbreak.activeClusters} nearby hotspots in {riskModel.regionalOutbreak.hotspot}. Trend:{" "}
                    {riskModel.regionalOutbreak.spreadTrend}.
                  </p>
                </div>
              </div>
            </article>
          </div>

          <div className="prototype-pest-library-head">
            <div>
              <h2>Pathogen Intelligence Library</h2>
              <p>Image-backed knowledge base with IPM options and symptom cues</p>
            </div>
            <div className="prototype-pest-library-search">
              <Search size={15} />
              <input
                type="text"
                placeholder="Filter disease library..."
                value={librarySearch}
                onChange={(event) => setLibrarySearch(event.target.value)}
              />
            </div>
          </div>

          <div className="prototype-pest-library-grid">
            {displayedLibrary.map((card) => (
              <article key={card.id} className="prototype-pest-library-card">
                <div className={`prototype-pest-library-image ${card.tone}`} />
                <div className="prototype-pest-library-copy">
                  <strong>{card.title}</strong>
                  <span>{card.subtitle}</span>
                  <p>{card.crop} · Symptoms: {card.symptoms.join(", ")}</p>
                  <div className="prototype-pest-library-tags">
                    <span>IPM Advice</span>
                    <span>{card.crop}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <article className="prototype-panel prototype-pest-treatment-panel">
            <div className="prototype-pest-card-head">
              <h2>Integrated Pest Management Advice</h2>
            </div>
            <div className="prototype-pest-treatment-grid">
              <div>
                <ShieldCheck size={16} />
                <strong>Preventive program</strong>
                <p>{riskModel.library.prevention}</p>
              </div>
              <div>
                <Bug size={16} />
                <strong>Chemical option</strong>
                <p>{riskModel.library.treatment.chemical}</p>
              </div>
              <div>
                <Sparkles size={16} />
                <strong>Organic option</strong>
                <p>{riskModel.library.treatment.organic}</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

