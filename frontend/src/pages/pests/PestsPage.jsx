import {
  BadgeCheck, Bug, CheckCircle2, ChevronDown, CreativeCommons, Droplets, ImageUp, MapPinned,
  Scan, Search, Thermometer, Upload, X,
} from "lucide-react";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { PageShell } from "../../components/common/PageShell";
import { PageHeader } from "../../components/common/PageHeader";
import { AppCard } from "../../components/common/AppCard";
import { ActionButton } from "../../components/common/ActionButton";
import { StatusBadge } from "../../components/common/StatusBadge";
import { PlantHealthImage } from "../../components/common/PlantHealthImage";
import { useFarmerData } from "../../context/FarmerDataContext";
import { isBackendSessionActive, phase1BackendService } from "../../services/phase1Backend";

function formatDate(value) {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function normalizeFarm(v) {
  if (!v) return null;
  return { id: v.id, name: v.name || v.farmName || "", district: v.district || "", latitude: v.latitude ?? v.location?.lat ?? null, longitude: v.longitude ?? v.location?.lng ?? null };
}

const ALL_CROPS = ["Maize", "Beans", "Irish Potato", "Sweet Potato", "Cassava", "Rice", "Wheat", "Tomato", "Banana", "Coffee", "Soybean", "Sorghum"];

export function PestsPage() {
  const { currentFarms } = useFarmerData();
  const backendMode = isBackendSessionActive();

  const farms = useMemo(() => (Array.isArray(currentFarms) && currentFarms.length > 0 ? currentFarms : []), [currentFarms]);
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [selectedCrop, setSelectedCrop] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [affectedArea, setAffectedArea] = useState(30);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedImageName, setUploadedImageName] = useState("");
  const [recognition, setRecognition] = useState(null);
  const [recognitionLoading, setRecognitionLoading] = useState(false);

  const [symptomOptions, setSymptomOptions] = useState([]);
  const [symptomSearch, setSymptomSearch] = useState("");
  const [symptomDropdownOpen, setSymptomDropdownOpen] = useState(false);
  const symptomRef = useRef(null);

  const [diagnosis, setDiagnosis] = useState(null);
  const [history, setHistory] = useState([]);
  const [outbreak, setOutbreak] = useState(null);
  const [libraryData, setLibraryData] = useState([]);
  const [libraryPagination, setLibraryPagination] = useState(null);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryCrop, setLibraryCrop] = useState("");
  const [libraryType, setLibraryType] = useState("All");
  const [libraryPage, setLibraryPage] = useState(1);

  const [diagnosisLoading, setDiagnosisLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [outbreakLoading, setOutbreakLoading] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [analysisSubmitting, setAnalysisSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const selectedFarm = useMemo(() => {
    if (!selectedFarmId || farms.length === 0) return null;
    return farms.find((f) => String(f.id) === String(selectedFarmId)) || null;
  }, [farms, selectedFarmId]);

  const farmInfo = useMemo(() => normalizeFarm(selectedFarm), [selectedFarm]);
  const farmDistrict = farmInfo?.district || "";

  const cropOptions = useMemo(() => {
    if (!selectedFarm?.primaryCrop) return ALL_CROPS;
    return [selectedFarm.primaryCrop, ...ALL_CROPS.filter((c) => c !== selectedFarm.primaryCrop)];
  }, [selectedFarm]);

  useEffect(() => {
    if (farms.length > 0 && !selectedFarmId) setSelectedFarmId(farms[0].id);
  }, [farms, selectedFarmId]);

  // Load diagnosis & history when farm or crop changes
  useEffect(() => {
    if (!selectedFarmId || !farmInfo?.id) return;
    let cancelled = false;
    (async () => {
      setDiagnosisLoading(true);
      try {
        const [diag, hist] = await Promise.all([
          phase1BackendService.pests.latest(selectedFarmId),
          phase1BackendService.pests.history(selectedFarmId),
        ]);
        if (cancelled) return;
        if (diag) {
          setDiagnosis(diag);
          if (!selectedCrop && diag.crop) setSelectedCrop(diag.crop);
        }
        setHistory(Array.isArray(hist) ? hist : []);
      } catch { /* ignore */ }
      if (!cancelled) setDiagnosisLoading(false);
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFarmId, farmInfo?.id]);

  useEffect(() => {
    if (!farmDistrict) return;
    let cancelled = false;
    (async () => {
      setOutbreakLoading(true);
      try {
        const data = await phase1BackendService.pests.outbreaks({ district: farmDistrict });
        if (!cancelled) setOutbreak(data);
      } catch { /* ignore */ }
      if (!cancelled) setOutbreakLoading(false);
    })();
    return () => { cancelled = true; };
  }, [farmDistrict]);

  // Load symptoms when crop changes
  useEffect(() => {
    if (!selectedCrop) { setSymptomOptions([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const data = await phase1BackendService.pests.symptoms(selectedCrop);
        if (!cancelled) setSymptomOptions(Array.isArray(data) ? data : []);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [selectedCrop]);

  // Load library
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLibraryLoading(true);
      try {
        const params = { page: libraryPage, pageSize: 9 };
        if (librarySearch) params.search = librarySearch;
        if (libraryCrop) params.crop = libraryCrop;
        if (libraryType && libraryType !== "All") params.type = libraryType;
        const result = await phase1BackendService.pests.library(params);
        if (!cancelled) {
          setLibraryData(Array.isArray(result.data) ? result.data : []);
          setLibraryPagination(result.pagination || null);
        }
      } catch { /* ignore */ }
      if (!cancelled) setLibraryLoading(false);
    })();
    return () => { cancelled = true; };
  }, [librarySearch, libraryCrop, libraryType, libraryPage]);

  // Close popover on outside click
  useEffect(() => {
    if (!symptomDropdownOpen) return;
    function handleClick(e) {
      if (symptomRef.current && !symptomRef.current.contains(e.target)) setSymptomDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [symptomDropdownOpen]);

  const filteredSymptoms = useMemo(() => {
    if (!symptomSearch) return symptomOptions;
    const q = symptomSearch.toLowerCase();
    return symptomOptions.filter((s) => s.name.toLowerCase().includes(q));
  }, [symptomOptions, symptomSearch]);

  const toggleSymptom = useCallback((name) => {
    setSelectedSymptoms((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  }, []);

  const visibleChips = selectedSymptoms.slice(0, 4);
  const extraChips = selectedSymptoms.length - 4;

  const handleImageUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      toast.error("Only JPG and PNG files are accepted.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5 MB.");
      return;
    }
    setUploadedImage(file);
    setUploadedImageName(file.name);
    if (backendMode) {
      setRecognitionLoading(true);
      try {
        const result = await phase1BackendService.pests.uploadImage(file);
        setRecognition(result);
        if (result?.matchedCondition?.name) {
          toast.success("Image recognized", { description: `Detected: ${result.matchedCondition.name}` });
        }
      } catch (err) {
        setRecognition({ inference: { error: err.message } });
      }
      setRecognitionLoading(false);
    }
  }, [backendMode]);

  const handleAnalyze = useCallback(async () => {
    if (!selectedFarmId || !selectedCrop) {
      toast.error("Select a farm and crop before analyzing.");
      return;
    }
    if (selectedSymptoms.length === 0) {
      toast.error("Select at least one symptom.");
      return;
    }
    setAnalysisSubmitting(true);
    try {
      const result = await phase1BackendService.pests.analyze(selectedFarmId, {
        crop: selectedCrop,
        symptoms: selectedSymptoms,
        affectedArea,
        uploadedImageName: uploadedImage ? uploadedImage.name : "",
      });
      setDiagnosis(result);
      toast.success("Analysis completed", { description: "A new pest and disease assessment has been saved." });
      const hist = await phase1BackendService.pests.history(selectedFarmId);
      setHistory(Array.isArray(hist) ? hist : []);
    } catch (err) {
      toast.error("Analysis failed", { description: err?.message || "Unable to complete analysis." });
    }
    setAnalysisSubmitting(false);
  }, [selectedFarmId, selectedCrop, selectedSymptoms, affectedArea, uploadedImage]);

  const handleReset = useCallback(() => {
    setSelectedSymptoms([]);
    setAffectedArea(30);
    setUploadedImage(null);
    setUploadedImageName("");
    setRecognition(null);
  }, []);

  const handleAction = useCallback(async (action) => {
    if (!diagnosis?.id) return;
    setActionLoading(action);
    try {
      let result;
      if (action === "accept") result = await phase1BackendService.pests.acceptDiagnosis(diagnosis.id);
      else if (action === "complete") result = await phase1BackendService.pests.completeDiagnosis(diagnosis.id);
      else if (action === "reject") result = await phase1BackendService.pests.rejectDiagnosis(diagnosis.id);
      if (result) {
        setDiagnosis((prev) => ({ ...prev, ...result }));
        const actionLabel = action === "accept" ? "accepted" : action === "complete" ? "completed" : "rejected";
        toast.success(`Recommendation ${actionLabel}`);
      }
    } catch (err) {
      toast.error("Action failed", { description: err?.message });
    }
    setActionLoading("");
  }, [diagnosis]);

  return (
    <PageShell maxWidth="1380px">
      <PageHeader title="Pest & Disease Intelligence" subtitle="Real-time pest diagnosis, regional outbreak tracking, and disease reference library." />

      <div className="pdi-filter-bar">
        <div className="pdi-filter-left">
          <label className="pdi-filter-field">
            <span className="pdi-filter-label">Farm</span>
            <select value={selectedFarmId} onChange={(e) => { setSelectedFarmId(e.target.value); setSelectedCrop(""); setDiagnosis(null); setHistory([]); }}>
              {farms.map((f) => <option key={f.id} value={f.id}>{f.name || f.farmName}</option>)}
              {farms.length === 0 && <option value="">No farms available</option>}
            </select>
          </label>
          <label className="pdi-filter-field">
            <span className="pdi-filter-label">Crop</span>
            <select value={selectedCrop} onChange={(e) => { setSelectedCrop(e.target.value); setSelectedSymptoms([]); }}>
              <option value="">Select crop</option>
              {cropOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        </div>
        <div className="pdi-filter-right">
          <StatusBadge variant={backendMode ? "success" : "default"}>{backendMode ? "Backend connected" : "Offline mode"}</StatusBadge>
        </div>
      </div>

      <div className="pdi-main-layout">
        <div className="pdi-main-left">
          <div className="pdi-diagnosis-card">
            <div className="pdi-card-head"><h3>Current Diagnosis</h3></div>
            {diagnosisLoading && <p className="pdi-loading">Loading diagnosis...</p>}
            {!diagnosisLoading && !diagnosis && (
              <p className="pdi-empty">Not enough information is available to produce a diagnosis. Select symptoms or upload a crop image.</p>
            )}
            {!diagnosisLoading && diagnosis && (
              <div className="pdi-diagnosis-row">
                <div className="pdi-diag-image-wrap">
                  <PlantHealthImage
                    src={diagnosis.conditionImageUrl || diagnosis.topDiagnosis?.imageUrl}
                    alt={diagnosis.diseaseName}
                  />
                  <div className="pdi-diag-conf">{diagnosis.confidence}%</div>
                </div>
                <div className="pdi-diag-body">
                  <div className="pdi-diag-head">
                    <h2>{diagnosis.diseaseName}</h2>
                    <span className="pdi-diag-sci">{diagnosis.scientificName}</span>
                  </div>
                  <div className="pdi-diag-meta-grid">
                    <div className="pdi-diag-meta-item"><span className="pdi-diag-meta-label">Severity</span><strong>{diagnosis.priority || diagnosis.currentRisk}</strong></div>
                    <div className="pdi-diag-meta-item"><span className="pdi-diag-meta-label">Diagnostic match</span><strong>{diagnosis.confidence}%</strong></div>
                    <div className="pdi-diag-meta-item"><span className="pdi-diag-meta-label">Affected crop</span><strong>{diagnosis.crop}</strong></div>
                    <div className="pdi-diag-meta-item"><span className="pdi-diag-meta-label">Crop stage</span><strong>{diagnosis.cropStage}</strong></div>
                    <div className="pdi-diag-meta-item"><span className="pdi-diag-meta-label">Symptoms</span><strong>{(Array.isArray(diagnosis.symptoms) ? diagnosis.symptoms : [diagnosis.symptom]).join(", ")}</strong></div>
                    <div className="pdi-diag-meta-item"><span className="pdi-diag-meta-label">Status</span><StatusBadge variant={diagnosis.status === "Accepted" ? "success" : diagnosis.status === "Completed" ? "success" : diagnosis.status === "Rejected" ? "red" : "default"}>{diagnosis.status}</StatusBadge></div>
                  </div>
                  {diagnosis.weatherContribution?.current && (
                    <div className="pdi-diag-weather-line">
                      <Thermometer size={14} /> {diagnosis.weatherContribution.current.temperature || "--"}C
                      <Droplets size={14} /> {diagnosis.weatherContribution.current.humidity || "--"}% humidity
                    </div>
                  )}
                  <p className="pdi-diag-explanation">{diagnosis.explanation?.summary || "Current weather conditions and reported symptoms are consistent with the detected disease risk."}</p>
                  <div className="pdi-diag-actions">
                    <ActionButton onClick={() => handleAction("accept")} disabled={actionLoading === "accept" || diagnosis.status !== "Pending"}>
                      {actionLoading === "accept" ? "Accepting..." : <><BadgeCheck size={14} /> Accept Recommendation</>}
                    </ActionButton>
                    <ActionButton onClick={() => handleAction("complete")} disabled={actionLoading === "complete" || diagnosis.status === "Completed"}>
                      {actionLoading === "complete" ? "Completing..." : <><CheckCircle2 size={14} /> Mark Complete</>}
                    </ActionButton>
                    <ActionButton onClick={() => handleAction("reject")} disabled={actionLoading === "reject" || diagnosis.status !== "Pending"}>
                      {actionLoading === "reject" ? "Rejecting..." : <><X size={14} /> Reject</>}
                    </ActionButton>
                  </div>
                </div>
              </div>
            )}
          </div>

          <AppCard>
            <div className="pdi-card-head"><h3>Historical Records</h3></div>
            {historyLoading && <p className="pdi-loading">Loading history...</p>}
            {!historyLoading && history.length === 0 && <p className="pdi-empty">No diagnosis records found for this farm.</p>}
            {!historyLoading && history.length > 0 && (
              <>
                <div className="pdi-history-table">
                  <div className="pdi-history-head">
                    <span className="pdi-h-date">Date</span>
                    <span className="pdi-h-pathogen">Pathogen</span>
                    <span className="pdi-h-severity">Severity</span>
                    <span className="pdi-h-action">Action</span>
                    <span className="pdi-h-outcome">Outcome</span>
                  </div>
                  {history.slice(0, 5).map((row) => (
                    <div key={row.id} className="pdi-history-row">
                      <span className="pdi-h-date">{formatDate(row.date)}</span>
                      <span className="pdi-h-pathogen">{row.pathogen}</span>
                      <span className="pdi-h-severity">{row.severity}</span>
                      <span className="pdi-h-action">{row.action}</span>
                      <span className="pdi-h-outcome">{row.outcome}</span>
                    </div>
                  ))}
                </div>
                {history.length > 5 && <p style={{ textAlign: "center", marginTop: 12, fontSize: 13, color: "#6b7280" }}>+{history.length - 5} more records. View All History</p>}
              </>
            )}
          </AppCard>
        </div>

        <div className="pdi-main-right">
          <div className="pdi-symptom-card">
            <div className="pdi-card-head"><h3>Symptom Checker</h3></div>
            <div className="pdi-symptom-body">
              <div className="pdi-symptom-info">
                <div className="pdi-symptom-info-item"><span className="pdi-symptom-info-label">Farm</span><strong>{farmInfo?.name || "--"}</strong></div>
                <div className="pdi-symptom-info-item"><span className="pdi-symptom-info-label">Crop</span><strong>{selectedCrop || "Not selected"}</strong></div>
              </div>

              {!selectedCrop ? (
                <p className="pdi-empty" style={{ fontSize: 13, margin: "12px 0" }}>Select a crop to view relevant symptoms.</p>
              ) : symptomOptions.length === 0 ? (
                <p className="pdi-empty" style={{ fontSize: 13, margin: "12px 0" }}>No verified symptoms are configured for this crop.</p>
              ) : (
                <>
                  <div className="pdi-chips-label">Symptoms</div>
                  <div className="pdi-symptom-select-wrap" ref={symptomRef}>
                    <button
                      type="button"
                      className="pdi-symptom-trigger"
                      onClick={() => setSymptomDropdownOpen((prev) => !prev)}
                      disabled={!selectedCrop}
                    >
                      {selectedSymptoms.length === 0
                        ? "Select symptoms..."
                        : `${selectedSymptoms.length} selected`}
                      <ChevronDown size={14} />
                    </button>

                    {symptomDropdownOpen && (
                      <div className="pdi-symptom-dropdown">
                        <div className="pdi-symptom-search-wrap">
                          <Search size={14} />
                          <input
                            type="text"
                            className="pdi-symptom-search"
                            placeholder="Search symptoms..."
                            value={symptomSearch}
                            onChange={(e) => setSymptomSearch(e.target.value)}
                            autoFocus
                          />
                        </div>
                        <div className="pdi-symptom-list">
                          {filteredSymptoms.length === 0 && (
                            <div className="pdi-symptom-empty">No symptoms match your search.</div>
                          )}
                          {filteredSymptoms.map((s) => (
                            <label key={s.name} className={`pdi-symptom-option ${selectedSymptoms.includes(s.name) ? "checked" : ""}`}>
                              <input
                                type="checkbox"
                                checked={selectedSymptoms.includes(s.name)}
                                onChange={() => toggleSymptom(s.name)}
                              />
                              <span className="pdi-symptom-option-name">{s.name}</span>
                              <span className="pdi-symptom-option-count">x{s.conditionCount}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedSymptoms.length > 0 && (
                      <div className="pdi-chips-row">
                        {visibleChips.map((s) => (
                          <button key={s} type="button" className="pdi-chip active" onClick={() => toggleSymptom(s)}>
                            {s} <X size={12} />
                          </button>
                        ))}
                        {extraChips > 0 && <span className="pdi-chip-more">+{extraChips} more</span>}
                        <button type="button" className="pdi-chip-clear" onClick={() => setSelectedSymptoms([])}>Clear All</button>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="pdi-slider-row">
                <span className="pdi-slider-label">Affected area: {affectedArea}%</span>
                <input type="range" className="pdi-range" min={0} max={100} value={affectedArea} onChange={(e) => setAffectedArea(Number(e.target.value))} />
              </div>

              <div className="pdi-upload-area">
                {uploadedImageName ? (
                  <div className="pdi-upload-result">
                    <div className="pdi-upload-preview">
                      <ImageUp size={16} /><span className="pdi-upload-name">{uploadedImageName}</span>
                      <button type="button" className="pdi-upload-remove" onClick={() => { setUploadedImage(null); setUploadedImageName(""); setRecognition(null); }}><X size={14} /></button>
                    </div>
                    {recognitionLoading && <span className="pdi-recog-loading"><Scan size={14} /> Analyzing image...</span>}
                    {!recognitionLoading && recognition && (
                      <div className="pdi-recog-result">
                        {recognition.matchedCondition ? (
                          <span className="pdi-recog-match"><CheckCircle2 size={14} color="#16a34a" /> {recognition.matchedCondition.name}</span>
                        ) : (
                          <span className="pdi-recog-nomatch"><X size={14} color="#dc2626" /> No disease match found</span>
                        )}
                        {recognition.inference?.quality && (
                          <span className="pdi-recog-quality">Image quality: {recognition.inference.quality}</span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <label className={`pdi-upload-label ${!selectedCrop ? "disabled" : ""}`}>
                    <Upload size={16} /> Upload crop image (JPG/PNG, max 5 MB)
                    <input type="file" className="pdi-upload-input" accept="image/jpeg,image/png,image/jpg" onChange={handleImageUpload} disabled={!selectedCrop} />
                  </label>
                )}
              </div>

              <div className="pdi-symptom-actions">
                <ActionButton onClick={handleAnalyze} disabled={analysisSubmitting || !selectedCrop || selectedSymptoms.length === 0}>
                  {analysisSubmitting ? "Analyzing..." : "Analyze Symptoms"}
                </ActionButton>
                <ActionButton onClick={handleReset} disabled={analysisSubmitting}>Reset</ActionButton>
              </div>
            </div>
          </div>

          <div className="pdi-regional-body">
            <div className="pdi-card-head"><h3>Regional Outbreak Tracking</h3></div>
            {outbreakLoading && <p className="pdi-loading">Loading outbreak data...</p>}
            {!outbreakLoading && !outbreak && <p className="pdi-empty">No confirmed regional outbreak records are available for this district.</p>}
            {!outbreakLoading && outbreak && (
              <>
                <div className="pdi-regional-top">
                  <span className="pdi-regional-district">{farmDistrict || outbreak.district}</span>
                  <span className={`pdi-risk-badge ${outbreak.risk === "High Risk" ? "high" : outbreak.risk === "Moderate Risk" ? "moderate" : "low"}`}>{outbreak.risk}</span>
                </div>
                <div className="pdi-regional-intensity">
                  <span>Outbreak intensity: {outbreak.intensity}/10</span>
                  <div className="pdi-intensity-bar-bg"><div className="pdi-intensity-bar-fill" style={{ width: `${outbreak.intensity * 10}%` }} /></div>
                </div>
                <div className="pdi-regional-stats">
                  <div className="pdi-regional-stat"><span className="pdi-reg-stat-label">Trend</span><span className="pdi-reg-stat-value">{outbreak.trend}</span></div>
                  <div className="pdi-regional-stat"><span className="pdi-reg-stat-label">Nearby cases</span><span className="pdi-reg-stat-value">{outbreak.nearbyCases}</span></div>
                </div>
                <div className="pdi-regional-map">
                  <MapPinned size={16} />
                  <span className="pdi-reg-map-label">{outbreak.nearbyCases > 0 ? `${outbreak.nearbyCases} confirmed case(s) in ${farmDistrict || outbreak.district}` : "No cases in this district"}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <AppCard>
        <div className="pdi-card-head"><h3>Disease Library</h3></div>
        <div className="pdi-lib-toolbar">
          <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: 9, color: "#9ca3af" }} />
            <input className="pdi-search-input" type="text" placeholder="Search diseases..." value={librarySearch} onChange={(e) => { setLibrarySearch(e.target.value); setLibraryPage(1); }} style={{ paddingLeft: 30, fontSize: 13 }} />
          </div>
          <select value={libraryCrop} onChange={(e) => { setLibraryCrop(e.target.value); setLibraryPage(1); }} className="pdi-lib-filter-select">
            <option value="">All crops</option>
            {ALL_CROPS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={libraryType} onChange={(e) => { setLibraryType(e.target.value); setLibraryPage(1); }} className="pdi-lib-filter-select">
            <option value="All">All</option>
            <option value="Disease">Diseases</option>
            <option value="Pest">Pests</option>
          </select>
        </div>

        {libraryLoading && <p className="pdi-loading">Loading library...</p>}
        {!libraryLoading && libraryData.length === 0 && <p className="pdi-empty">No diseases or pests match the current filters.</p>}
        {!libraryLoading && libraryData.length > 0 && (
          <>
            <div className="pdi-library-grid">
              {libraryData.map((d) => (
                <div key={d.id} className="pdi-library-card">
                  <div className="pdi-lib-img-wrap">
                    <PlantHealthImage src={d.imageUrl} alt={d.name} />
                    {d.imageAuthor && (
                      <span className="pdi-lib-credit" title={`${d.imageAuthor}${d.imageLicence ? " - " + d.imageLicence : ""}`}>
                        <CreativeCommons size={10} /> {d.imageAuthor}
                      </span>
                    )}
                    {d.recognitionSupported && (
                      <span className="pdi-lib-recog-badge"><Scan size={10} /> AI Ready</span>
                    )}
                  </div>
                  <div className="pdi-lib-body">
                    <strong>{d.name}</strong>
                    <span className="pdi-lib-sci">{d.scientificName}</span>
                    <div className="pdi-lib-tags">
                      <span className="pdi-lib-tag">{d.type}</span>
                      <span className="pdi-lib-tag">{d.severity}</span>
                    </div>
                    <p className="pdi-lib-prev">{d.preventionAdvice?.slice(0, 120)}...</p>
                  </div>
                </div>
              ))}
            </div>

            {libraryPagination && libraryPagination.totalPages > 1 && (
              <div className="pdi-lib-pagination">
                <button
                  type="button"
                  className="pdi-page-btn"
                  disabled={libraryPage <= 1}
                  onClick={() => setLibraryPage((p) => Math.max(p - 1, 1))}
                >
                  Previous
                </button>
                <span className="pdi-page-info">
                  Page {libraryPagination.page} of {libraryPagination.totalPages}
                </span>
                <button
                  type="button"
                  className="pdi-page-btn"
                  disabled={libraryPage >= libraryPagination.totalPages}
                  onClick={() => setLibraryPage((p) => Math.min(p + 1, libraryPagination.totalPages))}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </AppCard>
    </PageShell>
  );
}
