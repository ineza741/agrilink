import { Building2, Calendar, CheckCircle2, Edit2, Hash, LoaderCircle, Mail, MapPin, Phone, Save, ShieldCheck, User, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { phase1BackendService } from "../../services/phase1Backend";

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

function getInitials(name = "MO") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function StatusBadge({ status }) {
  const palette = {
    APPROVED: { label: "Approved", color: "#166534", background: "#f0fdf4", border: "#86efac" },
    PENDING: { label: "Pending", color: "#92400e", background: "#fffbeb", border: "#fde68a" },
    REJECTED: { label: "Rejected", color: "#991b1b", background: "#fef2f2", border: "#fca5a5" },
    SUSPENDED: { label: "Suspended", color: "#374151", background: "#f3f4f6", border: "#d1d5db" },
  };
  const active = palette[status] || palette.PENDING;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        color: active.color,
        background: active.background,
        border: `1px solid ${active.border}`,
      }}
    >
      <CheckCircle2 size={13} />
      {active.label}
    </span>
  );
}

export function MarketOfficerProfilePage() {
  const { user, updateCurrentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    marketName: "",
    district: "",
    sector: "",
    organization: "",
  });

  useEffect(() => {
    setForm({
      fullName: user?.fullName || "",
      phone: user?.phone || "",
      marketName: user?.marketName || "",
      district: user?.district || "",
      sector: user?.sector || "",
      organization: user?.organization || "",
    });
  }, [user]);

  const detailRows = useMemo(
    () => [
      { label: "Email", value: user?.email || "--", icon: Mail },
      { label: "Phone", value: user?.phone || "--", icon: Phone },
      { label: "Market name", value: user?.marketName || "--", icon: MapPin },
      { label: "District", value: user?.district || "--", icon: MapPin },
      { label: "Sector", value: user?.sector || "--", icon: MapPin },
      { label: "Organization", value: user?.organization || "--", icon: Building2 },
      { label: "Employee number", value: user?.employeeNumber || "--", icon: Hash },
      { label: "Account created", value: formatDate(user?.createdAt), icon: Calendar },
    ],
    [user],
  );

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setForm({
      fullName: user?.fullName || "",
      phone: user?.phone || "",
      marketName: user?.marketName || "",
      district: user?.district || "",
      sector: user?.sector || "",
      organization: user?.organization || "",
    });
  };

  const saveProfile = async () => {
    if (!form.fullName.trim() || !form.phone.trim() || !form.marketName.trim() || !form.district.trim() || !form.sector.trim()) {
      toast.error("Complete all required profile fields.");
      return;
    }

    try {
      setSaving(true);
      const updatedUser = await phase1BackendService.auth.updateProfile({
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        marketName: form.marketName.trim(),
        district: form.district.trim(),
        sector: form.sector.trim(),
        organization: form.organization.trim() || null,
      });
      await updateCurrentUser(updatedUser);
      setIsEditing(false);
      toast.success("Profile updated successfully.");
    } catch (err) {
      toast.error(err?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="market-officer-profile-page" style={{ display: "grid", gap: 24 }}>
      <div className="page-title-block" style={{ marginBottom: 0 }}>
        <div>
          <h1>Profile</h1>
          <p>View and update your Market Officer account details.</p>
        </div>
      </div>

      <article className="prototype-panel" style={{ display: "grid", gap: 24 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 18,
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #15803d, #86efac)",
                color: "white",
                display: "grid",
                placeItems: "center",
                fontSize: 24,
                fontWeight: 800,
              }}
            >
              {getInitials(user?.fullName)}
            </div>
            <div>
              <strong style={{ display: "block", fontSize: 22 }}>{user?.fullName || "--"}</strong>
              <span style={{ color: "var(--agri-text-secondary)" }}>{user?.email || "--"}</span>
              <div style={{ marginTop: 10 }}>
                <StatusBadge status={user?.accountStatus} />
              </div>
            </div>
          </div>

          <div style={{ justifySelf: "end", display: "flex", gap: 10, flexWrap: "wrap" }}>
            {!isEditing ? (
              <button type="button" className="recommendation-primary-button" onClick={() => setIsEditing(true)} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Edit2 size={16} />
                <span>Edit Profile</span>
              </button>
            ) : (
              <>
                <button type="button" className="recommendation-muted-button" onClick={cancelEdit} disabled={saving} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <X size={16} />
                  <span>Cancel</span>
                </button>
                <button type="button" className="recommendation-primary-button" onClick={saveProfile} disabled={saving} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {saving ? <LoaderCircle size={16} className="spin" /> : <Save size={16} />}
                  <span>{saving ? "Saving..." : "Save Changes"}</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
          <div style={{ display: "grid", gap: 16 }}>
            <div className="prototype-field">
              <label className="field-label">Full Name</label>
              <div className="input-shell"><User size={15} /><input value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} disabled={!isEditing} /></div>
            </div>
            <div className="prototype-field">
              <label className="field-label">Phone</label>
              <div className="input-shell"><Phone size={15} /><input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} disabled={!isEditing} /></div>
            </div>
            <div className="prototype-field">
              <label className="field-label">Market Name</label>
              <div className="input-shell"><MapPin size={15} /><input value={form.marketName} onChange={(event) => updateField("marketName", event.target.value)} disabled={!isEditing} /></div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            <div className="prototype-field">
              <label className="field-label">District</label>
              <div className="input-shell"><MapPin size={15} /><input value={form.district} onChange={(event) => updateField("district", event.target.value)} disabled={!isEditing} /></div>
            </div>
            <div className="prototype-field">
              <label className="field-label">Sector</label>
              <div className="input-shell"><MapPin size={15} /><input value={form.sector} onChange={(event) => updateField("sector", event.target.value)} disabled={!isEditing} /></div>
            </div>
            <div className="prototype-field">
              <label className="field-label">Organization</label>
              <div className="input-shell"><Building2 size={15} /><input value={form.organization} onChange={(event) => updateField("organization", event.target.value)} disabled={!isEditing} /></div>
            </div>
          </div>
        </div>
      </article>

      <article className="prototype-panel">
        <div className="panel-toolbar" style={{ marginBottom: 18 }}>
          <div>
            <h2>Account Details</h2>
            <p>Read-only account and approval information.</p>
          </div>
          <ShieldCheck size={18} style={{ color: "var(--success)" }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {detailRows.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} style={{ border: "1px solid rgba(22, 163, 74, 0.12)", borderRadius: 16, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--agri-text-secondary)", fontSize: 13, marginBottom: 8 }}>
                  <Icon size={14} />
                  <span>{item.label}</span>
                </div>
                <strong style={{ display: "block", fontSize: 16 }}>{item.value}</strong>
              </div>
            );
          })}
        </div>
      </article>
    </section>
  );
}
