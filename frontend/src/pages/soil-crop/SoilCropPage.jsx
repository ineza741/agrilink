import {
  AlertTriangle,
  Download,
  FileClock,
  Filter,
  FlaskConical,
  Leaf,
  MapPinned,
  RotateCcw,
  Search,
  Sprout,
  TestTubeDiagonal,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFarmerData } from "../../context/FarmerDataContext";

const cropLibrary = [
  {
    name: "Winter Wheat",
    season: "Cool Season",
    region: "Northern Highlands",
    soilTypes: ["Loamy", "Clay Loam"],
    phRange: [6.0, 7.2],
    npk: { n: 42, p: 24, k: 20 },
    organicMatterMin: 2.4,
    rotationTag: "Low Water Need",
    cycle: "4-5 Mo Cycle",
  },
  {
    name: "Maize (Corn)",
    season: "Warm Season",
    region: "Northern Highlands",
    soilTypes: ["Loamy", "Sandy Loam"],
    phRange: [5.8, 7.0],
    npk: { n: 55, p: 28, k: 26 },
    organicMatterMin: 2.8,
    rotationTag: "Moderate Water",
    cycle: "3-4 Mo Cycle",
  },
  {
    name: "Soybean",
    season: "Warm Season",
    region: "Eastern Delta",
    soilTypes: ["Loamy", "Silty"],
    phRange: [6.0, 7.4],
    npk: { n: 22, p: 18, k: 20 },
    organicMatterMin: 2.2,
    rotationTag: "Nitrogen Fixing",
    cycle: "3 Mo Cycle",
  },
  {
    name: "Sorghum",
    season: "Dry Season",
    region: "Southern Plains",
    soilTypes: ["Sandy Loam", "Loamy"],
    phRange: [5.6, 7.5],
    npk: { n: 30, p: 18, k: 16 },
    organicMatterMin: 1.8,
    rotationTag: "Drought Tolerant",
    cycle: "4 Mo Cycle",
  },
  {
    name: "Irish Potato",
    season: "Cool Season",
    region: "Western Valley",
    soilTypes: ["Sandy Loam", "Loamy"],
    phRange: [5.2, 6.6],
    npk: { n: 38, p: 30, k: 36 },
    organicMatterMin: 3.0,
    rotationTag: "High Potassium",
    cycle: "3-4 Mo Cycle",
  },
  {
    name: "Beans",
    season: "Rainy Season",
    region: "Eastern Delta",
    soilTypes: ["Silty", "Loamy"],
    phRange: [6.0, 7.2],
    npk: { n: 20, p: 16, k: 18 },
    organicMatterMin: 2.0,
    rotationTag: "Rotation Friendly",
    cycle: "2-3 Mo Cycle",
  },
];

const textureOptions = ["Loamy", "Sandy Loam", "Clay Loam", "Silty"];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function scoreState(value, healthyThreshold, moderateThreshold) {
  if (value >= healthyThreshold) return "Sufficient";
  if (value >= moderateThreshold) return "Moderate";
  return "Deficient";
}

function average(array) {
  return array.reduce((sum, value) => sum + value, 0) / Math.max(array.length, 1);
}

function createDefaultFarm() {
  return {
    id: "soil-default-farm",
    name: "Primary Demonstration Farm",
    region: "Northern Highlands",
    primaryCrop: "Maize",
    landType: "Loamy",
    sizeHectares: 12,
    location: { mapX: 52, mapY: 46, label: "Default soil-testing sector" },
    history: [],
  };
}

