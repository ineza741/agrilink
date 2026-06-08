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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useFarmerData } from "../../context/FarmerDataContext";

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
    if (!currentProfile) {
      return;
    }

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
    const totalAcreage = currentFarms.reduce((sum, farm) => sum + Number(farm.sizeHectares || 0), 0);
    const verifiedFarms = currentFarms.filter((farm) => farm.verificationStatus === "verified").length;

    return [
      { label: "Total Acreage", value: totalAcreage.toFixed(totalAcreage % 1 === 0 ? 0 : 1), unit: "ha" },
      { label: "Profile Complete", value: `${completeness}%` },
      { label: "Verified Farms", value: `${verifiedFarms}/${currentFarms.length || 0}` },
    ];
  }, [completeness, currentFarms]);

  if (!currentProfile) {
    return null;
  }

  const profileFacts = [
    { label: "Email Address", value: currentProfile.email, icon: Mail },
    { label: "Contact", value: currentProfile.contact, icon: Phone },
    { label: "Experience", value: currentProfile.experienceLevel, icon: ScanLine },
    { label: "Base Region", value: currentProfile.region, icon: MapPin },
  ];

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    await updateProfile(user.id, form);
    setIsEditing(false);
    setFeedback("Profile details updated successfully.");
  };

  const handleSubmitForReview = () => {
    submitProfileForApproval(user.id);
    setFeedback("Profile submitted for verification and approval.");
  };

  return (
    <section className="management-page prototype-profile-page">
      <div className="page-title-block prototype-profile-title">
        <h1>Farmer Profile &amp; Farm Management</h1>
        <p>Academic-grade decision support and asset oversight for modern agriculture.</p>
      </div>

      <div className="profile-prototype-grid">
        <div className="profile-prototype-sidebar">
          <article className="prototype-panel profile-prototype-card">
            <div className="profile-prototype-avatar">
              <div className="profile-prototype-avatar-ring">
                <div className="profile-prototype-avatar-inner">{initialsFromName(form.fullName)}</div>
              </div>
            </div>

            <div className="profile-prototype-heading">
              <h2>{form.fullName}</h2>
              <p>{form.farmerType}</p>
            </div>

            <div className="profile-status-row">
              <span className={`profile-verification-badge ${currentProfile.verificationStatus}`}>
                {formatStatus(currentProfile.verificationStatus)}
              </span>
              <span className="profile-completeness-text">{completeness}% Complete</span>
            </div>

            <div className="profile-completeness-card">
              <div className="profile-completeness-top">
                <strong>Farm Profile Completeness</strong>
                <span>{completeness}%</span>
              </div>
              <div className="profile-completeness-track">
                <div className="profile-completeness-fill" style={{ width: `${completeness}%` }} />
              </div>
              <p>Complete your contact details, farm records, map location, photo, and crop history.</p>
            </div>

            {!isEditing ? (
              <div className="profile-prototype-facts">
                {profileFacts.map((fact) => {
                  const Icon = fact.icon;
                  return (
                    <div key={fact.label} className="profile-prototype-fact">
                      <div className="profile-prototype-fact-icon">
                        <Icon size={18} />
                      </div>
                      <div>
                        <span>{fact.label}</span>
                        <strong>{fact.value}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="profile-edit-grid">
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
                <label className="wide">
                  <span>Cooperative / Organization</span>
                  <input
                    name="cooperativeName"
                    value={form.cooperativeName}
                    onChange={handleChange}
                    placeholder="Optional cooperative name"
                  />
                </label>
                <label className="wide">
                  <span>Notes</span>
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    placeholder="Farmer background, seasonal goals, and onboarding notes"
                    rows={4}
                  />
                </label>
              </div>
            )}

            <div className="profile-edit-actions">
              <button
                type="button"
                className="profile-prototype-button secondary"
                onClick={() => {
                  if (isEditing) {
                    setIsEditing(false);
                    setFeedback("");
                    return;
                  }

                  setIsEditing(true);
                }}
              >
                <PencilLine size={15} />
                <span>{isEditing ? "Cancel Editing" : "Edit Personal Details"}</span>
              </button>
              {isEditing ? (
                <button type="button" className="profile-prototype-button primary" onClick={handleSave}>
                  <ShieldCheck size={15} />
                  <span>Save Updates</span>
                </button>
              ) : null}
            </div>
          </article>

          <article className="prototype-panel profile-certification-card">
            <h3>Verification &amp; Approval Workflow</h3>
            <div className="profile-certification-list workflow-list">
              <div className="profile-certification-item">
                <CalendarDays size={18} />
                <span>Submitted: {new Date(currentProfile.submittedAt).toLocaleDateString()}</span>
              </div>
              <div className="profile-certification-item">
                <BadgeCheck size={18} />
                <span>
                  {currentProfile.verifiedBy
                    ? `Verified by ${currentProfile.verifiedBy}`
                    : "Awaiting extension officer verification"}
                </span>
              </div>
              <div className="profile-certification-item">
                <CircleAlert size={18} />
                <span>Bulk cooperative registration is supported for multi-plot onboarding.</span>
              </div>
            </div>
            <button
              type="button"
              className="profile-prototype-button primary full-width"
              onClick={handleSubmitForReview}
              disabled={currentProfile.verificationStatus === "verified"}
            >
              <ShieldCheck size={16} />
              <span>
                {currentProfile.verificationStatus === "verified"
                  ? "Profile Verified"
                  : "Submit Profile for Approval"}
              </span>
            </button>
          </article>
        </div>

        <div className="profile-prototype-main">
          <div className="profile-prototype-section-head">
            <div>
              <h2>Registered Farms &amp; Historical Records</h2>
              <p className="profile-section-copy">
                Centralized records per farm including map location, plot size, crop history, and documentation.
              </p>
            </div>
            <button
              type="button"
              className="profile-prototype-button primary"
              onClick={() => navigate("/farms/new")}
            >
              <PlusCircle size={16} />
              <span>Add New Farm</span>
            </button>
          </div>

          {feedback ? <p className="profile-feedback-banner">{feedback}</p> : null}

          <div className="profile-farm-list">
            {currentFarms.map((farm) => (
              <article key={farm.id} className="prototype-panel profile-farm-card">
                <div className="profile-farm-map">
                  <div className="profile-farm-map-grid" />
                  <div className="profile-farm-map-road road-a" />
                  <div className="profile-farm-map-road road-b" />
                  <div className="profile-farm-map-road road-c" />
                  <div
                    className="profile-farm-pin dynamic-pin"
                    style={{
                      left: `${farm.location.mapX}%`,
                      top: `${farm.location.mapY}%`,
                    }}
                  />
                  <div className="profile-farm-coordinates">
                    {farm.location.lat.toFixed(2)}° , {farm.location.lng.toFixed(2)}°
                  </div>
                </div>

                <div className="profile-farm-content">
                  <div className="profile-farm-top">
                    <div>
                      <h3>{farm.name}</h3>
                      <div className="profile-farm-meta">
                        <span>
                          <Sprout size={14} />
                          {farm.sizeHectares} Hectares
                        </span>
                        <span>
                          <Waves size={14} />
                          {farm.irrigationType}
                        </span>
                      </div>
                    </div>
                    <span className={`profile-farm-status ${farm.verificationStatus}`}>
                      {formatStatus(farm.verificationStatus)}
                    </span>
                  </div>

                  <div className="profile-farm-history">
                    <span>Crop History Log</span>
                    <div className="profile-history-tags">
                      {farm.history.map((entry) => (
                        <span key={entry.id} className="profile-history-tag">
                          {entry.crop} ({entry.season})
                        </span>
                      ))}
                    </div>
                    <p className="profile-farm-challenges">
                      Latest challenge: {farm.history[0]?.challenges || "No challenge logged yet"}
                    </p>
                  </div>

                  <div className="profile-farm-actions">
                    <button type="button" className="profile-farm-link muted" onClick={() => navigate("/analytics")}>
                      Analytics
                    </button>
                    <button
                      type="button"
                      className="profile-farm-link primary"
                      onClick={() => navigate(`/farms/new?edit=${farm.id}`)}
                    >
                      Manage Farm
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="profile-metric-grid">
            {metrics.map((metric) => (
              <article key={metric.label} className="profile-metric-card">
                <span>{metric.label}</span>
                <strong>
                  {metric.value}
                  {metric.unit ? <small>{metric.unit}</small> : null}
                </strong>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
