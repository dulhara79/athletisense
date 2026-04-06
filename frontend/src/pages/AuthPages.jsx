// src/pages/AuthPages.jsx
// ─────────────────────────────────────────────────────────────
// Consolidates LoginPage + SignupPage into one file.
// ─────────────────────────────────────────────────────────────
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Activity,
  Lock,
  Mail,
  Eye,
  EyeOff,
  User,
  ShieldCheck,
  UserPlus,
  Search,
} from "lucide-react";

// ── Shared background decoration ─────────────────────────────
function AuthBackground() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.4,
          backgroundImage:
            "linear-gradient(rgba(79,70,229,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(79,70,229,0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "25%",
          left: "25%",
          width: 384,
          height: 384,
          borderRadius: "50%",
          background: "rgba(99,102,241,0.06)",
          filter: "blur(100px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "25%",
          right: "25%",
          width: 384,
          height: 384,
          borderRadius: "50%",
          background: "rgba(124,58,237,0.06)",
          filter: "blur(100px)",
          pointerEvents: "none",
        }}
      />
    </>
  );
}

function AuthLogo() {
  return (
    <div style={{ textAlign: "center", marginBottom: 32 }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 20px rgba(79,70,229,0.35)",
          }}
        >
          <Activity size={26} color="#fff" />
        </div>
        <div style={{ textAlign: "left" }}>
          <h1
            style={{
              fontFamily: "'Bebas Neue','Syne',sans-serif",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "0.1em",
              color: "#1a1917",
              lineHeight: 1,
            }}
          >
            ATHLETISENSE
          </h1>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#6b6a66",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginTop: 2,
            }}
          >
            IoT Performance Platform
          </p>
        </div>
      </div>
    </div>
  );
}

const inputStyle = (focused = false) => ({
  width: "100%",
  padding: "11px 12px 11px 42px",
  borderRadius: 12,
  border: `1px solid ${focused ? "#4f46e5" : "#e4e2dd"}`,
  background: "#f5f4f1",
  fontSize: 13,
  fontWeight: 500,
  color: "#1a1917",
  outline: "none",
  boxSizing: "border-box",
  boxShadow: focused ? "0 0 0 3px rgba(79,70,229,0.12)" : "none",
  transition: "all 0.15s",
});

const cardStyle = {
  background: "rgba(255,255,255,0.9)",
  backdropFilter: "blur(12px)",
  border: "1px solid #e4e2dd",
  borderRadius: 20,
  padding: "2rem",
  boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
};

// ── LoginPage ─────────────────────────────────────────────────
export function LoginPage({ onToggle }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await login(email, password);
    if (!res.success) setError(res.error);
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f4f1",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
      }}
    >
      <AuthBackground />
      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: 420,
        }}
      >
        <AuthLogo />
        <div style={cardStyle}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#1a1917",
              marginBottom: 4,
            }}
          >
            Sign in
          </h2>
          <p style={{ fontSize: 13, color: "#6b6a66", marginBottom: 24 }}>
            Access your performance dashboard
          </p>

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <div>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#6b6a66",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Email
              </label>
              <div style={{ position: "relative" }}>
                <Mail
                  size={16}
                  color="#9e9c97"
                  style={{
                    position: "absolute",
                    left: 13,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  style={inputStyle()}
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#6b6a66",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock
                  size={16}
                  color="#9e9c97"
                  style={{
                    position: "absolute",
                    left: 13,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ ...inputStyle(), paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#9e9c97",
                  }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                style={{
                  background: "rgba(225,29,72,0.08)",
                  border: "1px solid rgba(225,29,72,0.2)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "#e11d48",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: 12,
                background: "#4f46e5",
                border: "none",
                color: "#fff",
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: "0.06em",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 4px 14px rgba(79,70,229,0.35)",
                marginTop: 4,
                transition: "all 0.15s",
              }}
            >
              {loading ? (
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff",
                    animation: "spin 0.7s linear infinite",
                  }}
                />
              ) : (
                "SIGN IN"
              )}
            </button>

            <button
              type="button"
              onClick={onToggle}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                color: "#6b6a66",
                padding: 0,
              }}
            >
              Don't have an account?{" "}
              <span style={{ color: "#4f46e5", fontWeight: 700 }}>Sign Up</span>
            </button>
          </form>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── SignupPage ────────────────────────────────────────────────
