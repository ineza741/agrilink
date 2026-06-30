import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, ChevronRight, CloudUpload,
  CropIcon, Eye, FileText, HelpCircle, Info, MapPin,
  Maximize2, Minimize2, Navigation, Plus, RefreshCw, Sprout,
  Target, Trash2, Upload, User, X
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useFarmerData } from "../../context/FarmerDataContext";
import { getCropImageUrl, getFarmHeroImageUrl } from "../../data/cropImages";

const initialHistoryRow = {
  crop: "", season: "", yield: "", challenges: "",
};

const initialPlotRow = {
  plotLabel: "", name: "", sizeHectares: "", landType: "", primaryCrop: "",
};

const initialForm = {
  name: "", plotLabel: "", sizeHectares: "", landType: "",
  district: "", sector: "", village: "", description: "",
  region: "", irrigationType: "", primaryCrop: "", photoName: "",
  cooperativeName: "",
  location: { lat: -1.9441, lng: 29.8744, mapX: 50, mapY: 50, label: "" },
  history: [{ ...initialHistoryRow, crop: "Maize", season: "2025 Season B", yield: "4.3 t/ha", challenges: "Armyworm outbreaks after heavy rainfall" }],
};

const cropEmojiMap = {
  Beans: "🫘", Maize: "🌽", Corn: "🌽", "Hybrid Corn": "🌽",
  Tomato: "🍅", Tomatoes: "🍅", Potato: "🥔", Potatoes: "🥔",
  "Irish Potato": "🥔", "Sweet Potato": "🍠", Rice: "🍚",
  Cassava: "🌿", Coffee: "☕", Tea: "🍵", Banana: "🍌",
  Plantain: "🍌", Carrots: "🥕", Onions: "🧅", Wheat: "🌾",
  Cabbage: "🥬", Soybeans: "🫘", Barley: "🌾", Sorghum: "🌾",
  Groundnuts: "🥜", Peas: "🫛", Vegetables: "🥦", Cereals: "🌾", Almonds: "🥜",
};

const availableCrops = [
  "Maize", "Beans", "Soybeans", "Potatoes", "Wheat",
  "Rice", "Coffee", "Tea", "Banana", "Cassava", "Tomato",
];

const landTypes = ["Loamy", "Sandy Loam", "Clay", "Silt"];

const irrigationOptions = [
  "Drip Irrigation", "Sprinkler", "Rain-fed", "IoT Enabled", "Furrow",
];

const stepLabels = ["Farmer Information", "Farm Location", "Crop & Documentation", "Review & Submit"];

function buildFormFromFarm(farm) {
  return {
    name: farm.name,
    plotLabel: farm.plotLabel,
    sizeHectares: String(farm.sizeHectares),
    landType: farm.landType,
    district: farm.district || "",
    sector: farm.sector || "",
    village: farm.village || "",
    description: farm.description || "",
    region: farm.region,
    irrigationType: farm.irrigationType,
    primaryCrop: farm.primaryCrop,
    photoName: farm.photoName,
    cooperativeName: farm.cooperativeName || "",
    location: {
      lat: farm.location.lat,
      lng: farm.location.lng,
      mapX: farm.location.mapX,
      mapY: farm.location.mapY,
      label: farm.location.label || "",
    },
    history: farm.history.length
      ? farm.history.map((e) => ({ crop: e.crop, season: e.season, yield: e.yield, challenges: e.challenges }))
      : [{ ...initialHistoryRow }],
  };
}

