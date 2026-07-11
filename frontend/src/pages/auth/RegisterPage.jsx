import { ArrowRight, CloudSun, Cpu, Database, Leaf, Lock, Mail, Map, MapPin, Phone, ScanLine, ShieldCheck, Sparkles, Tractor, TrendingUp, User, Building2, Hash, FileText } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";

const farmerInitialForm = {
  name: "",
  email: "",
  contact: "",
  region: "",
  experienceLevel: "",
  password: "",
  confirmPassword: "",
};

const marketOfficerInitialForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  marketName: "",
  district: "",
  sector: "",
  organization: "",
  employeeNumber: "",
  notes: "",
};

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();
  const isMarketOfficerMode = searchParams.get("role") === "market-officer";
  const [activeTab, setActiveTab] = useState(isMarketOfficerMode ? "marketOfficer" : "farmer");
  const [farmerForm, setFarmerForm] = useState(farmerInitialForm);
  const [moForm, setMoForm] = useState(marketOfficerInitialForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleFarmerChange = (event) => {
    setFarmerForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleMoChange = (event) => {
    setMoForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleFarmerSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (farmerForm.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (farmerForm.password !== farmerForm.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        name: farmerForm.name,
        email: farmerForm.email,
        contact: farmerForm.contact,
        region: farmerForm.region,
        experienceLevel: farmerForm.experienceLevel,
        role: "farmer",
        password: farmerForm.password,
      });
      navigate("/dashboard", { replace: true });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (moForm.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (moForm.password !== moForm.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await register({
        ...moForm,
        role: "MarketOfficer",
      });

      if (result?.pendingApproval) {
        setSuccessMessage(result.message || "Registration submitted successfully. Your Market Officer account is waiting for administrator approval.");
        toast.success("Registration submitted", {
          description: "Your Market Officer account is awaiting administrator approval.",
        });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="login-prototype-shell">
      <div className="auth-pane">
        <div className="auth-floating-card" />
        <div className="auth-floating-card" />
        <div className="auth-top">
          <div className="auth-brand">
            <Leaf size={20} />
            <span>AgriAI Support</span>
          </div>
        </div>

        <div className="auth-content">
          <h1>{activeTab === "marketOfficer" ? "Market Officer Registration" : "Create Farmer Account"}</h1>
          <p>{activeTab === "marketOfficer"
            ? "Register as a Market Officer to manage crop prices and market intelligence across the platform."
            : "Register your farmer profile to start managing farms, crop history, AI recommendations, alerts, and seasonal monitoring."
          }</p>

          <div className="auth-chips">
            <span className="auth-chip"><Cpu size={14} /> AI Recommendations</span>
            <span className="auth-chip"><CloudSun size={14} /> Weather &amp; Soil Insights</span>
            <span className="auth-chip"><TrendingUp size={14} /> Market Intelligence</span>
          </div>

          <div className="auth-stats">
            <span className="auth-stat"><Database size={14} /> 12+ Smart Modules</span>
            <span className="auth-stat"><ShieldCheck size={14} /> Offline Ready</span>
            <span className="auth-stat"><Map size={14} /> Multi-Farm Support</span>
          </div>
        </div>

        <div className="auth-bottom">
          <span>&copy; 2024 Agricultural Research Division</span>
          <div>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
          </div>
        </div>
      </div>

      <div className="login-form-pane">
        <div className="login-card">
          <div className="login-card-header">
            <h2>{activeTab === "marketOfficer" ? "Market Officer Registration" : "Register"}</h2>
            <p>{activeTab === "marketOfficer"
              ? "Market Officer registration requires administrator approval before access is granted."
              : "Farmer registration is available through the public onboarding flow."
            }</p>
          </div>

          <div className="role-switcher-block" style={{ marginBottom: "1rem" }}>
            <div className="role-switcher">
              <button
                type="button"
                className={activeTab === "farmer" ? "role-option active" : "role-option"}
                onClick={() => { setActiveTab("farmer"); setError(""); setSuccessMessage(""); }}
              >
                Farmer
              </button>
              <button
                type="button"
                className={activeTab === "marketOfficer" ? "role-option active" : "role-option"}
                onClick={() => { setActiveTab("marketOfficer"); setError(""); setSuccessMessage(""); }}
              >
                Market Officer
              </button>
            </div>
          </div>

          {successMessage ? (
            <div style={{ padding: "1rem", background: "#ecfdf5", borderRadius: "8px", border: "1px solid #a7f3d0", marginBottom: "1rem" }}>
              <p style={{ color: "#065f46", fontWeight: 600, margin: 0 }}>{successMessage}</p>
              <Link to="/login" style={{ color: "#065f46", textDecoration: "underline", display: "inline-block", marginTop: "0.5rem" }}>
                Go to Login
              </Link>
            </div>
          ) : activeTab === "farmer" ? (
            <form className="prototype-form" onSubmit={handleFarmerSubmit}>
              <label className="prototype-field">
                <span className="field-label">Full Name</span>
                <div className="input-shell">
                  <User size={15} />
                  <input name="name" type="text" placeholder="Enter your full name" value={farmerForm.name} onChange={handleFarmerChange} required />
                </div>
              </label>

              <label className="prototype-field">
                <span className="field-label">Email Address</span>
                <div className="input-shell">
                  <Mail size={15} />
                  <input name="email" type="email" placeholder="farmer@example.com" value={farmerForm.email} onChange={handleFarmerChange} required />
                </div>
              </label>

              <label className="prototype-field">
                <span className="field-label">Contact Number</span>
                <div className="input-shell">
                  <Phone size={15} />
                  <input name="contact" type="tel" placeholder="+250 788 000 000" value={farmerForm.contact} onChange={handleFarmerChange} required />
                </div>
              </label>

              <label className="prototype-field">
                <span className="field-label">Region</span>
                <div className="input-shell">
                  <MapPin size={15} />
                  <input name="region" type="text" placeholder="Enter your district or sector" value={farmerForm.region} onChange={handleFarmerChange} required />
                </div>
              </label>

              <label className="prototype-field">
                <span className="field-label">Experience Level</span>
                <div className="input-shell">
                  <ScanLine size={15} />
                  <select name="experienceLevel" value={farmerForm.experienceLevel} onChange={handleFarmerChange} required>
                    <option value="">Select your experience level</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Cooperative Lead">Cooperative Lead</option>
                  </select>
                </div>
              </label>

              <label className="prototype-field">
                <span className="field-label">Password</span>
                <div className="input-shell">
                  <Lock size={15} />
                  <input name="password" type="password" placeholder="Create password" value={farmerForm.password} onChange={handleFarmerChange} required />
                </div>
              </label>

              <label className="prototype-field">
                <span className="field-label">Confirm Password</span>
                <div className="input-shell">
                  <Lock size={15} />
                  <input name="confirmPassword" type="password" placeholder="Repeat password" value={farmerForm.confirmPassword} onChange={handleFarmerChange} required />
                </div>
              </label>

              {error ? <p className="form-error">{error}</p> : null}

              <button type="submit" className="prototype-submit" disabled={isSubmitting}>
                <span>{isSubmitting ? "Creating Account..." : "Create Farmer Account"}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <form className="prototype-form" onSubmit={handleMoSubmit}>
              <label className="prototype-field">
                <span className="field-label">Full Name</span>
                <div className="input-shell">
                  <User size={15} />
                  <input name="fullName" type="text" placeholder="Enter your full name" value={moForm.fullName} onChange={handleMoChange} required />
                </div>
              </label>

              <label className="prototype-field">
                <span className="field-label">Email Address</span>
                <div className="input-shell">
                  <Mail size={15} />
                  <input name="email" type="email" placeholder="officer@example.com" value={moForm.email} onChange={handleMoChange} required />
                </div>
              </label>

              <label className="prototype-field">
                <span className="field-label">Phone Number</span>
                <div className="input-shell">
                  <Phone size={15} />
                  <input name="phone" type="tel" placeholder="+250 788 000 000" value={moForm.phone} onChange={handleMoChange} required />
                </div>
              </label>

              <label className="prototype-field">
                <span className="field-label">Market Name</span>
                <div className="input-shell">
                  <Building2 size={15} />
                  <input name="marketName" type="text" placeholder="e.g. Kicukiro New Modern Market" value={moForm.marketName} onChange={handleMoChange} required />
                </div>
              </label>

              <label className="prototype-field">
                <span className="field-label">District</span>
                <div className="input-shell">
                  <MapPin size={15} />
                  <input name="district" type="text" placeholder="e.g. Kicukiro District" value={moForm.district} onChange={handleMoChange} required />
                </div>
              </label>

              <label className="prototype-field">
                <span className="field-label">Sector</span>
                <div className="input-shell">
                  <Map size={15} />
                  <input name="sector" type="text" placeholder="e.g. Gatenga Sector" value={moForm.sector} onChange={handleMoChange} required />
                </div>
              </label>

              <label className="prototype-field">
                <span className="field-label">Organization (Optional)</span>
                <div className="input-shell">
                  <Building2 size={15} />
                  <input name="organization" type="text" placeholder="e.g. Rwanda Agriculture Board" value={moForm.organization} onChange={handleMoChange} />
                </div>
              </label>

              <label className="prototype-field">
                <span className="field-label">Employee Number (Optional)</span>
                <div className="input-shell">
                  <Hash size={15} />
                  <input name="employeeNumber" type="text" placeholder="e.g. MO-2026-001" value={moForm.employeeNumber} onChange={handleMoChange} />
                </div>
              </label>

              <label className="prototype-field">
                <span className="field-label">Notes (Optional)</span>
                <div className="input-shell">
                  <FileText size={15} />
                  <input name="notes" type="text" placeholder="Any additional information" value={moForm.notes} onChange={handleMoChange} />
                </div>
              </label>

              <label className="prototype-field">
                <span className="field-label">Password</span>
                <div className="input-shell">
                  <Lock size={15} />
                  <input name="password" type="password" placeholder="Create password" value={moForm.password} onChange={handleMoChange} required />
                </div>
              </label>

              <label className="prototype-field">
                <span className="field-label">Confirm Password</span>
                <div className="input-shell">
                  <Lock size={15} />
                  <input name="confirmPassword" type="password" placeholder="Repeat password" value={moForm.confirmPassword} onChange={handleMoChange} required />
                </div>
              </label>

              {error ? <p className="form-error">{error}</p> : null}

              <button type="submit" className="prototype-submit" disabled={isSubmitting}>
                <span>{isSubmitting ? "Submitting..." : "Submit Registration"}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          <p className="register-note">
            Already registered? <Link to="/login">Back to Login</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