const ACCOUNT_TYPES = [
  {
    role: "athlete",
    label: "Athlete",
    icon: UserPlus,
    desc: "Track your performance",
  },
  {
    role: "coach",
    label: "Coach",
    icon: ShieldCheck,
    desc: "Monitor your team",
  },
  {
    role: "therapist",
    label: "Therapist",
    icon: User,
    desc: "Manage recovery plans",
  },
];

export function SignupPage({ onToggle }) {
  const { signup, checkUsernameAvailable } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("athlete");
  const [username, setUsername] = useState("");
  const [age, setAge] = useState("");
  const [sport, setSport] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [athleteType, setAthleteType] = useState("independent");
  const [coachUname, setCoachUname] = useState("");
  const [unameStatus, setUnameStatus] = useState(""); // '' | 'checking' | 'available' | 'taken'
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  const handleUsernameChange = async (val) => {
    setUsername(val);
    setUnameStatus("");
    if (!val.trim() || val.length < 3) return;
    setUnameStatus("checking");
    const avail = await checkUsernameAvailable(val.trim());
    setUnameStatus(avail ? "available" : "taken");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }
    if (!username.trim() || username.length < 3) {
      setError("Username must be at least 3 characters");
      setLoading(false);
      return;
    }
    if (unameStatus === "taken") {
      setError("Username already taken");
      setLoading(false);
      return;
    }
    if (
      role === "athlete" &&
      athleteType === "has_coach" &&
      !coachUname.trim()
    ) {
      setError("Enter your coach's username");
      setLoading(false);
      return;
    }

    const isAthlete = role === "athlete";
    const meta = {
      name,
      username: username.trim(),
      role: isAthlete ? "athlete" : "admin",
      title:
        role === "coach"
          ? "Coach"
          : role === "therapist"
            ? "Therapist"
            : "Athlete",
      athleteId: isAthlete ? username.trim() : null,
      age: parseInt(age, 10) || null,
      sport: isAthlete ? sport : null,
      coachUsername:
        isAthlete && athleteType === "has_coach" ? coachUname.trim() : null,
    };

    const res = await signup(email, password, meta);
    if (!res.success) setError(res.error);
    setLoading(false);
  };

  const selected =
    ACCOUNT_TYPES.find((t) => t.role === role) || ACCOUNT_TYPES[0];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f4f1",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
      }}
    >
      <AuthBackground />
      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: 460,
        }}
      >
        <AuthLogo />
        <div style={{ ...cardStyle, maxHeight: "80vh", overflowY: "auto" }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#1a1917",
              marginBottom: 4,
            }}
          >
            Create account
          </h2>
          <p style={{ fontSize: 13, color: "#6b6a66", marginBottom: 24 }}>
            Join the AthletiSense platform
          </p>

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            {/* Account type selector */}
            <div style={{ position: "relative" }}>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#6b6a66",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Account Type
              </label>
              <button
                type="button"
                onClick={() => setShowTypeMenu((v) => !v)}
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: 12,
                  border: "1px solid #e4e2dd",
                  background: "#f5f4f1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#1a1917",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <selected.icon size={15} color="#4f46e5" />
                  {selected.label}
                </div>
                <Search
                  size={14}
                  color="#9e9c97"
                  style={{
                    transform: showTypeMenu ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s",
                  }}
                />
              </button>
              {showTypeMenu && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    right: 0,
                    background: "#fff",
                    border: "1px solid #e4e2dd",
                    borderRadius: 12,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
                    zIndex: 50,
                    overflow: "hidden",
                  }}
                >
                  {ACCOUNT_TYPES.map(({ role: r, label, icon: Icon, desc }) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setRole(r);
                        setShowTypeMenu(false);
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        background:
                          role === r ? "rgba(79,70,229,0.06)" : "transparent",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <Icon
                        size={15}
                        color={role === r ? "#4f46e5" : "#9e9c97"}
                      />
                      <div>
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#1a1917",
                          }}
                        >
                          {label}
                        </p>
                        <p style={{ fontSize: 11, color: "#6b6a66" }}>{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Name */}
            <div>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#6b6a66",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Full Name
              </label>
              <div style={{ position: "relative" }}>
                <User
                  size={16}
                  color="#9e9c97"
                  style={{
                    position: "absolute",
                    left: 13,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                  style={inputStyle()}
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#6b6a66",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Username
              </label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 13,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 13,
                    color: "#9e9c97",
                    fontWeight: 700,
                  }}
                >
                  @
                </span>
                <input
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="uniqueusername"
                  required
                  style={{ ...inputStyle(), paddingLeft: 32 }}
                />
              </div>
              {unameStatus === "checking" && (
                <p style={{ fontSize: 11, color: "#6b6a66", marginTop: 4 }}>
                  Checking...
                </p>
              )}
              {unameStatus === "available" && (
                <p style={{ fontSize: 11, color: "#059669", marginTop: 4 }}>
                  ✓ Available
                </p>
              )}
              {unameStatus === "taken" && (
                <p style={{ fontSize: 11, color: "#e11d48", marginTop: 4 }}>
                  ✗ Already taken
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#6b6a66",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Email
              </label>
              <div style={{ position: "relative" }}>
                <Mail
                  size={16}
                  color="#9e9c97"
                  style={{
                    position: "absolute",
                    left: 13,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  style={inputStyle()}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#6b6a66",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock
                  size={16}
                  color="#9e9c97"
                  style={{
                    position: "absolute",
                    left: 13,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  required
                  style={{ ...inputStyle(), paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#9e9c97",
                  }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Athlete-specific fields */}
            {role === "athlete" && (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "#6b6a66",
                        display: "block",
                        marginBottom: 6,
                      }}
                    >
                      Age
                    </label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="25"
                      min="10"
                      max="100"
                      style={{ ...inputStyle(), paddingLeft: 12 }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "#6b6a66",
                        display: "block",
                        marginBottom: 6,
                      }}
                    >
                      Sport
                    </label>
                    <input
                      value={sport}
                      onChange={(e) => setSport(e.target.value)}
                      placeholder="Running"
                      style={{ ...inputStyle(), paddingLeft: 12 }}
                    />
                  </div>
                </div>

                {/* Training type */}
                <div>
                  <label
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "#6b6a66",
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    Training Setup
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["independent", "has_coach"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAthleteType(t)}
                        style={{
                          flex: 1,
                          padding: "9px 10px",
                          borderRadius: 10,
                          background:
                            athleteType === t
                              ? "rgba(79,70,229,0.08)"
                              : "#f5f4f1",
                          border: `1px solid ${athleteType === t ? "rgba(79,70,229,0.25)" : "#e4e2dd"}`,
                          fontSize: 12,
                          fontWeight: 700,
                          color: athleteType === t ? "#4f46e5" : "#6b6a66",
                          cursor: "pointer",
                        }}
                      >
                        {t === "independent"
                          ? "🏃 Independent"
                          : "🤝 Has Coach"}
                      </button>
                    ))}
                  </div>
                </div>

                {athleteType === "has_coach" && (
                  <div>
                    <label
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "#6b6a66",
                        display: "block",
                        marginBottom: 6,
                      }}
                    >
                      Coach Username
                    </label>
                    <div style={{ position: "relative" }}>
                      <span
                        style={{
                          position: "absolute",
                          left: 13,
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontSize: 13,
                          color: "#9e9c97",
                          fontWeight: 700,
                        }}
                      >
                        @
                      </span>
                      <input
                        value={coachUname}
                        onChange={(e) => setCoachUname(e.target.value)}
                        placeholder="coachusername"
                        style={{ ...inputStyle(), paddingLeft: 32 }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {error && (
              <div
                style={{
                  background: "rgba(225,29,72,0.08)",
                  border: "1px solid rgba(225,29,72,0.2)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "#e11d48",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: 13,
                borderRadius: 12,
                background: "#4f46e5",
                border: "none",
                color: "#fff",
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: "0.06em",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 4px 14px rgba(79,70,229,0.35)",
                marginTop: 4,
              }}
            >
              {loading ? (
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff",
                    animation: "spin 0.7s linear infinite",
                  }}
                />
              ) : (
                "CREATE ACCOUNT"
              )}
            </button>

            <button
              type="button"
              onClick={onToggle}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                color: "#6b6a66",
                padding: 0,
              }}
            >
              Already have an account?{" "}
              <span style={{ color: "#4f46e5", fontWeight: 700 }}>Sign In</span>
            </button>
          </form>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
