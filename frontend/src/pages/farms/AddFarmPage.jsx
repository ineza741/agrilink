import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, CloudUpload, Info, MapPin, Plus, Sprout, Trash2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useFarmerData } from "../../context/FarmerDataContext";

const initialHistoryRow = {
  crop: "",
  season: "",
  yield: "",
  challenges: "",
};

const initialPlotRow = {
  plotLabel: "",
  name: "",
  sizeHectares: "",
  landType: "",
  primaryCrop: "",
};

const initialForm = {
  name: "",
  plotLabel: "",
  sizeHectares: "",
  landType: "",
  region: "",
  irrigationType: "",
  primaryCrop: "",
  photoName: "",
  cooperativeName: "",
  location: {
    lat: -1.9441,
    lng: 29.8744,
    mapX: 50,
    mapY: 50,
    label: "",
  },
  history: [
    {
      ...initialHistoryRow,
      crop: "Maize",
      season: "2025 Season B",
      yield: "4.3 t/ha",
      challenges: "Armyworm outbreaks after heavy rainfall",
    },
  ],
};

function buildFormFromFarm(farm) {
  return {
    name: farm.name,
    plotLabel: farm.plotLabel,
    sizeHectares: String(farm.sizeHectares),
    landType: farm.landType,
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
      ? farm.history.map((entry) => ({
          crop: entry.crop,
          season: entry.season,
          yield: entry.yield,
          challenges: entry.challenges,
        }))
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
    () => currentFarms.find((farm) => farm.id === editId) || null,
    [currentFarms, editId]
  );

  const [form, setForm] = useState(initialForm);
  const [bulkMode, setBulkMode] = useState(false);
  const [additionalPlots, setAdditionalPlots] = useState([]);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (farmToEdit) {
      setForm(buildFormFromFarm(farmToEdit));
      setBulkMode(false);
      setAdditionalPlots([]);
      return;
    }

    setForm(initialForm);
  }, [farmToEdit]);

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleLocationFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      location: {
        ...current.location,
        [name]: name === "label" ? value : Number(value),
      },
    }));
  };

  const handleMapSelect = (event) => {
    const rect = mapRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const mapX = ((event.clientX - rect.left) / rect.width) * 100;
    const mapY = ((event.clientY - rect.top) / rect.height) * 100;
    const lat = -2.05 + (mapY / 100) * 0.3;
    const lng = 29.7 + (mapX / 100) * 0.35;

    setForm((current) => ({
      ...current,
      location: {
        ...current.location,
        mapX: Number(mapX.toFixed(1)),
        mapY: Number(mapY.toFixed(1)),
        lat: Number(lat.toFixed(5)),
        lng: Number(lng.toFixed(5)),
      },
    }));
  };

  const updateHistoryRow = (index, field, value) => {
    setForm((current) => ({
      ...current,
      history: current.history.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [field]: value,
            }
          : row
      ),
    }));
  };

  const addHistoryRow = () => {
    setForm((current) => ({
      ...current,
      history: [...current.history, { ...initialHistoryRow }],
    }));
  };

  const removeHistoryRow = (index) => {
    setForm((current) => ({
      ...current,
      history: current.history.filter((_, rowIndex) => rowIndex !== index),
    }));
  };

  const updatePlotRow = (index, field, value) => {
    setAdditionalPlots((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  };

  const addPlotRow = () => {
    setAdditionalPlots((current) => [...current, { ...initialPlotRow }]);
  };

  const removePlotRow = (index) => {
    setAdditionalPlots((current) => current.filter((_, rowIndex) => rowIndex !== index));
  };

  const handlePhotoSelect = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setForm((current) => ({
      ...current,
      photoName: file.name,
    }));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.sizeHectares || !form.landType || !form.region || !form.irrigationType) {
      setFeedback("Please complete the required farm registration fields before saving.");
      return;
    }

    if (bulkMode && additionalPlots.length === 0) {
      setFeedback("Add at least one extra plot for cooperative bulk registration.");
      return;
    }

    if (bulkMode) {
      await saveBulkRegistration(user.id, {
        cooperativeName: form.cooperativeName || "Unnamed Cooperative",
        primaryFarm: form,
        additionalPlots,
      });
      setFeedback("Bulk registration saved. Multiple plots were added to the centralized farm database.");
      navigate("/farms");
      return;
    }

    await saveFarm(user.id, {
      id: farmToEdit?.id,
      ...form,
      sizeHectares: Number(form.sizeHectares),
    });
    setFeedback(farmToEdit ? "Farm details updated successfully." : "Farm registered successfully.");
    navigate("/farms");
  };

  return (
    <section className="management-page prototype-add-farm-page functional-add-farm-page">
      <div className="page-title-block prototype-add-farm-title">
        <h1>{farmToEdit ? "Update Farm Profile" : "Add New Farm"}</h1>
        <p>
          Register farm details, GIS location, crop history, and land documentation for centralized farmer records.
        </p>
      </div>

      <article className="prototype-add-farm-form-card">
        <section className="prototype-add-farm-section">
          <div className="prototype-add-farm-section-head">
            <h2>
              <Info size={18} /> Section 1: Farmer &amp; Basic Information
            </h2>
          </div>
          <div className="prototype-add-farm-grid two">
            <label>
              <span>Farm Name</span>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleFieldChange}
                placeholder="e.g. Green Valley Estate"
              />
            </label>
            <label>
              <span>Farm Size (in hectares)</span>
              <input
                type="number"
                min="0"
                step="0.1"
                name="sizeHectares"
                value={form.sizeHectares}
                onChange={handleFieldChange}
                placeholder="0.00"
              />
            </label>
          </div>
          <div className="prototype-add-farm-grid two">
            <label>
              <span>Plot Label</span>
              <input
                type="text"
                name="plotLabel"
                value={form.plotLabel}
                onChange={handleFieldChange}
                placeholder="Main Plot / Plot A"
              />
            </label>
            <label>
              <span>Region</span>
              <input
                type="text"
                name="region"
                value={form.region}
                onChange={handleFieldChange}
                placeholder="District, sector, or village"
              />
            </label>
          </div>
          <div className="prototype-add-farm-grid two">
            <label>
              <span>Land Type</span>
              <select name="landType" value={form.landType} onChange={handleFieldChange}>
                <option value="">Select soil type</option>
                <option value="Loamy">Loamy</option>
                <option value="Sandy Loam">Sandy Loam</option>
                <option value="Clay">Clay</option>
                <option value="Silt">Silt</option>
              </select>
            </label>
            <label>
              <span>Primary Crop</span>
              <select name="primaryCrop" value={form.primaryCrop} onChange={handleFieldChange}>
                <option value="">Select main crop</option>
                <option value="Maize">Maize</option>
                <option value="Beans">Beans</option>
                <option value="Soybeans">Soybeans</option>
                <option value="Potatoes">Potatoes</option>
                <option value="Wheat">Wheat</option>
              </select>
            </label>
          </div>
        </section>

        <section className="prototype-add-farm-section">
          <div className="prototype-add-farm-section-head">
            <h2>
              <MapPin size={18} /> Section 2: GIS Mapping &amp; Infrastructure
            </h2>
          </div>
          <label>
            <span>Farm Map / GPS Selection</span>
            <button type="button" ref={mapRef} className="prototype-add-farm-map clickable" onClick={handleMapSelect}>
              <MapPin size={30} />
              <strong>Click to drop a GPS pin</strong>
              <small>
                {form.location.lat.toFixed(5)}, {form.location.lng.toFixed(5)}
              </small>
              <div
                className="prototype-add-farm-map-pin"
                style={{ left: `${form.location.mapX}%`, top: `${form.location.mapY}%` }}
              />
            </button>
          </label>
          <div className="prototype-add-farm-grid three">
            <label>
              <span>Latitude</span>
              <input type="number" step="0.00001" name="lat" value={form.location.lat} onChange={handleLocationFieldChange} />
            </label>
            <label>
              <span>Longitude</span>
              <input type="number" step="0.00001" name="lng" value={form.location.lng} onChange={handleLocationFieldChange} />
            </label>
            <label>
              <span>Map Label</span>
              <input name="label" value={form.location.label} onChange={handleLocationFieldChange} placeholder="Field entrance / Plot center" />
            </label>
          </div>
          <label>
            <span>Irrigation Type</span>
            <select name="irrigationType" value={form.irrigationType} onChange={handleFieldChange}>
              <option value="">Select irrigation method</option>
              <option value="Drip Irrigation">Drip Irrigation</option>
              <option value="Sprinkler">Sprinkler</option>
              <option value="Rain-fed">Rain-fed</option>
              <option value="IoT Enabled">IoT Enabled</option>
              <option value="Furrow">Furrow</option>
            </select>
          </label>
        </section>

        <section className="prototype-add-farm-section">
          <div className="prototype-add-farm-section-head">
            <h2>
              <Sprout size={18} /> Section 3: Crop History, Yields &amp; Documentation
            </h2>
          </div>
          <label>
            <span>Upload Farm Photo</span>
            <label className="prototype-add-farm-upload functional-upload">
              <input type="file" accept=".png,.jpg,.jpeg" onChange={handlePhotoSelect} />
              <CloudUpload size={34} />
              <strong>{form.photoName || "Click or drag and drop to upload"}</strong>
              <small>PNG, JPG or JPEG (Max. 5MB)</small>
            </label>
          </label>

          <div className="farm-history-block">
            <div className="farm-history-head">
              <strong>Crop History Log</strong>
              <button type="button" className="history-add-button" onClick={addHistoryRow}>
                <Plus size={16} />
                <span>Add History Row</span>
              </button>
            </div>

            <div className="farm-history-list">
              {form.history.map((row, index) => (
                <div key={`${row.crop}-${index}`} className="farm-history-row">
                  <input
                    placeholder="Past Crop"
                    value={row.crop}
                    onChange={(event) => updateHistoryRow(index, "crop", event.target.value)}
                  />
                  <input
                    placeholder="Season / Year"
                    value={row.season}
                    onChange={(event) => updateHistoryRow(index, "season", event.target.value)}
                  />
                  <input
                    placeholder="Yield"
                    value={row.yield}
                    onChange={(event) => updateHistoryRow(index, "yield", event.target.value)}
                  />
                  <input
                    placeholder="Challenges"
                    value={row.challenges}
                    onChange={(event) => updateHistoryRow(index, "challenges", event.target.value)}
                  />
                  <button type="button" className="row-remove-button" onClick={() => removeHistoryRow(index)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="prototype-add-farm-section">
          <div className="prototype-add-farm-section-head">
            <h2>
              <Info size={18} /> Section 4: Cooperative Bulk Registration
            </h2>
          </div>

          <label className="functional-checkbox">
            <input
              type="checkbox"
              checked={bulkMode}
              onChange={(event) => setBulkMode(event.target.checked)}
            />
            <span>Enable cooperative or multi-plot bulk registration</span>
          </label>

          <div className="prototype-add-farm-grid two">
            <label>
              <span>Cooperative Name</span>
              <input
                name="cooperativeName"
                value={form.cooperativeName}
                onChange={handleFieldChange}
                placeholder="e.g. Highland Growers Cooperative"
              />
            </label>
            <label>
              <span>Bulk Registration Status</span>
              <div className="prototype-add-farm-select static">
                <span>{bulkMode ? "Ready to register multiple plots" : "Single farm registration"}</span>
                <ChevronDown size={18} />
              </div>
            </label>
          </div>

          {bulkMode ? (
            <div className="bulk-plot-block">
              <div className="farm-history-head">
                <strong>Additional Plots</strong>
                <button type="button" className="history-add-button" onClick={addPlotRow}>
                  <Plus size={16} />
                  <span>Add Plot</span>
                </button>
              </div>

              {additionalPlots.map((plot, index) => (
                <div key={`plot-${index}`} className="bulk-plot-row">
                  <input
                    placeholder="Plot Label"
                    value={plot.plotLabel}
                    onChange={(event) => updatePlotRow(index, "plotLabel", event.target.value)}
                  />
                  <input
                    placeholder="Plot Name"
                    value={plot.name}
                    onChange={(event) => updatePlotRow(index, "name", event.target.value)}
                  />
                  <input
                    placeholder="Size (ha)"
                    value={plot.sizeHectares}
                    onChange={(event) => updatePlotRow(index, "sizeHectares", event.target.value)}
                  />
                  <input
                    placeholder="Land Type"
                    value={plot.landType}
                    onChange={(event) => updatePlotRow(index, "landType", event.target.value)}
                  />
                  <input
                    placeholder="Primary Crop"
                    value={plot.primaryCrop}
                    onChange={(event) => updatePlotRow(index, "primaryCrop", event.target.value)}
                  />
                  <button type="button" className="row-remove-button" onClick={() => removePlotRow(index)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {feedback ? <p className="profile-feedback-banner form-feedback">{feedback}</p> : null}

        <div className="prototype-add-farm-actions">
          <button type="button" className="prototype-add-farm-cancel" onClick={() => navigate("/farms")}>
            Cancel
          </button>
          <button type="button" className="prototype-add-farm-save" onClick={handleSubmit}>
            {farmToEdit ? "Update Farm" : bulkMode ? "Save Bulk Registration" : "Save Farm"}
          </button>
        </div>
      </article>
    </section>
  );
}
