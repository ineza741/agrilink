import { ArrowRight, Lock, Mail, MapPin, Phone, ScanLine, Tractor, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

const initialForm = {
  name: "",
  email: "",
  contact: "",
  region: "",
  experienceLevel: "",
  password: "",
  confirmPassword: "",
};

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        name: form.name,
        email: form.email,
        contact: form.contact,
        region: form.region,
        experienceLevel: form.experienceLevel,
        role: "farmer",
        password: form.password,
      });
      navigate("/dashboard", { replace: true });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="login-prototype-shell">
      <div className="login-visual-pane">
        <div className="login-visual-overlay" />
        <div className="login-visual-top">
          <div className="login-brand">
            <Tractor size={19} />
            <span>AgriAI Support</span>
          </div>
        </div>

        <div className="login-visual-copy">
          <h1>Create Farmer Account</h1>
          <p>
            Register your farmer profile to start capturing farm records, recommendations,
            and seasonal monitoring data.
          </p>
        </div>
      </div>

      <div className="login-form-pane">
        <div className="login-card">
          <div className="login-card-header">
            <h2>Register</h2>
            <p>Farmer registration is available through the public onboarding flow.</p>
          </div>

          <form className="prototype-form" onSubmit={handleSubmit}>
            <label className="prototype-field">
              <span className="field-label">Full Name</span>
              <div className="input-shell">
                <User size={15} />
                <input
                  name="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
            </label>

            <label className="prototype-field">
              <span className="field-label">Email Address</span>
              <div className="input-shell">
                <Mail size={15} />
                <input
                  name="email"
                  type="email"
                  placeholder="farmer@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </label>

            <label className="prototype-field">
              <span className="field-label">Contact Number</span>
              <div className="input-shell">
                <Phone size={15} />
                <input
                  name="contact"
                  type="tel"
                  placeholder="+250 788 000 000"
                  value={form.contact}
                  onChange={handleChange}
                  required
                />
              </div>
            </label>

            <label className="prototype-field">
              <span className="field-label">Region</span>
              <div className="input-shell">
                <MapPin size={15} />
                <input
                  name="region"
                  type="text"
                  placeholder="Enter your district or sector"
                  value={form.region}
                  onChange={handleChange}
                  required
                />
              </div>
            </label>

            <label className="prototype-field">
              <span className="field-label">Experience Level</span>
              <div className="input-shell">
                <ScanLine size={15} />
                <select
                  name="experienceLevel"
                  value={form.experienceLevel}
                  onChange={handleChange}
                  required
                >
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
                <input
                  name="password"
                  type="password"
                  placeholder="Create password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </label>

            <label className="prototype-field">
              <span className="field-label">Confirm Password</span>
              <div className="input-shell">
                <Lock size={15} />
                <input
                  name="confirmPassword"
                  type="password"
                  placeholder="Repeat password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </label>

            {error ? <p className="form-error">{error}</p> : null}

            <button type="submit" className="prototype-submit" disabled={isSubmitting}>
              <span>{isSubmitting ? "Creating Account..." : "Create Farmer Account"}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <p className="register-note">
            Already registered? <Link to="/login">Back to Login</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