function calculateSoilAnalysis(form, selectedFarm) {
  const values = {
    ph: Number(form.ph || 0),
    nitrogen: Number(form.nitrogen || 0),
    phosphorus: Number(form.phosphorus || 0),
    potassium: Number(form.potassium || 0),
    organicMatter: Number(form.organicMatter || 0),
  };

  const phScore = 100 - Math.min(Math.abs(values.ph - 6.5) * 18, 42);
  const nScore = clamp((values.nitrogen / 55) * 100, 0, 100);
  const pScore = clamp((values.phosphorus / 30) * 100, 0, 100);
  const kScore = clamp((values.potassium / 35) * 100, 0, 100);
  const omScore = clamp((values.organicMatter / 4.2) * 100, 0, 100);
  const textureBonus =
    form.texture === "Loamy" ? 10 : form.texture === "Sandy Loam" ? 6 : form.texture === "Clay Loam" ? 4 : 3;

  const healthScore = Math.round(clamp(average([phScore, nScore, pScore, kScore, omScore]) + textureBonus, 18, 96));
  const degradationAlerts = [];

  if (values.organicMatter < 2) {
    degradationAlerts.push("Organic matter is low. Soil structure may degrade under repeated tillage.");
  }
  if (values.ph < 5.7 || values.ph > 7.5) {
    degradationAlerts.push("Soil pH is outside the recommended band for most field crops.");
  }
  if (values.potassium < 18) {
    degradationAlerts.push("Low potassium can increase drought sensitivity and poor stem strength.");
  }

  const suitableCrops = cropLibrary
    .map((crop) => {
      const soilTypeBonus = crop.soilTypes.includes(form.texture) ? 18 : 0;
      const regionBonus = crop.region === selectedFarm.region ? 14 : 0;
      const phFit = values.ph >= crop.phRange[0] && values.ph <= crop.phRange[1] ? 24 : 10;
      const npkFit =
        average([
          clamp(100 - Math.abs(values.nitrogen - crop.npk.n) * 1.6, 20, 100),
          clamp(100 - Math.abs(values.phosphorus - crop.npk.p) * 2.1, 20, 100),
          clamp(100 - Math.abs(values.potassium - crop.npk.k) * 1.9, 20, 100),
        ]) * 0.34;
      const organicMatterFit = values.organicMatter >= crop.organicMatterMin ? 18 : 8;
      const totalScore = Math.round(clamp(soilTypeBonus + regionBonus + phFit + npkFit + organicMatterFit, 35, 98));

      return {
        ...crop,
        match: totalScore,
        note:
          totalScore >= 85
            ? `Strong fit for ${selectedFarm.region} with your current soil chemistry.`
            : totalScore >= 70
              ? "Usable with moderate nutrient adjustment and field monitoring."
              : "Possible crop option, but nutrient balancing is needed before planting.",
      };
    })
    .sort((a, b) => b.match - a.match);

  const fertilizerRows = [
    {
      nutrient: "Nitrogen (N)",
      state: scoreState(values.nitrogen, 42, 24),
      fertilizer:
        values.nitrogen >= 42 ? "No additional N needed" : values.nitrogen >= 24 ? "Urea top-dress" : "Urea + compost manure",
      dosage: Math.max(0, Number((clamp((42 - values.nitrogen) * 1.35, 0, 68)).toFixed(1))),
      tone: values.nitrogen >= 42 ? "green" : values.nitrogen >= 24 ? "amber" : "red",
    },
    {
      nutrient: "Phosphorus (P)",
      state: scoreState(values.phosphorus, 24, 16),
      fertilizer:
        values.phosphorus >= 24
          ? "Maintenance phosphorus only"
          : values.phosphorus >= 16
            ? "Diammonium Phosphate (DAP)"
            : "Triple Super Phosphate (TSP)",
      dosage: Math.max(0, Number((clamp((24 - values.phosphorus) * 1.25, 0, 52)).toFixed(1))),
      tone: values.phosphorus >= 24 ? "green" : values.phosphorus >= 16 ? "amber" : "red",
    },
    {
      nutrient: "Potassium (K)",
      state: scoreState(values.potassium, 22, 16),
      fertilizer:
        values.potassium >= 22
          ? "Balanced K maintenance"
          : values.potassium >= 16
            ? "Muriate of Potash (MOP)"
            : "Sulphate of Potash + organic mulch",
      dosage: Math.max(0, Number((clamp((22 - values.potassium) * 1.9, 0, 60)).toFixed(1))),
      tone: values.potassium >= 22 ? "green" : values.potassium >= 16 ? "amber" : "red",
    },
    {
      nutrient: "Organic Matter",
      state: values.organicMatter >= 3 ? "Optimal" : values.organicMatter >= 2 ? "Moderate" : "Low",
      fertilizer:
        values.organicMatter >= 3
          ? "Residue retention only"
          : values.organicMatter >= 2
            ? "Compost mulch"
            : "Compost + cover crop residues",
      dosage: Math.max(0, Number((clamp((3 - values.organicMatter) * 70, 0, 180)).toFixed(1))),
      tone: values.organicMatter >= 3 ? "green" : values.organicMatter >= 2 ? "amber" : "red",
    },
  ];

  const recommendationPanel = {
    primary: suitableCrops[0],
    secondary: suitableCrops[1],
    recommendation:
      suitableCrops[0]?.match >= 85
        ? `Prioritize ${suitableCrops[0].name} on ${selectedFarm.name} and rotate with ${suitableCrops[1]?.name || "legumes"} next season.`
        : `Apply nutrient corrections before planting. ${suitableCrops[0]?.name} is currently the strongest fit after soil balancing.`,
  };

  const cropRotationPlan = [
    `${selectedFarm.primaryCrop || suitableCrops[0].name} -> ${suitableCrops[1]?.name || "Soybean"} -> Cover crop`,
    values.organicMatter < 2.5
      ? "Include legumes or cover crops next cycle to rebuild soil organic matter."
      : "Maintain residue return to preserve current soil structure.",
  ];

  return {
    values,
    healthScore,
    healthLabel: healthScore >= 80 ? "Excellent" : healthScore >= 65 ? "Good" : healthScore >= 50 ? "Moderate" : "Low",
    suitableCrops,
    fertilizerRows,
    degradationAlerts,
    recommendationPanel,
    cropRotationPlan,
  };
}

