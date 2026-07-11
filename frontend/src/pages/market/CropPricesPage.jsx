import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Edit2,
  Eye,
  LoaderCircle,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { phase1BackendService } from "../../services/phase1Backend";

const PRICE_TYPES = [
  { label: "Wholesale", field: "wholesalePrice", oldField: "oldWholesale", newField: "newWholesale" },
  { label: "Retail", field: "retailPrice", oldField: "oldRetail", newField: "newRetail" },
  { label: "Farm Gate", field: "farmGatePrice", oldField: "oldFarmGate", newField: "newFarmGate" },
];

const STANDARD_CROPS = [
  "Wheat",
  "Corn",
  "Soybeans",
  "Rice",
  "Barley",
  "Beans",
  "Irish Potato",
  "Sweet Potato",
  "Cassava",
  "Sorghum",
  "Banana",
  "Plantain",
  "Groundnuts",
  "Peas",
  "Coffee",
  "Tea",
];

function formatCurrency(value) {
  if (value == null || Number.isNaN(Number(value))) return "--";
  return `RWF ${Math.round(Number(value)).toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildHistoryMap(historyItems) {
  return historyItems.reduce((accumulator, entry) => {
    const key = `${entry.cropName}||${entry.marketName}||${entry.district}`;
    if (!accumulator.has(key)) {
      accumulator.set(key, []);
    }
    accumulator.get(key).push(entry);
    return accumulator;
  }, new Map());
}

function getRowChange(historyEntry, priceType) {
  if (!historyEntry) return null;
  const config = PRICE_TYPES.find((item) => item.label === priceType);
  if (!config) return null;

  const oldValue = historyEntry[config.oldField] != null ? Number(historyEntry[config.oldField]) : null;
  const newValue = historyEntry[config.newField] != null ? Number(historyEntry[config.newField]) : null;
  if (newValue == null) return null;

  const changeValue = newValue - (oldValue || 0);
  const changePercent = oldValue > 0 ? (changeValue / oldValue) * 100 : null;

  return {
    oldValue,
    newValue,
    changeValue,
    changePercent,
    isIncrease: changeValue >= 0,
  };
}

function buildRows(prices, historyMap) {
  return prices.flatMap((record) => {
    const historyKey = `${record.cropName}||${record.marketName}||${record.district}`;
    const matchingHistory = historyMap.get(historyKey) || [];

    return PRICE_TYPES.filter((config) => record[config.field] != null).map((config) => {
      const currentValue = Number(record[config.field]);
      const latestHistory = matchingHistory.find((entry) => entry[config.newField] != null) || null;
      const change = getRowChange(latestHistory, config.label);

      return {
        id: `${record.id}-${config.field}`,
        record,
        cropName: record.cropName,
        marketName: record.marketName,
        district: record.district,
        priceType: config.label,
        currentPrice: currentValue,
        previousPrice: change?.oldValue ?? null,
        change,
        effectiveDate: record.effectiveDate,
        status: record.status,
        unit: record.unit,
        updatedBy: record.updatedBy?.fullName || record.createdBy?.fullName || "--",
        history: matchingHistory,
      };
    });
  });
}

function createInitialForm(user) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    cropName: "",
    marketName: user?.marketName || "",
    district: user?.district || "",
    sector: user?.sector || "",
    priceType: "Wholesale",
    newPrice: "",
    unit: "kg",
    effectiveDate: today,
    reason: "",
    notes: "",
  };
}

export function CropPricesPage() {
  const { user } = useAuth();
  const [prices, setPrices] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [marketFilter, setMarketFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [priceTypeFilter, setPriceTypeFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [detailsRow, setDetailsRow] = useState(null);
  const [form, setForm] = useState(createInitialForm(user));

  const loadData = async () => {
    try {
      setLoading(true);
      const [priceResponse, historyResponse] = await Promise.all([
        phase1BackendService.cropPrices.list(),
        phase1BackendService.cropPrices.history(),
      ]);
      setPrices(Array.isArray(priceResponse) ? priceResponse : []);
      setHistoryItems(Array.isArray(historyResponse) ? historyResponse : []);
    } catch (err) {
      toast.error(err?.message || "Failed to load crop prices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      marketName: current.marketName || user?.marketName || "",
      district: current.district || user?.district || "",
      sector: current.sector || user?.sector || "",
    }));
  }, [user]);

  const historyMap = useMemo(() => buildHistoryMap(historyItems), [historyItems]);
  const rows = useMemo(() => buildRows(prices, historyMap), [prices, historyMap]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        row.cropName.toLowerCase().includes(query) ||
        row.marketName.toLowerCase().includes(query) ||
        row.district.toLowerCase().includes(query);
      const matchesMarket = !marketFilter || row.marketName === marketFilter;
      const matchesDistrict = !districtFilter || row.district === districtFilter;
      const matchesPriceType = !priceTypeFilter || row.priceType === priceTypeFilter;
      return matchesSearch && matchesMarket && matchesDistrict && matchesPriceType;
    });
  }, [rows, search, marketFilter, districtFilter, priceTypeFilter]);

  const marketOptions = [...new Set(rows.map((row) => row.marketName))].sort();
  const districtOptions = [...new Set(rows.map((row) => row.district))].sort();

  const openAddModal = () => {
    setSelectedRow(null);
    setForm(createInitialForm(user));
    setIsModalOpen(true);
  };

  const openEditModal = (row) => {
    setSelectedRow(row);
    setForm({
      cropName: row.record.cropName,
      marketName: row.record.marketName,
      district: row.record.district,
      sector: row.record.sector || user?.sector || "",
      priceType: row.priceType,
      newPrice: String(row.currentPrice),
      unit: row.record.unit || "kg",
      effectiveDate: row.record.effectiveDate ? row.record.effectiveDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
      reason: "",
      notes: row.record.notes || "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setIsModalOpen(false);
    setSelectedRow(null);
    setForm(createInitialForm(user));
  };

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const validateForm = () => {
    if (!form.cropName.trim()) return "Crop is required.";
    if (!form.marketName.trim()) return "Market is required.";
    if (!form.district.trim()) return "District is required.";
    if (!form.priceType) return "Price type is required.";
    if (!form.effectiveDate) return "Effective date is required.";
    if (!form.reason.trim() || form.reason.trim().length < 3) return "Reason for update is required.";
    if (Number(form.newPrice) <= 0) return "Price must be greater than zero.";
    return "";
  };

  const savePrice = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (saving) return;

    const selectedType = PRICE_TYPES.find((item) => item.label === form.priceType);
    const parsedValue = Number(form.newPrice);
    const record = selectedRow?.record || null;

    const payload = {
      cropName: form.cropName.trim(),
      marketName: form.marketName.trim(),
      district: form.district.trim(),
      sector: form.sector.trim() || null,
      unit: form.unit.trim() || "kg",
      effectiveDate: form.effectiveDate,
      notes: form.notes.trim() || null,
      reason: form.reason.trim(),
      wholesalePrice: record ? Number(record.wholesalePrice) : parsedValue,
      retailPrice: record ? Number(record.retailPrice) : parsedValue,
      farmGatePrice: record?.farmGatePrice != null ? Number(record.farmGatePrice) : null,
    };

    if (selectedType?.field === "wholesalePrice") payload.wholesalePrice = parsedValue;
    if (selectedType?.field === "retailPrice") payload.retailPrice = parsedValue;
    if (selectedType?.field === "farmGatePrice") payload.farmGatePrice = parsedValue;

    try {
      setSaving(true);
      if (record) {
        await phase1BackendService.cropPrices.update(record.id, payload);
        toast.success("Crop price updated successfully.");
      } else {
        await phase1BackendService.cropPrices.create(payload);
        toast.success("Crop price added successfully.");
      }
      closeModal();
      await loadData();
    } catch (err) {
      toast.error(err?.message || "Failed to save crop price.");
    } finally {
      setSaving(false);
    }
  };

  const activeCount = rows.filter((row) => row.status === "Active").length;

  return (
    <section className="market-officer-prices-page" style={{ display: "grid", gap: 24 }}>
      <div className="page-title-block" style={{ marginBottom: 0 }}>
        <div>
          <h1>Crop Prices</h1>
          <p>View and maintain official crop prices from the backend price registry.</p>
        </div>
        <button
          type="button"
          className="recommendation-primary-button"
          onClick={openAddModal}
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <Plus size={16} />
          <span>Add Crop Price</span>
        </button>
      </div>

      <article className="prototype-panel" style={{ display: "grid", gap: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
            <input
              type="text"
              className="input-shell"
              placeholder="Search crop, market, or district"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ width: "100%", paddingLeft: 38 }}
            />
          </div>

          <select className="input-shell" value={marketFilter} onChange={(event) => setMarketFilter(event.target.value)}>
            <option value="">All markets</option>
            {marketOptions.map((market) => (
              <option key={market} value={market}>{market}</option>
            ))}
          </select>

          <select className="input-shell" value={districtFilter} onChange={(event) => setDistrictFilter(event.target.value)}>
            <option value="">All districts</option>
            {districtOptions.map((district) => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>

          <select className="input-shell" value={priceTypeFilter} onChange={(event) => setPriceTypeFilter(event.target.value)}>
            <option value="">All price types</option>
            {PRICE_TYPES.map((type) => (
              <option key={type.label} value={type.label}>{type.label}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ color: "var(--agri-text-secondary)", fontSize: 13 }}>{activeCount} active price rows</span>
          <button
            type="button"
            className="recommendation-secondary-button"
            onClick={loadData}
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: 48 }}>
            <LoaderCircle size={18} className="spin" />
            <span>Loading crop prices...</span>
          </div>
        ) : filteredRows.length === 0 ? (
          <div style={{ border: "1px dashed rgba(22, 163, 74, 0.24)", borderRadius: 18, padding: 24, color: "var(--agri-text-secondary)" }}>
            No crop prices have been updated yet.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1040 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(22, 163, 74, 0.14)" }}>
                  {[
                    "Crop",
                    "Market",
                    "District",
                    "Price Type",
                    "Current Price",
                    "Previous Price",
                    "Change",
                    "Effective Date",
                    "Status",
                    "Last Updated By",
                    "Actions",
                  ].map((column) => (
                    <th key={column} style={{ textAlign: "left", padding: "14px 12px", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", color: "#4b5563" }}>
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id} style={{ borderBottom: "1px solid rgba(229, 231, 235, 0.85)" }}>
                    <td style={{ padding: "14px 12px", fontWeight: 600 }}>{row.cropName}</td>
                    <td style={{ padding: "14px 12px" }}>{row.marketName}</td>
                    <td style={{ padding: "14px 12px" }}>{row.district}</td>
                    <td style={{ padding: "14px 12px" }}>{row.priceType}</td>
                    <td style={{ padding: "14px 12px", fontWeight: 600 }}>{formatCurrency(row.currentPrice)}</td>
                    <td style={{ padding: "14px 12px" }}>{formatCurrency(row.previousPrice)}</td>
                    <td style={{ padding: "14px 12px" }}>
                      {row.change ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: row.change.isIncrease ? "var(--success)" : "var(--danger)", fontWeight: 600 }}>
                          {row.change.isIncrease ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                          {row.change.changePercent == null ? "New" : `${row.change.isIncrease ? "+" : ""}${row.change.changePercent.toFixed(1)}%`}
                        </span>
                      ) : (
                        "--"
                      )}
                    </td>
                    <td style={{ padding: "14px 12px" }}>{formatDate(row.effectiveDate)}</td>
                    <td style={{ padding: "14px 12px" }}>
                      <span className="stat-badge tone-green">{row.status}</span>
                    </td>
                    <td style={{ padding: "14px 12px" }}>{row.updatedBy}</td>
                    <td style={{ padding: "14px 12px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" className="recommendation-muted-button" onClick={() => openEditModal(row)} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <Edit2 size={14} />
                          <span>Edit Price</span>
                        </button>
                        <button type="button" className="recommendation-secondary-button" onClick={() => setDetailsRow(row)} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <Eye size={14} />
                          <span>View Details</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}>
          <div className="prototype-panel" style={{ width: "min(720px, 100%)", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="panel-toolbar" style={{ marginBottom: 20 }}>
              <div>
                <h2>{selectedRow ? "Edit Crop Price" : "Add Crop Price"}</h2>
                <p>Save official price changes directly to the backend.</p>
              </div>
              <button type="button" className="recommendation-muted-button" onClick={closeModal} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <div className="prototype-field">
                <label className="field-label">Crop</label>
                <select className="input-shell" value={form.cropName} onChange={(event) => updateForm("cropName", event.target.value)} disabled={Boolean(selectedRow)}>
                  <option value="">Select crop</option>
                  {STANDARD_CROPS.map((crop) => (
                    <option key={crop} value={crop}>{crop}</option>
                  ))}
                </select>
              </div>

              <div className="prototype-field">
                <label className="field-label">Market</label>
                <input className="input-shell" value={form.marketName} onChange={(event) => updateForm("marketName", event.target.value)} disabled={Boolean(selectedRow)} />
              </div>

              <div className="prototype-field">
                <label className="field-label">District</label>
                <input className="input-shell" value={form.district} onChange={(event) => updateForm("district", event.target.value)} disabled={Boolean(selectedRow)} />
              </div>

              <div className="prototype-field">
                <label className="field-label">Price Type</label>
                <select className="input-shell" value={form.priceType} onChange={(event) => updateForm("priceType", event.target.value)}>
                  {PRICE_TYPES.map((type) => (
                    <option key={type.label} value={type.label}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="prototype-field">
                <label className="field-label">New Price</label>
                <input type="number" min="0.01" step="0.01" className="input-shell" value={form.newPrice} onChange={(event) => updateForm("newPrice", event.target.value)} />
              </div>

              <div className="prototype-field">
                <label className="field-label">Unit</label>
                <input className="input-shell" value={form.unit} onChange={(event) => updateForm("unit", event.target.value)} />
              </div>

              <div className="prototype-field">
                <label className="field-label">Effective Date</label>
                <input type="date" className="input-shell" value={form.effectiveDate} onChange={(event) => updateForm("effectiveDate", event.target.value)} />
              </div>

              <div className="prototype-field" style={{ gridColumn: "1 / -1" }}>
                <label className="field-label">Reason for Update</label>
                <input className="input-shell" value={form.reason} onChange={(event) => updateForm("reason", event.target.value)} placeholder="Why is this price changing?" />
              </div>

              <div className="prototype-field" style={{ gridColumn: "1 / -1" }}>
                <label className="field-label">Notes</label>
                <textarea className="input-shell" rows={4} value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} placeholder="Optional notes" />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button type="button" className="recommendation-muted-button" onClick={closeModal} disabled={saving}>Cancel</button>
              <button type="button" className="recommendation-primary-button" onClick={savePrice} disabled={saving} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                {saving ? <LoaderCircle size={16} className="spin" /> : <TrendingUp size={16} />}
                <span>{saving ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {detailsRow && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}>
          <div className="prototype-panel" style={{ width: "min(860px, 100%)", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="panel-toolbar" style={{ marginBottom: 20 }}>
              <div>
                <h2>{detailsRow.cropName} Price Details</h2>
                <p>{detailsRow.marketName} • {detailsRow.district} • {detailsRow.priceType}</p>
              </div>
              <button type="button" className="recommendation-muted-button" onClick={() => setDetailsRow(null)} aria-label="Close details">
                <X size={16} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 22 }}>
              <div style={{ border: "1px solid rgba(22, 163, 74, 0.12)", borderRadius: 16, padding: 16 }}>
                <span style={{ color: "var(--agri-text-secondary)", fontSize: 13 }}>Current price</span>
                <strong style={{ display: "block", marginTop: 6, fontSize: 18 }}>{formatCurrency(detailsRow.currentPrice)}</strong>
              </div>
              <div style={{ border: "1px solid rgba(22, 163, 74, 0.12)", borderRadius: 16, padding: 16 }}>
                <span style={{ color: "var(--agri-text-secondary)", fontSize: 13 }}>Previous price</span>
                <strong style={{ display: "block", marginTop: 6, fontSize: 18 }}>{formatCurrency(detailsRow.previousPrice)}</strong>
              </div>
              <div style={{ border: "1px solid rgba(22, 163, 74, 0.12)", borderRadius: 16, padding: 16 }}>
                <span style={{ color: "var(--agri-text-secondary)", fontSize: 13 }}>Effective date</span>
                <strong style={{ display: "block", marginTop: 6, fontSize: 18 }}>{formatDate(detailsRow.effectiveDate)}</strong>
              </div>
              <div style={{ border: "1px solid rgba(22, 163, 74, 0.12)", borderRadius: 16, padding: 16 }}>
                <span style={{ color: "var(--agri-text-secondary)", fontSize: 13 }}>Last updated by</span>
                <strong style={{ display: "block", marginTop: 6, fontSize: 18 }}>{detailsRow.updatedBy}</strong>
              </div>
            </div>

            <h3 style={{ marginTop: 0, marginBottom: 14 }}>Recent Price History</h3>
            {detailsRow.history.length === 0 ? (
              <div style={{ border: "1px dashed rgba(22, 163, 74, 0.24)", borderRadius: 18, padding: 20, color: "var(--agri-text-secondary)" }}>
                No recent price history is available for this crop and market.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {detailsRow.history
                  .filter((item) => {
                    const config = PRICE_TYPES.find((type) => type.label === detailsRow.priceType);
                    return config ? item[config.newField] != null : true;
                  })
                  .map((item) => {
                    const change = getRowChange(item, detailsRow.priceType);
                    return (
                      <div key={item.id} style={{ border: "1px solid rgba(22, 163, 74, 0.12)", borderRadius: 16, padding: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                          <div>
                            <strong style={{ display: "block", marginBottom: 4 }}>{formatCurrency(change?.oldValue)} to {formatCurrency(change?.newValue)}</strong>
                            <span style={{ color: "var(--agri-text-secondary)", fontSize: 13 }}>{formatDate(item.effectiveDate)}</span>
                          </div>
                          <span className="stat-badge tone-green">{item.status || "Published"}</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 14, fontSize: 13 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <User size={14} />
                            <span>{item.changedBy?.fullName || "Unknown"}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Calendar size={14} />
                            <span>{formatDate(item.createdAt)}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {change?.isIncrease ? <ArrowUpRight size={14} style={{ color: "var(--success)" }} /> : <ArrowDownRight size={14} style={{ color: "var(--danger)" }} />}
                            <span>{change?.changePercent == null ? "New" : `${change.isIncrease ? "+" : ""}${change.changePercent.toFixed(1)}%`}</span>
                          </div>
                        </div>
                        {item.reason && <p style={{ margin: "12px 0 0", color: "var(--agri-text-secondary)", fontSize: 13 }}>Reason: {item.reason}</p>}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