export function AddFarmPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mapRef = useRef(null);
  const { user } = useAuth();
  const { currentFarms, saveFarm, saveBulkRegistration } = useFarmerData();
  const editId = searchParams.get("edit");
  const farmToEdit = useMemo(
    () => currentFarms.find((f) => f.id === editId) || null,
    [currentFarms, editId]
  );

  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [bulkMode, setBulkMode] = useState(false);
  const [additionalPlots, setAdditionalPlots] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [photoPreview, setPhotoPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [mapFullscreen, setMapFullscreen] = useState(false);

  useEffect(() => {
    if (farmToEdit) {
      setForm(buildFormFromFarm(farmToEdit));
      setBulkMode(false);
      setAdditionalPlots([]);
      setCurrentStep(1);
    } else {
      setForm(initialForm);
      setCurrentStep(1);
    }
    setPhotoPreview(null);
    setFeedback("");
  }, [farmToEdit]);

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLocationFieldChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        [name]: name === "label" ? value : Number(value),
      },
    }));
  };

  const handleMapSelect = (e) => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mapX = ((e.clientX - rect.left) / rect.width) * 100;
    const mapY = ((e.clientY - rect.top) / rect.height) * 100;
    const lat = -2.05 + (mapY / 100) * 0.3;
    const lng = 29.7 + (mapX / 100) * 0.35;
    setForm((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        mapX: Number(mapX.toFixed(1)),
        mapY: Number(mapY.toFixed(1)),
        lat: Number(lat.toFixed(5)),
        lng: Number(lng.toFixed(5)),
      },
    }));
  };

  const detectMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const mapX = ((lng - 29.7) / 0.35) * 100;
        const mapY = ((lat + 2.05) / 0.3) * 100;
        setForm((prev) => ({
          ...prev,
          location: {
            ...prev.location,
            lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)),
            mapX: Number(Math.max(0, Math.min(100, mapX)).toFixed(1)),
            mapY: Number(Math.max(0, Math.min(100, mapY)).toFixed(1)),
          },
        }));
      },
      () => setFeedback("Could not detect location. Check GPS permissions."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const updateHistoryRow = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      history: prev.history.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    }));
  };

  const addHistoryRow = () => {
    setForm((prev) => ({ ...prev, history: [...prev.history, { ...initialHistoryRow }] }));
  };

  const removeHistoryRow = (index) => {
    setForm((prev) => ({
      ...prev,
      history: prev.history.filter((_, i) => i !== index),
    }));
  };

  const updatePlotRow = (index, field, value) => {
    setAdditionalPlots((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const addPlotRow = () => {
    setAdditionalPlots((prev) => [...prev, { ...initialPlotRow }]);
  };

  const removePlotRow = (index) => {
    setAdditionalPlots((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePhotoSelect = (file) => {
    if (!file) return;
    setForm((prev) => ({ ...prev, photoName: file.name }));
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleFileInput = (e) => {
    handlePhotoSelect(e.target.files?.[0]);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handlePhotoSelect(e.dataTransfer?.files?.[0]);
  };

  const removePhoto = () => {
    setForm((prev) => ({ ...prev, photoName: "" }));
    setPhotoPreview(null);
  };

  const progressPct = Math.round(((currentStep - 1) / 3) * 100);

  const stepFields = {
    1: ["name", "sizeHectares", "landType", "region"],
    2: [],
    3: [],
    4: [],
  };

  const validateStep = (step) => {
    if (step === 1) {
      if (!form.name) { setFeedback("Farm name is required."); return false; }
      if (!form.sizeHectares) { setFeedback("Farm size is required."); return false; }
      if (!form.landType) { setFeedback("Land type is required."); return false; }
    }
    if (step === 2) {
      if (!form.location.lat || !form.location.lng) { setFeedback("Please select a location on the map."); return false; }
    }
    if (step === 3) {
      if (!form.primaryCrop) { setFeedback("Please select a primary crop."); return false; }
    }
    return true;
  };

  const handleNext = () => {
    setFeedback("");
    if (!validateStep(currentStep)) return;
    if (currentStep < 4) setCurrentStep((s) => s + 1);
  };

  const handleBack = () => {
    setFeedback("");
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    const missing = [];
    if (!form.name) missing.push("Farm Name");

    const rawSize = String(form.sizeHectares || "").replace(/[^0-9.]/g, "");
    const parsedSize = parseFloat(rawSize);
    if (!rawSize || isNaN(parsedSize) || parsedSize <= 0) missing.push("Farm Size");

    if (!form.landType) missing.push("Land Type");
    if (!form.primaryCrop) missing.push("Primary Crop");

    const derivedRegion = form.district || form.sector || form.village
      ? [form.district, form.sector, form.village].filter(Boolean).join(", ")
      : form.region;
    if (!derivedRegion) missing.push("Region (District, Sector, or Village)");

    if (!form.location.lat || !form.location.lng) missing.push("Location (GPS coordinates)");

    if (missing.length > 0) {
      setFeedback(`Missing required fields: ${missing.join(", ")}`);
      return;
    }
    const region = derivedRegion;
    const payload = { ...form, region, sizeHectares: parsedSize };

    if (bulkMode) {
      await saveBulkRegistration(user.id, {
        cooperativeName: form.cooperativeName || "Unnamed Cooperative",
        primaryFarm: payload,
        additionalPlots,
      });
      setFeedback("Bulk registration saved. Multiple plots were added.");
      navigate("/farms");
      return;
    }

    await saveFarm(user.id, { id: farmToEdit?.id, ...payload });
    setFeedback(farmToEdit ? "Farm updated successfully." : "Farm registered successfully.");
    navigate("/farms");
  };

  const renderStepIndicator = () => (
    <div className="add-farm-steps">
      {stepLabels.map((label, i) => {
        const stepNum = i + 1;
        const isActive = currentStep === stepNum;
        const isDone = currentStep > stepNum;
        return (
          <button
            key={i}
            type="button"
            className={`add-farm-step ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}
            onClick={() => { if (isDone) setCurrentStep(stepNum); }}
          >
            <span className="add-farm-step-circle">
              {isDone ? <Check size={14} /> : stepNum}
            </span>
            <span className="add-farm-step-label">{label}</span>
            {i < stepLabels.length - 1 && <span className="add-farm-step-connector" />}
          </button>
        );
      })}
    </div>
  );

  const renderFloatingInput = (props) => {
    const { name, label, icon: Icon, type = "text", value, onChange, placeholder, ...rest } = props;
    const hasValue = value && String(value).length > 0;
    return (
      <div className={`af-floating-group ${hasValue ? "has-value" : ""}`}>
        {Icon && <Icon size={16} className="af-floating-icon" />}
        {type === "select" ? (
          <select name={name} value={value} onChange={onChange} className="af-floating-input">
            <option value="" />
            {rest.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : type === "textarea" ? (
          <textarea
            name={name}
            value={value}
            onChange={onChange}
            className="af-floating-input af-floating-textarea"
            placeholder={placeholder || " "}
          />
        ) : (
          <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            className="af-floating-input"
            placeholder={placeholder || " "}
            {...rest}
          />
        )}
        <label className="af-floating-label">{label}</label>
      </div>
    );
  };

  const renderStep1 = () => (
    <div className="add-farm-step-content fade-in">
      <div className="add-farm-step-header">
        <h2><User size={22} /> Farmer Information</h2>
        <p>Enter the basic details about the farm and farmer.</p>
      </div>
      <div className="af-form-grid-2">
        {renderFloatingInput({ name: "name", label: "Farm Name", icon: FileText, value: form.name, onChange: handleFieldChange })}
        {renderFloatingInput({ name: "sizeHectares", label: "Farm Size (ha)", icon: Maximize2, type: "number", min: "0", step: "0.1", value: form.sizeHectares, onChange: handleFieldChange })}
      </div>
      <div className="af-form-grid-2">
        {renderFloatingInput({ name: "primaryCrop", label: "Primary Crop", icon: CropIcon, type: "select", value: form.primaryCrop, onChange: handleFieldChange, options: availableCrops })}
        {renderFloatingInput({ name: "landType", label: "Land Type", icon: Sprout, type: "select", value: form.landType, onChange: handleFieldChange, options: landTypes })}
      </div>
      <div className="af-form-grid-3">
        {renderFloatingInput({ name: "district", label: "District", icon: MapPin, value: form.district, onChange: handleFieldChange })}
        {renderFloatingInput({ name: "sector", label: "Sector", icon: MapPin, value: form.sector, onChange: handleFieldChange })}
        {renderFloatingInput({ name: "village", label: "Village", icon: MapPin, value: form.village, onChange: handleFieldChange })}
      </div>
      <div className="af-form-full">
        {renderFloatingInput({ name: "description", label: "Farm Description", icon: Info, type: "textarea", value: form.description, onChange: handleFieldChange, placeholder: "Describe the farm, crops grown, terrain, etc..." })}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className={`add-farm-step-content fade-in ${mapFullscreen ? "map-fullscreen" : ""}`}>
      <div className="add-farm-step-header">
        <h2><MapPin size={22} /> Farm Location</h2>
        <p>Drop a pin on the map or enter GPS coordinates manually.</p>
      </div>
      <div className="af-location-layout">
        <div className="af-map-section">
          <div
            ref={mapRef}
            className={`af-map-container ${mapFullscreen ? "fullscreen" : ""}`}
            onClick={handleMapSelect}
          >
            <div className="af-map-terrain" />
            <div className="af-map-grid" />
            <div className="af-map-center-marker">
              <Target size={24} />
            </div>
            <div
              className="af-map-pin"
              style={{ left: `${form.location.mapX}%`, top: `${form.location.mapY}%` }}
            >
              <MapPin size={28} fill="#2E7D32" color="#fff" />
            </div>
            <div className="af-map-coords-badge">
              {form.location.lat.toFixed(4)}, {form.location.lng.toFixed(4)}
            </div>
            <div className="af-map-hint">Click on the map to drop a pin</div>
            <button
              type="button"
              className="af-map-fullscreen-btn"
              onClick={(e) => { e.stopPropagation(); setMapFullscreen((v) => !v); }}
              title={mapFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {mapFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>
        <div className="af-location-sidebar">
          <div className="af-location-coords">
            {renderFloatingInput({ name: "lat", label: "Latitude", icon: Target, type: "number", step: "0.00001", value: form.location.lat, onChange: handleLocationFieldChange })}
            {renderFloatingInput({ name: "lng", label: "Longitude", icon: Target, type: "number", step: "0.00001", value: form.location.lng, onChange: handleLocationFieldChange })}
          </div>
          <div className="af-location-stats">
            <div className="af-location-stat">
              <span className="af-location-stat-label">Elevation</span>
              <span className="af-location-stat-value">—</span>
            </div>
            <div className="af-location-stat">
              <span className="af-location-stat-label">District</span>
              <span className="af-location-stat-value">{form.district || "—"}</span>
            </div>
            <div className="af-location-stat">
              <span className="af-location-stat-label">GPS Accuracy</span>
              <span className="af-location-stat-value">±5m</span>
            </div>
            <div className="af-location-stat">
              <span className="af-location-stat-label">Area (ha)</span>
              <span className="af-location-stat-value">{form.sizeHectares || "—"}</span>
            </div>
          </div>
          <div className="af-location-actions">
            <button type="button" className="af-location-btn" onClick={detectMyLocation}>
              <Navigation size={16} /> Detect My Location
            </button>
            <button type="button" className="af-location-btn" onClick={() => setFeedback("Boundary drawing is available in the full GIS module.")}>
              <Maximize2 size={16} /> Draw Farm Boundary
            </button>
            <button type="button" className="af-location-btn primary" onClick={detectMyLocation}>
              <MapPin size={16} /> Use Current GPS
            </button>
          </div>
          <div className="af-location-irrigation">
            {renderFloatingInput({ name: "irrigationType", label: "Irrigation Type", icon: Sprout, type: "select", value: form.irrigationType, onChange: handleFieldChange, options: irrigationOptions })}
            {renderFloatingInput({ name: "cooperativeName", label: "Cooperative", icon: User, value: form.cooperativeName, onChange: handleFieldChange })}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="add-farm-step-content fade-in">
      <div className="add-farm-step-header">
        <h2><Sprout size={22} /> Crop & Documentation</h2>
        <p>Select the primary crop, upload a farm photo, and log crop history.</p>
      </div>

      <div className="af-crop-section">
        <h3 className="af-section-title">Select Primary Crop</h3>
        <div className="af-crop-grid">
          {availableCrops.map((crop) => {
            const emoji = cropEmojiMap[crop] || "🌿";
            const imgUrl = getCropImageUrl(crop);
            const isSelected = form.primaryCrop === crop;
            return (
              <button
                key={crop}
                type="button"
                className={`af-crop-card ${isSelected ? "selected" : ""}`}
                onClick={() => setForm((prev) => ({ ...prev, primaryCrop: crop }))}
              >
                <div className="af-crop-card-img-wrap">
                  {imgUrl ? <img src={imgUrl} alt={crop} className="af-crop-card-img" /> : <span className="af-crop-card-emoji-large">{emoji}</span>}
                  <div className="af-crop-card-check">{isSelected && <Check size={16} />}</div>
                </div>
                <span className="af-crop-card-emoji">{emoji}</span>
                <span className="af-crop-card-name">{crop}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="af-photo-section">
        <h3 className="af-section-title">Farm Photo</h3>
        <div
          className={`af-dropzone ${dragOver ? "drag-over" : ""} ${photoPreview ? "has-preview" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !photoPreview && document.getElementById("af-photo-input")?.click()}
        >
          <input id="af-photo-input" type="file" accept=".png,.jpg,.jpeg" onChange={handleFileInput} hidden />
          {photoPreview ? (
            <div className="af-dropzone-preview">
              <img src={photoPreview} alt="Preview" className="af-dropzone-img" />
              <div className="af-dropzone-preview-info">
                <span className="af-dropzone-filename">{form.photoName}</span>
                <div className="af-dropzone-preview-actions">
                  <button type="button" className="af-dropzone-action-btn" onClick={(e) => { e.stopPropagation(); document.getElementById("af-photo-input")?.click(); }}>
                    <RefreshCw size={14} /> Replace
                  </button>
                  <button type="button" className="af-dropzone-action-btn remove" onClick={(e) => { e.stopPropagation(); removePhoto(); }}>
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="af-dropzone-empty">
              <div className="af-dropzone-icon-wrap">
                <Upload size={32} />
              </div>
              <strong>Upload Farm Image</strong>
              <p>Drag & drop or click to browse</p>
              <small>PNG, JPG or JPEG — Max 5MB</small>
            </div>
          )}
        </div>
      </div>

      <div className="af-history-section">
        <div className="af-history-header">
          <h3 className="af-section-title">Crop History</h3>
          <button type="button" className="af-history-add-btn" onClick={addHistoryRow}>
            <Plus size={14} /> Add Season
          </button>
        </div>
        <div className="af-history-list">
          {form.history.map((row, index) => (
            <div key={index} className="af-history-card">
              <div className="af-history-card-top">
                <span className="af-history-card-index">Season {index + 1}</span>
                {form.history.length > 1 && (
                  <button type="button" className="af-history-remove-btn" onClick={() => removeHistoryRow(index)}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <div className="af-history-card-grid">
                <input
                  placeholder="Crop Name"
                  value={row.crop}
                  onChange={(e) => updateHistoryRow(index, "crop", e.target.value)}
                  className="af-history-input"
                />
                <input
                  placeholder="Season / Year"
                  value={row.season}
                  onChange={(e) => updateHistoryRow(index, "season", e.target.value)}
                  className="af-history-input"
                />
                <input
                  placeholder="Yield (e.g. 4.2 t/ha)"
                  value={row.yield}
                  onChange={(e) => updateHistoryRow(index, "yield", e.target.value)}
                  className="af-history-input"
                />
                <input
                  placeholder="Challenges"
                  value={row.challenges}
                  onChange={(e) => updateHistoryRow(index, "challenges", e.target.value)}
                  className="af-history-input"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => {
    const regionDisplay = form.district || form.sector || form.village
      ? [form.district, form.sector, form.village].filter(Boolean).join(", ")
      : form.region || "Not specified";
    const heroUrl = getFarmHeroImageUrl(form.primaryCrop);
    return (
      <div className="add-farm-step-content fade-in">
        <div className="add-farm-step-header">
          <h2><Eye size={22} /> Review & Submit</h2>
          <p>Review all farm details before submitting.</p>
        </div>

        <div className="af-review-grid">
          <div className="af-review-card">
            <h3><FileText size={16} /> Farm Summary</h3>
            <div className="af-review-rows">
              <div className="af-review-row"><span>Name</span><strong>{form.name || "—"}</strong></div>
              <div className="af-review-row"><span>Size</span><strong>{form.sizeHectares || "—"} ha</strong></div>
              <div className="af-review-row"><span>Land Type</span><strong>{form.landType || "—"}</strong></div>
              <div className="af-review-row"><span>District</span><strong>{form.district || "—"}</strong></div>
              <div className="af-review-row"><span>Sector</span><strong>{form.sector || "—"}</strong></div>
              <div className="af-review-row"><span>Village</span><strong>{form.village || "—"}</strong></div>
              <div className="af-review-row"><span>Region</span><strong>{regionDisplay}</strong></div>
              {form.description && <div className="af-review-row"><span>Description</span><strong>{form.description}</strong></div>}
            </div>
          </div>

          <div className="af-review-card">
            <h3><MapPin size={16} /> Location</h3>
            <div className="af-review-map-sm" onClick={handleMapSelect}>
              <div className="af-review-map-inner">
                <MapPin size={24} fill="#2E7D32" color="#fff" />
                <span>{form.location.lat.toFixed(4)}, {form.location.lng.toFixed(4)}</span>
              </div>
            </div>
            <div className="af-review-rows">
              <div className="af-review-row"><span>Irrigation</span><strong>{form.irrigationType || "—"}</strong></div>
              <div className="af-review-row"><span>Cooperative</span><strong>{form.cooperativeName || "—"}</strong></div>
            </div>
          </div>

          <div className="af-review-card">
            <h3><Sprout size={16} /> Crop Summary</h3>
            {form.primaryCrop ? (
              <div className="af-review-crop">
                <span className="af-review-crop-emoji">{cropEmojiMap[form.primaryCrop] || "🌿"}</span>
                <div>
                  <strong>{form.primaryCrop}</strong>
                  <span>Primary Crop</span>
                </div>
                {heroUrl && <img src={heroUrl} alt="" className="af-review-crop-img" />}
              </div>
            ) : (
              <p className="af-review-na">No crop selected</p>
            )}
            {form.history.some((h) => h.crop) && (
              <>
                <h4 style={{ fontSize: 13, fontWeight: 600, margin: "12px 0 8px", color: "var(--text-muted)" }}>Crop History</h4>
                {form.history.filter((h) => h.crop).map((h, i) => (
                  <div key={i} className="af-review-history-item">
                    <span className="af-review-history-crop">{h.crop}</span>
                    {h.season && <span className="af-review-history-season">{h.season}</span>}
                    {h.yield && <span className="af-review-history-yield">{h.yield}</span>}
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="af-review-card">
            <h3><CloudUpload size={16} /> Photo</h3>
            {photoPreview ? (
              <div className="af-review-photo-wrap">
                <img src={photoPreview} alt="Farm" className="af-review-photo" />
                <span className="af-review-photo-name">{form.photoName}</span>
              </div>
            ) : form.photoName ? (
              <p className="af-review-na">{form.photoName}</p>
            ) : (
              <p className="af-review-na">No photo uploaded</p>
            )}
          </div>
        </div>

        {bulkMode && (
          <div className="af-review-card bulk-summary">
            <h3><Info size={16} /> Bulk Registration</h3>
            <p>Cooperative: <strong>{form.cooperativeName || "Unnamed Cooperative"}</strong></p>
            <p>Additional plots: <strong>{additionalPlots.length}</strong></p>
            {additionalPlots.map((p, i) => (
              <div key={i} className="af-review-bulk-plot">
                {p.plotLabel || `Plot ${i + 1}`} — {p.name || "Unnamed"} ({p.sizeHectares || "?"} ha)
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const sidebarTips = {
    1: [
      "Farm name should be unique within your district.",
      "Include both wet and dry season crops in history.",
      "Land type affects crop suitability recommendations.",
    ],
    2: [
      "GPS coordinates help extension officers find your farm.",
      "Click the map roughly near your farm location.",
      "Use 'Detect My Location' for automatic GPS coordinates.",
    ],
    3: [
      "Select the crop you grow most of the year.",
      "Upload a clear photo showing your farm landscape.",
      "Log at least the last 2 seasons of crop history.",
    ],
    4: [
      "Review all details before submitting.",
      "You can save a draft and return later.",
      "Submitted farms will appear on your dashboard.",
    ],
  };

  const renderSidebar = () => (
    <aside className="add-farm-sidebar">
      <div className="af-sidebar-card">
        <h4>Registration Progress</h4>
        <div className="af-sidebar-progress-bar">
          <div className="af-sidebar-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="af-sidebar-progress-text">{progressPct}% Complete</span>
        <ul className="af-sidebar-checklist">
          {[1, 2, 3, 4].map((s) => (
            <li key={s} className={`af-sidebar-check-item ${currentStep > s ? "done" : ""} ${currentStep === s ? "current" : ""}`}>
              <span className="af-sidebar-check-icon">{currentStep > s ? <Check size={12} /> : s}</span>
              {stepLabels[s - 1]}
            </li>
          ))}
        </ul>
      </div>

      <div className="af-sidebar-card">
        <h4><HelpCircle size={14} /> Tips</h4>
        <ul className="af-sidebar-tips">
          {sidebarTips[currentStep]?.map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
      </div>

      <div className="af-sidebar-card">
        <h4><Info size={14} /> Required Fields</h4>
        <div className="af-sidebar-req-field">
          <span className={`af-sidebar-req-dot ${form.name ? "filled" : ""}`} />
          Farm Name
        </div>
        <div className="af-sidebar-req-field">
          <span className={`af-sidebar-req-dot ${form.sizeHectares ? "filled" : ""}`} />
          Farm Size
        </div>
        <div className="af-sidebar-req-field">
          <span className={`af-sidebar-req-dot ${form.landType ? "filled" : ""}`} />
          Land Type
        </div>
        <div className="af-sidebar-req-field">
          <span className={`af-sidebar-req-dot ${form.primaryCrop ? "filled" : ""}`} />
          Primary Crop
        </div>
        <div className="af-sidebar-req-field">
          <span className={`af-sidebar-req-dot ${form.location.lat ? "filled" : ""}`} />
          Location
        </div>
      </div>

      <div className="af-sidebar-card">
        <h4><Sprout size={14} /> AI Suggestions</h4>
        <p className="af-sidebar-ai-text">
          {form.primaryCrop
            ? `${form.primaryCrop} performs well in ${form.landType || "loamy"} soils. Consider intercropping with legumes.`
            : "Select a crop to get AI-powered farming suggestions."}
        </p>
      </div>

      <div className="af-sidebar-card">
        <h4><MapPin size={14} /> Weather</h4>
        <p className="af-sidebar-ai-text">
          {form.location.lat
            ? `Current conditions at ${form.location.lat.toFixed(2)}°S, ${form.location.lng.toFixed(2)}°E: Mild, 22°C`
            : "Set location to view weather data."}
        </p>
      </div>

      <div className="af-sidebar-card">
        <h4><Sprout size={14} /> Estimated Soil</h4>
        <p className="af-sidebar-ai-text">{form.landType || "Not specified"} — suitable for most row crops.</p>
      </div>

      <div className="af-sidebar-card">
        <h4><MapPin size={14} /> Nearby Markets</h4>
        <p className="af-sidebar-ai-text">
          {form.district
            ? `3 markets found near ${form.district}.`
            : "Enter district to find nearby markets."}
        </p>
      </div>
    </aside>
  );

  const bulkChecked = bulkMode;
  const setBulkChecked = setBulkMode;

  return (
    <section className="add-farm-wizard">
      <div className="add-farm-wizard-inner">
        <div className="add-farm-wizard-header">
          <div>
            <h1>{farmToEdit ? "Update Farm Profile" : "Add New Farm"}</h1>
            <p>Register farm details, GIS location, crop history, and documentation.</p>
          </div>
          <div className="add-farm-header-badges">
            {editId && <span className="af-badge af-badge-edit">Editing</span>}
            {bulkMode && <span className="af-badge af-badge-bulk">Bulk Registration</span>}
          </div>
        </div>

        <div className="add-farm-layout">
          <div className="add-farm-main">
            {renderStepIndicator()}

            <div className="add-farm-content-card">
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
              {currentStep === 4 && renderStep4()}

              <div className="af-bulk-toggle">
                <label className="af-bulk-toggle-label">
                  <input
                    type="checkbox"
                    checked={bulkChecked}
                    onChange={(e) => setBulkChecked(e.target.checked)}
                  />
                  <span>Enable cooperative / multi-plot bulk registration</span>
                </label>
              </div>

              {bulkMode && (
                <div className="af-bulk-section">
                  <div className="af-bulk-header">
                    <h3>Additional Plots</h3>
                    <button type="button" className="af-history-add-btn" onClick={addPlotRow}>
                      <Plus size={14} /> Add Plot
                    </button>
                  </div>
                  {additionalPlots.map((plot, index) => (
                    <div key={index} className="af-bulk-plot-card">
                      <div className="af-bulk-plot-top">
                        <span>Plot {index + 1}</span>
                        <button type="button" className="af-history-remove-btn" onClick={() => removePlotRow(index)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div className="af-bulk-plot-grid">
                        <input placeholder="Label" value={plot.plotLabel} onChange={(e) => updatePlotRow(index, "plotLabel", e.target.value)} className="af-history-input" />
                        <input placeholder="Name" value={plot.name} onChange={(e) => updatePlotRow(index, "name", e.target.value)} className="af-history-input" />
                        <input placeholder="Size (ha)" value={plot.sizeHectares} onChange={(e) => updatePlotRow(index, "sizeHectares", e.target.value)} className="af-history-input" />
                        <input placeholder="Land Type" value={plot.landType} onChange={(e) => updatePlotRow(index, "landType", e.target.value)} className="af-history-input" />
                        <input placeholder="Primary Crop" value={plot.primaryCrop} onChange={(e) => updatePlotRow(index, "primaryCrop", e.target.value)} className="af-history-input" />
                      </div>
                    </div>
                  ))}
                  {additionalPlots.length === 0 && (
                    <p className="af-bulk-empty">No additional plots added yet.</p>
                  )}
                </div>
              )}

              {feedback && (
                <div className="af-feedback">
                  <Info size={16} />
                  <span>{feedback}</span>
                  <button type="button" className="af-feedback-close" onClick={() => setFeedback("")}>
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            <div className="add-farm-nav">
              <button
                type="button"
                className="add-farm-nav-btn secondary"
                onClick={() => navigate("/farms")}
              >
                Cancel
              </button>
              <div className="add-farm-nav-right">
                {currentStep > 1 && (
                  <button type="button" className="add-farm-nav-btn ghost" onClick={handleBack}>
                    <ArrowLeft size={16} /> Back
                  </button>
                )}
                {currentStep < 4 && (
                  <button type="button" className="add-farm-nav-btn primary" onClick={handleNext}>
                    Next <ArrowRight size={16} />
                  </button>
                )}
                {currentStep === 4 && (
                  <>
                    <button type="button" className="add-farm-nav-btn secondary" onClick={() => setCurrentStep(1)}>
                      Save Draft
                    </button>
                    <button type="button" className="add-farm-nav-btn primary" onClick={handleSubmit}>
                      {farmToEdit ? "Update Farm" : bulkMode ? "Save Bulk Registration" : "Submit Farm"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {renderSidebar()}
        </div>
      </div>
    </section>
  );
}
