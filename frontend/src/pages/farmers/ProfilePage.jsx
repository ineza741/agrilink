import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  CircleAlert,
  Mail,
  MapPin,
  PencilLine,
  Phone,
  PlusCircle,
  ScanLine,
  ShieldCheck,
  Sprout,
  Waves,
  Tractor,
  MapPinned,
  CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useFarmerData } from "../../context/FarmerDataContext";
import { PageShell } from "../../components/common/PageShell";
import { PageHeader } from "../../components/common/PageHeader";
import { AppCard } from "../../components/common/AppCard";
import { MetricCard } from "../../components/common/MetricCard";
import { ActionButton } from "../../components/common/ActionButton";
import { StatusBadge } from "../../components/common/StatusBadge";
import { getFarmImage } from "../../data/cropImages";

function initialsFromName(name = "Farmer") {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatStatus(status) {
  if (status === "verified") return "Verified";
  if (status === "inactive") return "Inactive";
  return "Pending Review";
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentProfile, currentFarms, getProfileCompleteness, updateProfile, submitProfileForApproval } =
    useFarmerData();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    contact: "",
    region: "",
    experienceLevel: "",
    farmerType: "Individual Farmer",
    cooperativeName: "",
    notes: "",
  });
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!currentProfile) return;
    setForm({
      fullName: currentProfile.fullName || "",
      email: currentProfile.email || "",
      contact: currentProfile.contact || "",
      region: currentProfile.region || "",
      experienceLevel: currentProfile.experienceLevel || "",
      farmerType: currentProfile.farmerType || "Individual Farmer",
      cooperativeName: currentProfile.cooperativeName || "",
      notes: currentProfile.notes || "",
    });
  }, [currentProfile]);

  const completeness = useMemo(
    () => (user ? getProfileCompleteness(user.id) : 0),
    [getProfileCompleteness, user]
  );

  const metrics = useMemo(() => {
    const totalAcreage = (currentFarms || []).reduce((sum, farm) => sum + Number(farm.sizeHectares || 0), 0);
    const verifiedFarms = (currentFarms || []).filter((farm) => farm.verificationStatus === "verified").length;
    return [
      { label: "Total Acreage", value: totalAcreage.toFixed(totalAcreage % 1 === 0 ? 0 : 1), unit: "ha" },
      { label: "Profile Complete", value: `${completeness}%` },
      { label: "Verified Farms", value: `${verifiedFarms}/${(currentFarms?.length || 0)}` },
    ];
  }, [completeness, currentFarms]);

  if (!currentProfile) return null;

  const profileFacts = [
    { label: "Email Address", value: currentProfile.email, icon: Mail },
    { label: "Contact", value: currentProfile.contact, icon: Phone },
    { label: "Experience", value: currentProfile.experienceLevel, icon: ScanLine },
    { label: "Base Region", value: currentProfile.region, icon: MapPin },
  ];

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSave = async () => {
    if (!user) return;
    await updateProfile(user.id, form);
    setIsEditing(false);
    setFeedback("Profile details updated successfully.");
  };

  const handleSubmitForReview = () => {
    if (!user) return;
    submitProfileForApproval(user.id);
    setFeedback("Profile submitted for verification and approval.");
  };

  return (
    <PageShell>
      <PageHeader
        title="Farmer Profile & Farm Management"
        description="Academic-grade decision support and asset oversight for modern agriculture."
      >
        <ActionButton variant="primary" icon={PlusCircle} onClick={() => navigate("/farms/new")}>
          Add New Farm
        </ActionButton>
      </PageHeader>

      {feedback ? (
        <div style={{ padding: "12px 16px", background: "var(--light-green)", borderRadius: "10px", color: "var(--primary-green)", fontSize: "14px", fontWeight: 600 }}>
          {feedback}
        </div>
      ) : null}

      <div className="profile-page-layout">
        <div className="profile-sidebar">
          <AppCard>
            <div className="profile-avatar-section">
              <div
                className="profile-avatar-ring"
                style={{ "--completeness": `${completeness}%` }}
              >
                <div className="profile-avatar-inner">{initialsFromName(form.fullName)}</div>
              </div>
              <h2 className="profile-name">{form.fullName}</h2>
              <p className="profile-type">{form.farmerType}</p>
              <div className="profile-verification-row">
                <StatusBadge status={currentProfile.verificationStatus}>
                  {formatStatus(currentProfile.verificationStatus)}
                </StatusBadge>
                <StatusBadge status={completeness >= 80 ? "verified" : "pending"}>
                  {completeness}% Complete
                </StatusBadge>
              </div>
            </div>

            <div style={{ marginTop: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                <strong style={{ color: "var(--text-main)" }}>Farm Profile Completeness</strong>
                <span style={{ color: "var(--primary-green)", fontWeight: 700 }}>{completeness}%</span>
              </div>
              <div className="profile-completeness-bar">
                <div className="profile-completeness-fill" style={{ width: `${completeness}%` }} />
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px" }}>
                Complete your contact details, farm records, map location, photo, and crop history.
              </p>
            </div>

            {!isEditing ? (
              <div className="profile-fact-list" style={{ marginTop: "16px" }}>
                {profileFacts.map((fact) => {
                  const Icon = fact.icon;
                  return (
                    <div key={fact.label} className="profile-fact-item">
                      <div className="profile-fact-icon"><Icon size={18} /></div>
                      <div>
                        <span>{fact.label}</span>
                        <strong>{fact.value}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="profile-edit-form" style={{ marginTop: "16px" }}>
                <label>
                  <span>Full Name</span>
                  <input name="fullName" value={form.fullName} onChange={handleChange} />
                </label>
                <label>
                  <span>Email Address</span>
                  <input name="email" type="email" value={form.email} onChange={handleChange} />
                </label>
                <label>
                  <span>Contact Number</span>
                  <input name="contact" value={form.contact} onChange={handleChange} />
                </label>
                <label>
                  <span>Region</span>
                  <input name="region" value={form.region} onChange={handleChange} />
                </label>
                <label>
                  <span>Experience Level</span>
                  <select name="experienceLevel" value={form.experienceLevel} onChange={handleChange}>
                    <option value="">Select experience level</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Cooperative Lead">Cooperative Lead</option>
                  </select>
                </label>
                <label>
                  <span>Farmer Type</span>
                  <select name="farmerType" value={form.farmerType} onChange={handleChange}>
                    <option value="Individual Farmer">Individual Farmer</option>
                    <option value="Cooperative Farmer">Cooperative Farmer</option>
                    <option value="Extension Research Plot">Extension Research Plot</option>
                  </select>
                </label>
                <label>
                  <span>Cooperative / Organization</span>
                  <input name="cooperativeName" value={form.cooperativeName} onChange={handleChange} placeholder="Optional cooperative name" />
                </label>
                <label>
                  <span>Notes</span>
                  <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Farmer background, seasonal goals, and onboarding notes" rows={4} />
                </label>
              </div>
            )}

            <div className="profile-actions" style={{ marginTop: "16px" }}>
              <ActionButton
                variant={isEditing ? "secondary" : "ghost"}
                icon={PencilLine}
                onClick={() => {
                  if (isEditing) { setIsEditing(false); setFeedback(""); return; }
                  setIsEditing(true);
                }}
              >
                {isEditing ? "Cancel Editing" : "Edit Personal Details"}
              </ActionButton>
              {isEditing && (
                <ActionButton variant="primary" icon={ShieldCheck} onClick={handleSave}>
                  Save Updates
                </ActionButton>
              )}
            </div>
          </AppCard>

          <AppCard>
            <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 16px", color: "var(--text-main)" }}>
              Verification & Approval Workflow
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "var(--text-muted)" }}>
                <CalendarDays size={16} style={{ color: "var(--primary-green)", flexShrink: 0 }} />
                <span>Submitted: {new Date(currentProfile.submittedAt).toLocaleDateString()}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "var(--text-muted)" }}>
                <BadgeCheck size={16} style={{ color: "var(--primary-green)", flexShrink: 0 }} />
                <span>
                  {currentProfile.verifiedBy
                    ? `Verified by ${currentProfile.verifiedBy}`
                    : "Awaiting extension officer verification"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "var(--text-muted)" }}>
                <CircleAlert size={16} style={{ color: "var(--warning)", flexShrink: 0 }} />
                <span>Bulk cooperative registration is supported for multi-plot onboarding.</span>
              </div>
            </div>
            <div style={{ marginTop: "16px" }}>
              <ActionButton
                variant="primary"
                className="w-full"
                onClick={handleSubmitForReview}
                disabled={currentProfile.verificationStatus === "verified"}
                icon={ShieldCheck}
              >
                {currentProfile.verificationStatus === "verified"
                  ? "Profile Verified"
                  : "Submit Profile for Approval"}
              </ActionButton>
            </div>
          </AppCard>
        </div>

        <div className="profile-main">
          <div className="profile-metrics-strip">
            {metrics.map((metric) => (
              <MetricCard
                key={metric.label}
                icon={metric.label === "Total Acreage" ? MapPinned : metric.label === "Verified Farms" ? CheckCircle2 : Tractor}
                label={metric.label}
                value={`${metric.value}${metric.unit ? ` ${metric.unit}` : ""}`}
              />
            ))}
          </div>

          <AppCard>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "var(--text-main)" }}>
                  Registered Farms & Historical Records
                </h2>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "4px 0 0" }}>
                  Centralized records per farm including map location, plot size, crop history, and documentation.
                </p>
              </div>
            </div>

            <div className="profile-farm-grid">
              {(currentFarms || []).map((farm) => (
                <div key={farm.id} className="profile-farm-card-modern">
                  <div className="profile-farm-card-media">
                    <img
                      src={getFarmImage(farm)}
                      alt={farm.name}
                      loading="lazy"
                      onError={(e) => { e.target.src = getFarmImage(); }}
                    />
                  </div>
                  <div className="profile-farm-card-body">
                    <h3 className="profile-farm-card-name">{farm.name}</h3>
                    <div className="profile-farm-card-meta">
                      <span><Sprout size={14} /> {farm.sizeHectares} ha</span>
                      <span><Waves size={14} /> {farm.irrigationType}</span>
                    </div>
                    <div style={{ marginTop: "10px" }}>
                      <StatusBadge status={farm.verificationStatus}>
                        {formatStatus(farm.verificationStatus)}
                      </StatusBadge>
                    </div>
                    <div style={{ marginTop: "8px" }}>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 }}>Crop History:</span>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                        {(farm.history || []).map((entry) => (
                          <span key={entry.id} style={{ padding: "2px 8px", borderRadius: "6px", background: "var(--light-green)", color: "var(--primary-green)", fontSize: "11px", fontWeight: 600 }}>
                            {entry.crop} ({entry.season})
                          </span>
                        ))}
                      </div>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px" }}>
                      Latest challenge: {farm.history[0]?.challenges || "No challenge logged yet"}
                    </p>
                  </div>
                  <div className="profile-farm-card-footer">
                    <ActionButton variant="ghost" size="sm" onClick={() => navigate("/analytics")}>
                      Analytics
                    </ActionButton>
                    <ActionButton variant="primary" size="sm" onClick={() => navigate(`/farms/new?edit=${farm.id}`)}>
                      Manage Farm
                    </ActionButton>
                  </div>
                </div>
              ))}
            </div>
          </AppCard>
        </div>
      </div>
    </PageShell>
  );
}
