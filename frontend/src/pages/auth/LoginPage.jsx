import { CircleHelp, Lock, Mail, Tractor, ArrowRight, Eye } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";

const initialForm = {
  email: "",
  password: "",
  role: "farmer",
  remember: false,
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = location.state?.from?.pathname || "/dashboard";

  const demoCredentials = useMemo(
    () => ({
      farmer: { email: "farmer@agrisupport.rw", password: "Farmer@123" },
      admin: { email: "admin@agrisupport.rw", password: "Admin@123" },
    }),
    []
  );

  const handleRoleChange = (role) => {
    setForm((current) => ({
      ...current,
      role,
      email: demoCredentials[role].email,
      password: demoCredentials[role].password,
    }));
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const user = await login({
        email: form.email,
        password: form.password,
      });

      if (form.role === "admin" && !["admin", "extensionofficer"].includes(user.role)) {
        throw new Error("Use the administrator or extension officer account for this role.");
      }

      if (form.role === "farmer" && user.role !== "farmer") {
        throw new Error("Use the farmer demo account for this role.");
      }

      navigate(from, { replace: true });
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
          <h1>AI-Assisted Farmer Decision Support System</h1>
          <p>
            Empowering sustainable agriculture through data-driven insights and rigorous
            academic research.
          </p>
        </div>

        <div className="login-visual-footer">
          <span>© 2024 Agricultural Research Division</span>
          <div>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
          </div>
        </div>
      </div>

      <div className="login-form-pane">
        <div className="login-card">
          <div className="login-card-header">
            <h2>Welcome Back</h2>
            <p>Please enter your credentials to access the research portal.</p>
          </div>

          <form className="prototype-form" onSubmit={handleSubmit}>
            <div className="role-switcher-block">
              <span className="field-label">Select Your Role</span>
              <div className="role-switcher">
                <button
                  type="button"
                  className={form.role === "farmer" ? "role-option active" : "role-option"}
                  onClick={() => handleRoleChange("farmer")}
                >
                  Farmer
                </button>
                <button
                  type="button"
                  className={form.role === "admin" ? "role-option active" : "role-option"}
                  onClick={() => handleRoleChange("admin")}
                >
                  Admin / Extension Officer
                </button>
              </div>
            </div>

            <label className="prototype-field">
              <span className="field-label">Email Address</span>
              <div className="input-shell">
                <Mail size={15} />
                <input
                  name="email"
                  type="email"
                  placeholder="researcher@university.edu"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </label>

            <div className="password-row">
              <span className="field-label">Password</span>
              <button type="button" className="text-link-button">
                Forgot password?
              </button>
            </div>

            <label className="prototype-field">
              <div className="input-shell">
                <Lock size={15} />
                <input
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
                <Eye size={15} />
              </div>
            </label>

            <label className="checkbox-row">
              <input
                name="remember"
                type="checkbox"
                checked={form.remember}
                onChange={handleChange}
              />
              <span>Keep me logged in</span>
            </label>

            {error ? <p className="form-error">{error}</p> : null}

            <button type="submit" className="prototype-submit" disabled={isSubmitting}>
              <span>{isSubmitting ? "Signing In..." : "Sign In to Portal"}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <p className="register-note">
            New to the research platform? <Link to="/register">Register (Farmer Only)</Link>
          </p>

          <div className="info-note">
            <CircleHelp size={16} />
            <p>
              Access to the Administrative panel is restricted to verified Extension Officers
              and Institutional Administrators. For credential requests, contact the system
              coordinator.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