export function SoilCropPage() {
  const { currentFarms } = useFarmerData();
  const farms = currentFarms.length ? currentFarms : [createDefaultFarm()];
  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || "soil-default-farm");
  const [libraryFilters, setLibraryFilters] = useState({
    search: "",
    season: "All",
    region: "All",
    soilType: "All",
  });
  const [labFileName, setLabFileName] = useState("");
  const [form, setForm] = useState({
    ph: "6.5",
    nitrogen: "38",
    phosphorus: "21",
    potassium: "17",
    organicMatter: "2.7",
    texture: "Loamy",
  });
  const [submittedForm, setSubmittedForm] = useState(form);

  useEffect(() => {
    if (!farms.some((farm) => farm.id === selectedFarmId)) {
      setSelectedFarmId(farms[0]?.id || "soil-default-farm");
    }
  }, [farms, selectedFarmId]);

  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === selectedFarmId) || farms[0],
    [farms, selectedFarmId]
  );

  const analysis = useMemo(
    () => calculateSoilAnalysis(submittedForm, selectedFarm),
    [selectedFarm, submittedForm]
  );

  const cropLibraryView = useMemo(() => {
    return cropLibrary.filter((crop) => {
      const matchesSearch =
        !libraryFilters.search ||
        crop.name.toLowerCase().includes(libraryFilters.search.toLowerCase()) ||
        crop.rotationTag.toLowerCase().includes(libraryFilters.search.toLowerCase());
      const matchesSeason = libraryFilters.season === "All" || crop.season === libraryFilters.season;
      const matchesRegion = libraryFilters.region === "All" || crop.region === libraryFilters.region;
      const matchesSoilType =
        libraryFilters.soilType === "All" || crop.soilTypes.includes(libraryFilters.soilType);

      return matchesSearch && matchesSeason && matchesRegion && matchesSoilType;
    });
  }, [libraryFilters]);

  const suitabilityMatrix = useMemo(() => {
    return cropLibraryView.slice(0, 6).map((crop) => ({
      name: crop.name,
      compatibility:
        analysis.suitableCrops.find((item) => item.name === crop.name)?.match ||
        calculateSoilAnalysis(submittedForm, selectedFarm).suitableCrops.find((item) => item.name === crop.name)?.match ||
        0,
    }));
  }, [analysis.suitableCrops, cropLibraryView, selectedFarm, submittedForm]);

  const handleAnalyze = () => {
    setSubmittedForm(form);
  };

  return (
    <section className="management-page prototype-soil-module">
      <div className="prototype-soil-head">
        <div className="page-title-block prototype-soil-title">
          <h1>Soil &amp; Crop Analysis</h1>
          <p>
            Soil nutrient interpretation, crop suitability analysis, fertilizer planning, and
            field-level crop rotation guidance for each registered farm.
          </p>
        </div>

        <div className="prototype-soil-head-actions">
          <button type="button" className="prototype-soil-action secondary">
            <Download size={15} />
            <span>Export PDF</span>
          </button>
          <button type="button" className="prototype-soil-action primary">
            <FileClock size={15} />
            <span>View History</span>
          </button>
        </div>
      </div>

      <div className="prototype-soil-module-toolbar">
        <label className="prototype-soil-toolbar-field">
          <span>Active farm</span>
          <select value={selectedFarmId} onChange={(event) => setSelectedFarmId(event.target.value)}>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name} - {farm.region}
              </option>
            ))}
          </select>
        </label>

        <label className="prototype-soil-toolbar-field">
          <span>Lab report upload</span>
          <div className="prototype-soil-upload-inline">
            <Upload size={15} />
            <input
              type="file"
              accept=".pdf,.csv,.xlsx,.jpg,.jpeg,.png"
              onChange={(event) => setLabFileName(event.target.files?.[0]?.name || "")}
            />
            <em>{labFileName || "Upload digital lab result"}</em>
          </div>
        </label>
      </div>

      <div className="prototype-soil-grid functional">
        <div className="prototype-soil-left">
          <article className="prototype-panel soil-input-panel">
            <div className="prototype-soil-panel-title">
              <h2>
                <TestTubeDiagonal size={19} />
                <span>Soil Test Input</span>
              </h2>
            </div>

            <div className="prototype-soil-form-grid">
              <label>
                <span>pH Level</span>
                <input
                  type="number"
                  step="0.1"
                  value={form.ph}
                  onChange={(event) => setForm((current) => ({ ...current, ph: event.target.value }))}
                />
              </label>
              <label>
                <span>Nitrogen (N)</span>
                <input
                  type="number"
                  value={form.nitrogen}
                  onChange={(event) => setForm((current) => ({ ...current, nitrogen: event.target.value }))}
                />
              </label>
              <label>
                <span>Phosphorus (P)</span>
                <input
                  type="number"
                  value={form.phosphorus}
                  onChange={(event) => setForm((current) => ({ ...current, phosphorus: event.target.value }))}
                />
              </label>
              <label>
                <span>Potassium (K)</span>
                <input
                  type="number"
                  value={form.potassium}
                  onChange={(event) => setForm((current) => ({ ...current, potassium: event.target.value }))}
                />
              </label>
              <label>
                <span>Organic Matter (%)</span>
                <input
                  type="number"
                  step="0.1"
                  value={form.organicMatter}
                  onChange={(event) => setForm((current) => ({ ...current, organicMatter: event.target.value }))}
                />
              </label>
              <label>
                <span>Texture</span>
                <select
                  value={form.texture}
                  onChange={(event) => setForm((current) => ({ ...current, texture: event.target.value }))}
                >
                  {textureOptions.map((texture) => (
                    <option key={texture} value={texture}>
                      {texture}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button type="button" className="prototype-soil-submit" onClick={handleAnalyze}>
              Analyze Soil &amp; Generate Report
            </button>
          </article>

          <article className="prototype-panel soil-score-panel">
            <div className="soil-panel-header-row">
              <h3>Soil Health Score</h3>
              <span className={`soil-score-badge ${analysis.healthLabel.toLowerCase()}`}>{analysis.healthLabel}</span>
            </div>
            <div className="soil-score-ring">
              <div className="soil-score-ring-inner">
                <strong>{analysis.healthScore}</strong>
                <span>{analysis.healthLabel}</span>
              </div>
            </div>
            <p>
              This score combines pH balance, N-P-K availability, organic matter, and texture
              quality for {selectedFarm.name}.
            </p>
          </article>

          <article className="prototype-panel soil-map-panel">
            <div className="prototype-soil-panel-title">
              <h2>
                <MapPinned size={19} />
                <span>Interactive Soil Map Overlay</span>
              </h2>
            </div>
            <div className="soil-map-overlay">
              <div className="soil-map-grid" />
              <div className="soil-map-layer low" />
              <div className="soil-map-layer medium" />
              <div
                className="soil-map-pin"
                style={{
                  left: `${selectedFarm.location?.mapX ?? 52}%`,
                  top: `${selectedFarm.location?.mapY ?? 46}%`,
                }}
              />
              <div className="soil-map-legend">
                <span><i className="low" /> Low fertility pocket</span>
                <span><i className="medium" /> Balanced zone</span>
                <span><i className="high" /> Best response zone</span>
              </div>
            </div>
          </article>
        </div>

        <div className="prototype-soil-right">
          <article className="prototype-panel soil-crops-panel">
            <div className="prototype-soil-panel-title with-badge">
              <h2>
                <Leaf size={19} />
                <span>Recommendation Panel</span>
              </h2>
              <span className="prototype-soil-badge">Top Yield Confidence</span>
            </div>

            <div className="prototype-crop-grid">
              {analysis.suitableCrops.slice(0, 3).map((crop, index) => (
                <article
                  key={crop.name}
                  className={index === 2 ? "prototype-crop-card full" : "prototype-crop-card"}
                >
                  <div className={`prototype-crop-thumb ${index === 0 ? "gold" : index === 1 ? "green" : "olive"}`} />
                  <div className="prototype-crop-copy">
                    <div className="prototype-crop-top">
                      <h3>{crop.name}</h3>
                      <strong>{crop.match}% Match</strong>
                    </div>
                    <p>{crop.note}</p>
                    <div className="prototype-crop-tags">
                      <span>{crop.rotationTag}</span>
                      <span>{crop.cycle}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="soil-recommendation-banner">
              <Sprout size={18} />
              <p>{analysis.recommendationPanel.recommendation}</p>
            </div>
          </article>

          <article className="prototype-panel soil-suitability-panel">
            <div className="prototype-soil-panel-title">
              <h2>
                <Filter size={18} />
                <span>Crop Suitability Matrix</span>
              </h2>
            </div>
            <div className="soil-suitability-table">
              <div className="soil-suitability-head">
                <span>Crop</span>
                <span>Compatibility</span>
                <span>Decision</span>
              </div>
              {suitabilityMatrix.map((item) => (
                <div key={item.name} className="soil-suitability-row">
                  <strong>{item.name}</strong>
                  <div className="soil-suitability-meter">
                    <div style={{ width: `${item.compatibility}%` }} />
                  </div>
                  <span className={`soil-suitability-tag ${item.compatibility >= 85 ? "best" : item.compatibility >= 70 ? "good" : "watch"}`}>
                    {item.compatibility >= 85 ? "Best Fit" : item.compatibility >= 70 ? "Good Fit" : "Needs Adjustment"}
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article className="prototype-panel soil-fertilizer-panel">
            <div className="prototype-soil-panel-title">
              <h2>
                <FlaskConical size={19} />
                <span>Fertilizer Requirement Calculation</span>
              </h2>
            </div>

            <div className="soil-fertilizer-table">
              <div className="soil-fertilizer-head">
                <span>Nutrient</span>
                <span>Current State</span>
                <span>Recommended Fertilizer</span>
                <span>Dosage (kg/acre)</span>
              </div>

              {analysis.fertilizerRows.map((row) => (
                <div key={row.nutrient} className="soil-fertilizer-row">
                  <strong>{row.nutrient}</strong>
                  <span className="soil-state">
                    <i className={row.tone} />
                    {row.state}
                  </span>
                  <span>{row.fertilizer}</span>
                  <strong className="soil-dosage">{row.dosage}</strong>
                </div>
              ))}
            </div>

            <div className="soil-tip-banner">
              <Sprout size={18} />
              <p>
                Split nutrient application across early and mid growth stages to reduce runoff
                losses and improve crop nutrient recovery.
              </p>
            </div>
          </article>

          <div className="soil-lower-grid">
            <article className="prototype-panel soil-library-panel">
              <div className="prototype-soil-panel-title">
                <h2>
                  <Search size={18} />
                  <span>Crop Library Browser</span>
                </h2>
              </div>
              <div className="soil-library-filters">
                <input
                  type="text"
                  placeholder="Search crop library..."
                  value={libraryFilters.search}
                  onChange={(event) =>
                    setLibraryFilters((current) => ({ ...current, search: event.target.value }))
                  }
                />
                <select
                  value={libraryFilters.season}
                  onChange={(event) =>
                    setLibraryFilters((current) => ({ ...current, season: event.target.value }))
                  }
                >
                  {["All", ...new Set(cropLibrary.map((crop) => crop.season))].map((season) => (
                    <option key={season} value={season}>
                      {season}
                    </option>
                  ))}
                </select>
                <select
                  value={libraryFilters.region}
                  onChange={(event) =>
                    setLibraryFilters((current) => ({ ...current, region: event.target.value }))
                  }
                >
                  {["All", ...new Set(cropLibrary.map((crop) => crop.region))].map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
                <select
                  value={libraryFilters.soilType}
                  onChange={(event) =>
                    setLibraryFilters((current) => ({ ...current, soilType: event.target.value }))
                  }
                >
                  {["All", ...textureOptions].map((soilType) => (
                    <option key={soilType} value={soilType}>
                      {soilType}
                    </option>
                  ))}
                </select>
              </div>

              <div className="soil-library-list">
                {cropLibraryView.map((crop) => (
                  <article key={crop.name} className="soil-library-item">
                    <strong>{crop.name}</strong>
                    <span>{crop.season} | {crop.region}</span>
                    <p>{crop.soilTypes.join(", ")} | pH {crop.phRange[0]}-{crop.phRange[1]}</p>
                  </article>
                ))}
              </div>
            </article>

            <article className="prototype-panel soil-risk-panel">
              <div className="prototype-soil-panel-title">
                <h2>
                  <AlertTriangle size={18} />
                  <span>Degradation &amp; Rotation Alerts</span>
                </h2>
              </div>

              <div className="soil-risk-list">
                {analysis.degradationAlerts.length ? (
                  analysis.degradationAlerts.map((alert) => (
                    <div key={alert} className="soil-risk-item">
                      <AlertTriangle size={16} />
                      <span>{alert}</span>
                    </div>
                  ))
                ) : (
                  <div className="soil-risk-item success">
                    <Sprout size={16} />
                    <span>No immediate soil degradation alerts for this farm profile.</span>
                  </div>
                )}
              </div>

              <div className="soil-rotation-plan">
                <div className="soil-rotation-head">
                  <RotateCcw size={16} />
                  <strong>Crop rotation planning tool</strong>
                </div>
                <ul>
                  {analysis.cropRotationPlan.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
