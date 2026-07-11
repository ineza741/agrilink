import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { phase1BackendService } from "../../services/phase1Backend";
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  LoaderCircle,
  RefreshCw,
  Search,
  Eye,
  Ban,
  PlayCircle,
} from "lucide-react";
import { toast } from "sonner";

const TABS = ["Pending", "Approved", "Rejected", "Suspended", "All"];

const STATUS_STYLES = {
  Pending: { bg: "#fef3c7", color: "#92400e", border: "#f59e0b" },
  Approved: { bg: "#d1fae5", color: "#065f46", border: "#10b981" },
  Rejected: { bg: "#fee2e2", color: "#991b1b", border: "#ef4444" },
  Suspended: { bg: "#f3f4f6", color: "#374151", border: "#9ca3af" },
};

function StatusChip({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.Pending;
  return (
    <span
      className="recommendation-status-chip"
      style={{
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        padding: "2px 10px",
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      {status === "Pending" && <Clock size={12} />}
      {status === "Approved" && <CheckCircle2 size={12} />}
      {status === "Rejected" && <XCircle size={12} />}
      {status === "Suspended" && <Ban size={12} />}
      {status}
    </span>
  );
}

function DetailField({ label, value }) {
  return (
    <div className="prototype-field">
      <label className="field-label">{label}</label>
      <div className="input-shell" style={{ minHeight: 36, display: "flex", alignItems: "center" }}>
        {value || <span style={{ color: "#9ca3af" }}>—</span>}
      </div>
    </div>
  );
}

export function MarketOfficerApplicationsPage() {
  const { user } = useAuth();

  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Pending");
  const [selectedOfficer, setSelectedOfficer] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchOfficers = useCallback(async () => {
    try {
      setLoading(true);
      let data;
      if (activeTab === "Pending") {
        data = await phase1BackendService.admin.listPendingMarketOfficers();
      } else if (activeTab === "All") {
        data = await phase1BackendService.admin.listMarketOfficers({});
      } else {
        data = await phase1BackendService.admin.listMarketOfficers({ status: activeTab });
      }
      setOfficers(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load market officer applications");
      setOfficers([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchOfficers();
  }, [fetchOfficers]);

  const handleApprove = async (officer) => {
    try {
      setActionLoading(officer.id);
      await phase1BackendService.admin.approveMarketOfficer(officer.id);
      toast.success(`Approved ${officer.fullName || officer.name}`);
      fetchOfficers();
    } catch (err) {
      toast.error(err?.message || "Failed to approve officer");
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (officer) => {
    setSelectedOfficer(officer);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!selectedOfficer) return;
    if (!rejectReason || rejectReason.trim().length < 3) {
      toast.error("Rejection reason must be at least 3 characters");
      return;
    }
    try {
      setActionLoading(selectedOfficer.id);
      await phase1BackendService.admin.rejectMarketOfficer(selectedOfficer.id, rejectReason.trim());
      toast.success(`Rejected ${selectedOfficer.fullName || selectedOfficer.name}`);
      setShowRejectModal(false);
      setSelectedOfficer(null);
      setRejectReason("");
      fetchOfficers();
    } catch (err) {
      toast.error(err?.message || "Failed to reject officer");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async (officer) => {
    try {
      setActionLoading(officer.id);
      await phase1BackendService.admin.suspendMarketOfficer(officer.id);
      toast.success(`Suspended ${officer.fullName || officer.name}`);
      fetchOfficers();
    } catch (err) {
      toast.error(err?.message || "Failed to suspend officer");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async (officer) => {
    try {
      setActionLoading(officer.id);
      await phase1BackendService.admin.reactivateMarketOfficer(officer.id);
      toast.success(`Reactivated ${officer.fullName || officer.name}`);
      fetchOfficers();
    } catch (err) {
      toast.error(err?.message || "Failed to reactivate officer");
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="prototype-panel" style={{ padding: 0 }}>
      <div style={{ padding: "24px 28px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Users size={22} style={{ color: "#16a34a" }} />
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Market Officer Applications</h1>
          </div>
          <button
            type="button"
            className="recommendation-secondary-button"
            onClick={fetchOfficers}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
        <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 13 }}>
          Review and manage market officer registration requests
        </p>
      </div>

      <div className="ai-center-panel-toolbar" style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "16px 28px", alignItems: "center" }}>
        {TABS.map((tab) => {
          const count =
            tab === "All"
              ? officers.length
              : officers.filter(
                  (o) => (o.accountStatus || o.status || "Pending").toLowerCase() === tab.toLowerCase()
                ).length;
          return (
            <button
              key={tab}
              type="button"
              className={`recommendation-secondary-button${activeTab === tab ? " selected" : ""}`}
              onClick={() => setActiveTab(tab)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontWeight: activeTab === tab ? 700 : 500,
                backgroundColor: activeTab === tab ? "#16a34a" : undefined,
                color: activeTab === tab ? "#fff" : undefined,
                borderColor: activeTab === tab ? "#16a34a" : undefined,
              }}
            >
              {tab === "Pending" && <Clock size={14} />}
              {tab === "Approved" && <CheckCircle2 size={14} />}
              {tab === "Rejected" && <XCircle size={14} />}
              {tab === "Suspended" && <Ban size={14} />}
              {tab === "All" && <Users size={14} />}
              {tab}
            </button>
          );
        })}
      </div>

      <div style={{ padding: "0 28px 28px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 60 }}>
            <LoaderCircle size={28} className="spin" style={{ color: "#16a34a" }} />
          </div>
        ) : officers.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#6b7280" }}>
            <ShieldCheck size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>No applications found</p>
            <p style={{ margin: "6px 0 0", fontSize: 13 }}>No market officer applications match the current filter.</p>
          </div>
        ) : (
          <div className="recommendation-card-list" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {officers.map((officer) => {
              const officerStatus = officer.accountStatus || officer.status || "Pending";
              return (
                <article
                  key={officer.id}
                  className="prototype-panel recommendation-card functional"
                  style={{ padding: "16px 20px" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            backgroundColor: "#dcfce7",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: 14,
                            color: "#16a34a",
                          }}
                        >
                          {(officer.fullName || officer.name || "MO")
                            .split(" ")
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                            {officer.fullName || officer.name || "Unknown Officer"}
                          </h3>
                          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b7280" }}>
                            {officer.email || "No email"}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "6px 16px", fontSize: 13, color: "#374151" }}>
                        <div>
                          <span style={{ color: "#9ca3af", fontSize: 11 }}>Phone</span>
                          <div style={{ fontWeight: 500 }}>{officer.phone || "—"}</div>
                        </div>
                        <div>
                          <span style={{ color: "#9ca3af", fontSize: 11 }}>Market</span>
                          <div style={{ fontWeight: 500 }}>{officer.marketName || officer.market || "—"}</div>
                        </div>
                        <div>
                          <span style={{ color: "#9ca3af", fontSize: 11 }}>District</span>
                          <div style={{ fontWeight: 500 }}>{officer.district || "—"}</div>
                        </div>
                        <div>
                          <span style={{ color: "#9ca3af", fontSize: 11 }}>Sector</span>
                          <div style={{ fontWeight: 500 }}>{officer.sector || "—"}</div>
                        </div>
                        <div>
                          <span style={{ color: "#9ca3af", fontSize: 11 }}>Organization</span>
                          <div style={{ fontWeight: 500 }}>{officer.organization || "—"}</div>
                        </div>
                        <div>
                          <span style={{ color: "#9ca3af", fontSize: 11 }}>Registered</span>
                          <div style={{ fontWeight: 500 }}>{formatDate(officer.createdAt)}</div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <StatusChip status={officerStatus} />

                      <button
                        type="button"
                        className="recommendation-secondary-button"
                        onClick={() => {
                          setSelectedOfficer(officer);
                          setShowDetailModal(true);
                        }}
                        style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}
                      >
                        <Eye size={14} /> View Details
                      </button>

                      {officerStatus.toLowerCase() === "pending" && (
                        <>
                          <button
                            type="button"
                            className="recommendation-primary-button"
                            onClick={() => handleApprove(officer)}
                            disabled={actionLoading === officer.id}
                            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}
                          >
                            {actionLoading === officer.id ? (
                              <LoaderCircle size={14} className="spin" />
                            ) : (
                              <CheckCircle2 size={14} />
                            )}{" "}
                            Approve
                          </button>
                          <button
                            type="button"
                            className="recommendation-danger-button recommendation-muted-button"
                            onClick={() => openRejectModal(officer)}
                            disabled={actionLoading === officer.id}
                            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}
                          >
                            <XCircle size={14} /> Reject
                          </button>
                        </>
                      )}

                      {officerStatus.toLowerCase() === "approved" && (
                        <button
                          type="button"
                          className="recommendation-muted-button"
                          onClick={() => handleSuspend(officer)}
                          disabled={actionLoading === officer.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 12,
                            color: "#d97706",
                            border: "1px solid #fbbf24",
                          }}
                        >
                          {actionLoading === officer.id ? (
                            <LoaderCircle size={14} className="spin" />
                          ) : (
                            <Ban size={14} />
                          )}{" "}
                          Suspend
                        </button>
                      )}

                      {(officerStatus.toLowerCase() === "suspended" || officerStatus.toLowerCase() === "rejected") && (
                        <button
                          type="button"
                          className="recommendation-primary-button"
                          onClick={() => handleReactivate(officer)}
                          disabled={actionLoading === officer.id}
                          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}
                        >
                          {actionLoading === officer.id ? (
                            <LoaderCircle size={14} className="spin" />
                          ) : (
                            <PlayCircle size={14} />
                          )}{" "}
                          Reactivate
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {showDetailModal && selectedOfficer && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={() => {
            setShowDetailModal(false);
            setSelectedOfficer(null);
          }}
        >
          <div
            className="prototype-panel"
            style={{ width: 600, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", padding: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Officer Details</h2>
              <button
                className="recommendation-muted-button"
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedOfficer(null);
                }}
                style={{ padding: 4 }}
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="prototype-form">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <DetailField label="Full Name" value={selectedOfficer.fullName || selectedOfficer.name} />
                <DetailField label="Email" value={selectedOfficer.email} />
                <DetailField label="Phone" value={selectedOfficer.phone} />
                <DetailField label="Status">
                  <StatusChip status={selectedOfficer.accountStatus || selectedOfficer.status || "Pending"} />
                </DetailField>
                <DetailField label="Market" value={selectedOfficer.marketName || selectedOfficer.market} />
                <DetailField label="District" value={selectedOfficer.district} />
                <DetailField label="Sector" value={selectedOfficer.sector} />
                <DetailField label="Organization" value={selectedOfficer.organization} />
                <DetailField label="Employee Number" value={selectedOfficer.employeeNumber} />
                <DetailField label="Registration Date" value={formatDate(selectedOfficer.createdAt)} />
              </div>

              {(selectedOfficer.rejectionReason || selectedOfficer.notes) && (
                <div className="prototype-field" style={{ marginTop: 16 }}>
                  <label className="field-label">
                    {selectedOfficer.rejectionReason ? "Rejection Reason" : "Notes"}
                  </label>
                  <div
                    className="input-shell"
                    style={{ minHeight: 60, whiteSpace: "pre-wrap" }}
                  >
                    {selectedOfficer.rejectionReason || selectedOfficer.notes}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button
                  className="recommendation-muted-button"
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedOfficer(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && selectedOfficer && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={() => {
            setShowRejectModal(false);
            setSelectedOfficer(null);
            setRejectReason("");
          }}
        >
          <div
            className="prototype-panel"
            style={{ width: 480, maxWidth: "95vw", padding: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <AlertTriangle size={20} style={{ color: "#dc2626" }} />
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Reject Application</h2>
              </div>
              <button
                className="recommendation-muted-button"
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedOfficer(null);
                  setRejectReason("");
                }}
                style={{ padding: 4 }}
              >
                <XCircle size={20} />
              </button>
            </div>

            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#6b7280" }}>
              You are about to reject the application from{" "}
              <strong>{selectedOfficer.fullName || selectedOfficer.name}</strong>. Please provide a reason.
            </p>

            <div className="prototype-form">
              <div className="prototype-field">
                <label className="field-label">Rejection Reason *</label>
                <textarea
                  className="input-shell"
                  rows={4}
                  placeholder="Enter a reason for rejection (minimum 3 characters)..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button
                  className="recommendation-muted-button"
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedOfficer(null);
                    setRejectReason("");
                  }}
                >
                  Cancel
                </button>
                <button
                  className="recommendation-danger-button recommendation-muted-button"
                  onClick={handleReject}
                  disabled={actionLoading === selectedOfficer.id || (rejectReason || "").trim().length < 3}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  {actionLoading === selectedOfficer.id ? (
                    <>
                      <LoaderCircle size={14} className="spin" /> Rejecting...
                    </>
                  ) : (
                    <>
                      <XCircle size={14} /> Reject Application
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
